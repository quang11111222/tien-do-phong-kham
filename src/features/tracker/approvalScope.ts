import type { CompletionRequest, Profile, Project } from '../../types/domain'

export function canReviewCompletionRequest(item: CompletionRequest, profile: Profile, managedProjectIds: Set<string>) {
  if (!item.work_item || item.submitted_by === profile.id) return false
  return profile.role === 'manager'
    || managedProjectIds.has(item.work_item.project_id)
    || Boolean(profile.is_department_admin && profile.department_id && item.work_item.lead_department_id === profile.department_id)
}

export function proposalReviewProjects(projects: Project[], isSystemAdmin: boolean) {
  return isSystemAdmin ? projects : projects.filter((project) => project.can_manage)
}
