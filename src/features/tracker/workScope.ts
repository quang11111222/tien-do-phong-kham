import type { AppRole, WorkItem } from '../../types/domain'

export type WorkScope = 'mine' | 'visible'

export function defaultWorkScope(role: AppRole, canManageProject: boolean, isDepartmentAdmin: boolean): WorkScope {
  if (role === 'manager' || canManageProject || isDepartmentAdmin) return 'visible'
  return 'mine'
}

export function matchesWorkScopeDirect(item: WorkItem, scope: WorkScope, userId: string) {
  if (scope === 'visible') return true
  return item.participant_ids.includes(userId)
}

export function filterWorkItemsByScope(items: WorkItem[], scope: WorkScope, userId: string) {
  if (scope === 'visible') return items
  const children = new Map<string, WorkItem[]>()
  items.forEach((item) => {
    if (item.parent_id) children.set(item.parent_id, [...(children.get(item.parent_id) ?? []), item])
  })
  const included = new Map<string, boolean>()
  const visit = (item: WorkItem): boolean => {
    const cached = included.get(item.id)
    if (cached !== undefined) return cached
    const ownChildren = children.get(item.id) ?? []
    const result = ownChildren.length
      ? ownChildren.some(visit)
      : matchesWorkScopeDirect(item, scope, userId)
    included.set(item.id, result)
    return result
  }
  return items.filter(visit)
}
