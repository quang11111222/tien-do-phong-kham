import type { AppRole, WorkItem } from '../../types/domain'

export type WorkScope = 'mine' | 'department' | 'visible'

export function defaultWorkScope(role: AppRole, canManageProject: boolean, isDepartmentAdmin: boolean): WorkScope {
  if (role === 'manager' || canManageProject) return 'visible'
  if (isDepartmentAdmin) return 'department'
  return 'mine'
}

export function matchesWorkScopeDirect(item: WorkItem, scope: WorkScope, userId: string, departmentId: string | null) {
  if (scope === 'visible') return true
  if (scope === 'department') {
    return Boolean(
      departmentId
      && (item.lead_department_id === departmentId || item.coordinating_department_ids.includes(departmentId)),
    )
  }
  return item.participant_ids.includes(userId)
}

export function filterWorkItemsByScope(items: WorkItem[], scope: WorkScope, userId: string, departmentId: string | null) {
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
      : matchesWorkScopeDirect(item, scope, userId, departmentId)
    included.set(item.id, result)
    return result
  }
  return items.filter(visit)
}
