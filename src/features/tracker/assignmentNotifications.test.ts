import { beforeEach, describe, expect, it, vi } from 'vitest'

const mock = vi.hoisted(() => ({ rows: {} as Record<string, { data: unknown[]; error: unknown }>, filters: [] as string[][] }))
vi.mock('../../lib/supabase', () => ({ supabase: {
  from: (table: string) => ({ select: () => ({
    eq: (field: string, value: string) => { mock.filters.push([table, field, value]); return Promise.resolve(mock.rows[table] ?? { data: [], error: null }) },
    then: (resolve: (value: unknown) => unknown) => Promise.resolve(mock.rows[table] ?? { data: [], error: null }).then(resolve),
  }) }),
} }))

import { getPersonalNotifications } from './trackerService'

const assignment = (assignedAt = '2026-09-14T08:00:00Z', assignedBy = 'manager') => ({
  work_item_id: 'demo-work', assigned_at: assignedAt, assigned_by: assignedBy,
  assigner: { full_name: 'Demo quản trị', username: 'demo-manager' },
  work_item: { id: 'demo-work', wbs: '1.1', name: 'Demo công việc', project_id: 'demo-project', project: { id: 'demo-project', code: 'DEMO', name: 'Demo dự án' } },
})

describe('personal assignment notifications', () => {
  beforeEach(() => { mock.rows = {}; mock.filters = [] })

  it('loads only the signed-in recipient assignments and links the exact work', async () => {
    mock.rows.work_item_participants = { data: [assignment()], error: null }
    const entries = await getPersonalNotifications('recipient')
    expect(mock.filters).toContainEqual(['work_item_participants', 'user_id', 'recipient'])
    expect(entries).toHaveLength(1)
    expect(entries[0]).toMatchObject({ kind: 'assigned', work_item_id: 'demo-work', project_code: 'DEMO', isUnread: true })
  })

  it('retains a read assignment without showing it as unread', async () => {
    mock.rows.work_item_participants = { data: [assignment()], error: null }
    mock.rows.work_item_activity_reads = { data: [{ work_item_id: 'demo-work', last_seen_at: '2026-09-14T09:00:00Z' }], error: null }
    expect((await getPersonalNotifications('recipient'))[0].isUnread).toBe(false)
  })

  it('marks reassignment after reading as unread and ignores self-assignment', async () => {
    mock.rows.work_item_participants = { data: [assignment('2026-09-14T10:00:00Z'), assignment('2026-09-14T11:00:00Z', 'recipient')], error: null }
    mock.rows.work_item_activity_reads = { data: [{ work_item_id: 'demo-work', last_seen_at: '2026-09-14T09:00:00Z' }], error: null }
    const entries = await getPersonalNotifications('recipient')
    expect(entries).toHaveLength(1)
    expect(entries[0].isUnread).toBe(true)
  })

  it('propagates assignment read failures rather than silently hiding them', async () => {
    mock.rows.work_item_participants = { data: [], error: new Error('Assignment read failed') }
    await expect(getPersonalNotifications('recipient')).rejects.toThrow('Assignment read failed')
  })
})
