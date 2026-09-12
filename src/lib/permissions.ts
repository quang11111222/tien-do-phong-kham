import type { AppRole } from '../types/domain'

interface WorkItemAccessInput {
  role: AppRole
  canManageProject?: boolean
  userId: string
  participantIds: string[]
}

interface WorkItemStructureAccessInput {
  role: AppRole
  canManageProject?: boolean
  departmentId: string | null
  isDepartmentAdmin: boolean
  parentId: string | null
  leadDepartmentIdsInPath: Array<string | null>
}

interface WorkItemDetailAccessInput extends WorkItemStructureAccessInput {
  leadDepartmentIdsInBranch: Array<string | null>
  coordinatingDepartmentIds: string[]
  participantIds: string[]
  userId: string
}

export function canEditWorkItem({ role, canManageProject, userId, participantIds }: WorkItemAccessInput) {
  return role === 'manager' || canManageProject === true || participantIds.includes(userId)
}

export function canManageWorkItemStructure(input: WorkItemStructureAccessInput) {
  return input.role === 'manager' || input.canManageProject === true
}

export function canAddChildWorkItem(input: WorkItemStructureAccessInput) {
  return input.role === 'manager' || input.canManageProject === true
}

export function canViewWorkItemDetails(input: WorkItemDetailAccessInput) {
  if (input.role === 'manager' || input.canManageProject === true) return true
  if (input.participantIds.includes(input.userId)) return true
  if (!input.departmentId) return false
  if (input.leadDepartmentIdsInBranch.includes(input.departmentId) || input.coordinatingDepartmentIds.includes(input.departmentId)) return true
  return input.isDepartmentAdmin && input.leadDepartmentIdsInPath.includes(input.departmentId)
}

export function canReviewCompletion(input: { profile: { id: string; role: AppRole; department_id: string | null; is_department_admin: boolean }; projectCanManage: boolean; leadDepartmentId: string | null; submittedBy?: string }) {
  if (input.submittedBy === input.profile.id) return false
  return input.profile.role === 'manager' || input.projectCanManage || Boolean(input.profile.is_department_admin && input.profile.department_id && input.profile.department_id === input.leadDepartmentId)
}

export function canCompleteWorkItemDirectly(input: { profile: { department_id: string | null; is_department_admin: boolean }; projectCanManage: boolean; leadDepartmentId: string | null }) {
  return input.projectCanManage || Boolean(
    input.profile.is_department_admin
    && input.profile.department_id
    && input.profile.department_id === input.leadDepartmentId,
  )
}
