import type { AppRole } from '../types/domain'

interface WorkItemAccessInput {
  role: AppRole
  canManageProject?: boolean
  userId: string
  participantIds: string[]
}

export function canEditWorkItem({ role, canManageProject, userId, participantIds }: WorkItemAccessInput) {
  return role === 'manager' || canManageProject === true || participantIds.includes(userId)
}

export function canReviewCompletion(input: { profile: { id: string; role: AppRole; department_id: string | null; is_department_admin: boolean }; projectCanManage: boolean; leadDepartmentId: string | null; submittedBy?: string }) {
  if (input.submittedBy === input.profile.id) return false
  return input.profile.role === 'manager' || input.projectCanManage || Boolean(input.profile.is_department_admin && input.profile.department_id && input.profile.department_id === input.leadDepartmentId)
}
