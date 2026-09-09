import type { AppRole } from '../types/domain'

interface WorkItemAccessInput {
  role: AppRole
  userId: string
  participantIds: string[]
}

export function canEditWorkItem({ role, userId, participantIds }: WorkItemAccessInput) {
  return role === 'manager' || participantIds.includes(userId)
}

export function canReviewCompletion(role: AppRole) {
  return role === 'manager'
}
