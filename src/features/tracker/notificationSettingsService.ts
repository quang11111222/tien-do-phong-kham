import { supabase } from '../../lib/supabase'
import type { PersonalNotification } from '../../types/domain'
import { getPersonalNotifications } from './trackerService'

export const notificationKinds = ['assigned', 'progress', 'submitted', 'approved', 'rejected', 'due_soon', 'overdue', 'proposal_submitted', 'proposal_approved', 'proposal_rejected'] as const
export type NotificationKind = typeof notificationKinds[number]
export const recipientLabels = {
  participants: 'Người được giao công việc',
  lead_department_admins: 'Quản trị phòng/ban chủ trì',
  project_managers: 'Quản trị được giao dự án',
  system_managers: 'Quản trị hệ thống (mọi dự án)',
}
export type RecipientGroup = keyof typeof recipientLabels
export const notificationLabels: Record<NotificationKind, string> = {
  assigned: 'Được giao công việc', progress: 'Diễn biến mới', submitted: 'Gửi hoàn thành',
  approved: 'Đã duyệt', rejected: 'Đã từ chối', due_soon: 'Sắp đến hạn', overdue: 'Quá hạn',
  proposal_submitted: 'Đề xuất bổ sung chờ duyệt', proposal_approved: 'Đề xuất bổ sung được duyệt', proposal_rejected: 'Đề xuất bổ sung bị từ chối',
}
export function notificationRecipientGroups(kind: NotificationKind): RecipientGroup[] {
  if (kind === 'assigned' || kind === 'proposal_approved' || kind === 'proposal_rejected') return ['participants']
  if (kind === 'proposal_submitted') return ['project_managers', 'system_managers']
  return Object.keys(recipientLabels) as RecipientGroup[]
}
export interface NotificationPolicy {
  kind: NotificationKind
  enabled: boolean
  recipients: RecipientGroup[]
  days: number | null
  version: number
}

export function validateNotificationPolicies(policies: NotificationPolicy[]) {
  if (policies.length !== notificationKinds.length || new Set(policies.map((p) => p.kind)).size !== notificationKinds.length) throw new Error('Cần đủ mười loại thông báo, không được trùng loại.')
  for (const policy of policies) {
    if (!notificationKinds.includes(policy.kind) || typeof policy.enabled !== 'boolean' || !Number.isInteger(policy.version) || policy.version < 1) throw new Error('Cấu hình thông báo không hợp lệ.')
    if (!Array.isArray(policy.recipients) || policy.recipients.some((group) => !Object.hasOwn(recipientLabels, group)) || new Set(policy.recipients).size !== policy.recipients.length) throw new Error('Nhóm nhận thông báo không hợp lệ.')
    if (policy.enabled && !policy.recipients.length) throw new Error(`${notificationLabels[policy.kind]}: hãy chọn ít nhất một nhóm nhận.`)
    if (policy.kind === 'assigned' && policy.recipients.some((group) => group !== 'participants')) throw new Error('Thông báo giao việc chỉ gửi cho người được giao.')
    if (policy.recipients.some((group) => !notificationRecipientGroups(policy.kind).includes(group))) throw new Error('Nhóm nhận không phù hợp với loại đề xuất bổ sung.')
    if (policy.kind === 'due_soon' || policy.kind === 'overdue') {
      if (!Number.isInteger(policy.days) || policy.days! < 1 || policy.days! > 30) throw new Error('Số ngày nhắc hạn phải từ 1 đến 30.')
    } else if (policy.days !== null) throw new Error('Chỉ thông báo nhắc hạn có số ngày.')
  }
}

export async function getNotificationPolicies(): Promise<NotificationPolicy[]> {
  if (!supabase) throw new Error('Chưa cấu hình kết nối dữ liệu.')
  const { data, error } = await supabase.from('notification_policies').select('kind, enabled, recipients, days, version').order('kind')
  if (error) throw new Error('Không tải được cấu hình thông báo. Kiểm tra kết nối và phiên bản database.')
  const policies = data as NotificationPolicy[]
  validateNotificationPolicies(policies)
  return notificationKinds.map((kind) => policies.find((policy) => policy.kind === kind)!)
}

export async function saveNotificationPolicies(policies: NotificationPolicy[]): Promise<void> {
  validateNotificationPolicies(policies)
  if (!supabase) throw new Error('Chưa cấu hình kết nối dữ liệu.')
  const { error } = await supabase.rpc('save_notification_policies', { policies })
  if (error) throw new Error(error.message)
}

export interface NotificationScope {
  allowed: Partial<Record<NotificationKind, string[]>>
  attention: PersonalNotification[]
}

export function assembleNotificationFeed(updates: PersonalNotification[], scope: NotificationScope) {
  const allowed = new Map(Object.entries(scope.allowed).map(([kind, ids]) => [kind, new Set(ids)]))
  return [
    ...updates.filter((item) => allowed.get(item.kind)?.has(item.work_item_id)).sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, 20).map((item) => ({ ...item, category: 'update' as const })),
    ...scope.attention.map((item) => ({ ...item, category: 'attention' as const, isUnread: false })),
  ]
}

export async function getConfiguredNotificationFeed(userId: string): Promise<PersonalNotification[]> {
  if (!supabase) return []
  // Scope and calendar reminders are computed using auth.uid() on the server, never the supplied userId.
  const [{ data, error }, updates, proposalResult] = await Promise.all([
    supabase.rpc('get_notification_scope'), getPersonalNotifications(userId, Infinity), supabase.rpc('get_proposal_notifications'),
  ])
  if (error || proposalResult.error) throw new Error('Không tải được thông báo. Vui lòng thử lại.')
  const feed = assembleNotificationFeed(updates, data as NotificationScope)
  return [...[...feed.filter((item) => item.category !== 'attention'), ...(proposalResult.data as PersonalNotification[] ?? [])].sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, 20), ...feed.filter((item) => item.category === 'attention')]
}
