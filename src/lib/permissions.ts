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

export function canEditWorkItem({ role, canManageProject, userId, participantIds }: WorkItemAccessInput) {
  return role === 'manager' || canManageProject === true || participantIds.includes(userId)
}

function managesDepartmentBranch(input: WorkItemStructureAccessInput) {
  return Boolean(
    input.isDepartmentAdmin
    && input.departmentId
    && input.leadDepartmentIdsInPath.includes(input.departmentId),
  )
}

export function canManageWorkItemStructure(input: WorkItemStructureAccessInput) {
  if (input.role === 'manager' || input.canManageProject === true) return true
  return input.parentId !== null && managesDepartmentBranch(input)
}

export function canAddChildWorkItem(input: WorkItemStructureAccessInput) {
  return input.role === 'manager' || input.canManageProject === true || managesDepartmentBranch(input)
}

export function canReviewCompletion(input: { profile: { id: string; role: AppRole; department_id: string | null; is_department_admin: boolean }; projectCanManage: boolean; leadDepartmentId: string | null; submittedBy?: string }) {
  if (input.submittedBy === input.profile.id) return false
  return input.profile.role === 'manager' || input.projectCanManage || Boolean(input.profile.is_department_admin && input.profile.department_id && input.profile.department_id === input.leadDepartmentId)
}
