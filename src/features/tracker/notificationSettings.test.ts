import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { PersonalNotification } from '../../types/domain'

const mock = vi.hoisted(() => ({ rpc: vi.fn(), from: vi.fn() }))
vi.mock('../../lib/supabase', () => ({ supabase: mock }))
vi.mock('./trackerService', () => ({ getPersonalNotifications: vi.fn() }))
import { getPersonalNotifications } from './trackerService'
import { assembleNotificationFeed, getConfiguredNotificationFeed, notificationKinds, saveNotificationPolicies, validateNotificationPolicies, type NotificationPolicy } from './notificationSettingsService'
import { parseRouteHash, routeHash } from '../../lib/routes'

const policies = (): NotificationPolicy[] => notificationKinds.map((kind) => ({ kind, enabled: true, recipients: kind === 'proposal_submitted' ? ['project_managers'] : ['participants'], days: kind === 'due_soon' ? 3 : kind === 'overdue' ? 1 : null, version: 1 }))
const entry = (id: string, workId = 'work', kind: PersonalNotification['kind'] = 'assigned'): PersonalNotification => ({ id, work_item_id: workId, kind, work_item_name: 'Demo', work_item_wbs: '1', project_id: 'project', project_code: 'DEMO', project_name: 'Demo project', actor_name: 'Demo', content: 'Demo', created_at: `2026-09-14T08:00:${id.padStart(2, '0')}Z`, isUnread: true })

describe('notification configuration and feed', () => {
  beforeEach(() => { vi.resetAllMocks() })
  it('accepts complete configuration, including a disabled type without recipients', () => {
    const rows = policies(); rows[0] = { ...rows[0], enabled: false, recipients: [] }
    expect(() => validateNotificationPolicies(rows)).not.toThrow()
  })
  it.each([0, 31, 1.5, null])('rejects invalid deadline day %s', (days) => {
    const rows = policies(); rows[5].days = days
    expect(() => validateNotificationPolicies(rows)).toThrow('1 đến 30')
  })
  it.each([1, 30])('accepts the calendar-day boundary %s', (days) => {
    const rows = policies(); rows[5].days = days
    expect(() => validateNotificationPolicies(rows)).not.toThrow()
  })
  it('rejects missing/duplicated kinds and invalid groups', () => {
    expect(() => validateNotificationPolicies(policies().slice(1))).toThrow('mười')
    const rows = policies(); rows[1].kind = 'assigned'
    expect(() => validateNotificationPolicies(rows)).toThrow('trùng')
    const bad = policies(); bad[1].recipients = ['unexpected' as never]
    expect(() => validateNotificationPolicies(bad)).toThrow('Nhóm nhận')
  })
  it('requires recipients for enabled kinds and restricts assignment to its recipient', () => {
    const rows = policies(); rows[0].recipients = []
    expect(() => validateNotificationPolicies(rows)).toThrow('ít nhất')
    rows[0].recipients = ['system_managers']
    expect(() => validateNotificationPolicies(rows)).toThrow('người được giao')
  })
  it('rejects stale/invalid version, duplicate groups and days on ordinary events', () => {
    const rows = policies(); rows[1].version = 0
    expect(() => validateNotificationPolicies(rows)).toThrow('không hợp lệ')
    rows[1].version = 1; rows[1].recipients = ['participants', 'participants']
    expect(() => validateNotificationPolicies(rows)).toThrow('Nhóm nhận')
    rows[1].recipients = ['participants']; rows[1].days = 3
    expect(() => validateNotificationPolicies(rows)).toThrow('Chỉ thông báo nhắc hạn')
  })
  it('filters disabled or outside-scope events BEFORE limiting updates to 20', () => {
    const updates = [...Array.from({ length: 25 }, (_, i) => entry(String(i), 'hidden')), entry('01', 'allowed')]
    expect(assembleNotificationFeed(updates, { allowed: { assigned: ['allowed'] }, attention: [] }).map((item) => item.work_item_id)).toEqual(['allowed'])
    expect(assembleNotificationFeed([entry('01')], { allowed: {}, attention: [] })).toEqual([])
  })
  it('keeps deadline reminders separate from the latest 20 events; reminders are not unread events', () => {
    const updates = Array.from({ length: 25 }, (_, i) => entry(String(i)))
    const feed = assembleNotificationFeed(updates, { allowed: { assigned: ['work'] }, attention: [entry('deadline', 'work', 'overdue')] })
    expect(feed.filter((item) => item.category === 'update')).toHaveLength(20)
    expect(feed.at(-1)).toMatchObject({ kind: 'overdue', category: 'attention', isUnread: false })
  })
  it('preserves update read state and applies backend scopes independently for each event type', () => {
    const feed = assembleNotificationFeed([{ ...entry('01'), isUnread: false }, entry('02', 'work', 'progress')], { allowed: { assigned: ['work'] }, attention: [] })
    expect(feed).toHaveLength(1); expect(feed[0].isUnread).toBe(false)
  })
  it('uses a server RPC without a caller-selected identity and requests updates before the limit', async () => {
    mock.rpc.mockResolvedValueOnce({ data: { allowed: { assigned: ['work'] }, attention: [] }, error: null }).mockResolvedValueOnce({ data: [], error: null })
    vi.mocked(getPersonalNotifications).mockResolvedValue([entry('01')])
    expect(await getConfiguredNotificationFeed('current-user')).toHaveLength(1)
    expect(mock.rpc).toHaveBeenCalledWith('get_notification_scope')
    expect(getPersonalNotifications).toHaveBeenCalledWith('current-user', Infinity)
  })
  it('merges authorized proposal events with updates, retaining separate reminders', async () => {
    mock.rpc.mockResolvedValueOnce({ data: { allowed: { assigned: ['work'] }, attention: [entry('deadline', 'work', 'overdue')] }, error: null })
      .mockResolvedValueOnce({ data: [entry('30', 'parent', 'proposal_submitted')], error: null })
    vi.mocked(getPersonalNotifications).mockResolvedValue(Array.from({ length: 25 }, (_, index) => entry(String(index).padStart(2, '0'))))
    const feed = await getConfiguredNotificationFeed('current-user')
    expect(feed.filter((item) => item.category !== 'attention')).toHaveLength(20)
    expect(feed[0].kind).toBe('proposal_submitted')
    expect(feed.at(-1)).toMatchObject({ category: 'attention', kind: 'overdue', isUnread: false })
    expect(mock.rpc).toHaveBeenCalledWith('get_proposal_notifications')
  })
  it('limits proposal reviewers to project/system managers and replies to the proposer group', () => {
    const rows = policies()
    rows.find((row) => row.kind === 'proposal_submitted')!.recipients = ['lead_department_admins']
    expect(() => validateNotificationPolicies(rows)).toThrow('Nhóm nhận không phù hợp')
    rows.find((row) => row.kind === 'proposal_submitted')!.recipients = ['project_managers']
    rows.find((row) => row.kind === 'proposal_approved')!.recipients = ['system_managers']
    expect(() => validateNotificationPolicies(rows)).toThrow('Nhóm nhận không phù hợp')
  })
  it('does not quietly fall back to unconfigured notifications on a backend failure', async () => {
    mock.rpc.mockResolvedValue({ data: null, error: { message: 'missing migration' } })
    vi.mocked(getPersonalNotifications).mockResolvedValue([entry('01')])
    await expect(getConfiguredNotificationFeed('user')).rejects.toThrow('Không tải được')
  })
  it('saves the complete versioned configuration in one RPC; validation failures do not write', async () => {
    mock.rpc.mockResolvedValue({ error: null })
    const rows = policies(); await saveNotificationPolicies(rows)
    expect(mock.rpc).toHaveBeenCalledWith('save_notification_policies', { policies: rows })
    await expect(saveNotificationPolicies([])).rejects.toThrow('mười')
    expect(mock.rpc).toHaveBeenCalledTimes(1)
  })
  it('surfaces backend permission and concurrent-save errors', async () => {
    mock.rpc.mockResolvedValue({ error: { message: 'Cấu hình đã được người khác thay đổi.' } })
    await expect(saveNotificationPolicies(policies())).rejects.toThrow('người khác')
  })
  it('has a standalone settings URL and preserves existing project/work URLs', () => {
    expect(routeHash('notification-settings')).toBe('#/notification-settings')
    expect(parseRouteHash('#/notification-settings').page).toBe('notification-settings')
    const hash = routeHash('gantt', 'DEMO 21', 'work-id')
    expect(parseRouteHash(hash)).toEqual({ page: 'gantt', projectKey: 'DEMO 21', workItemId: 'work-id' })
    expect(routeHash('users')).toBe('#/users'); expect(routeHash('approvals')).toBe('#/approvals')
  })
})
