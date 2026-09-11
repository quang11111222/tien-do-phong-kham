import type { UserProfile } from '../../types/domain'

export function eligibleParticipants(
  users: UserProfile[],
  leadDepartmentId: string,
  coordinatingDepartmentIds: string[],
) {
  const eligibleDepartmentIds = new Set(
    [leadDepartmentId, ...coordinatingDepartmentIds].filter(Boolean),
  )

  return users.filter(
    (user) => user.department_id !== null && eligibleDepartmentIds.has(user.department_id),
  )
}

export function retainEligibleParticipantIds(
  participantIds: string[],
  users: UserProfile[],
  leadDepartmentId: string,
  coordinatingDepartmentIds: string[],
) {
  const eligibleIds = new Set(
    eligibleParticipants(users, leadDepartmentId, coordinatingDepartmentIds).map((user) => user.id),
  )
  return participantIds.filter((id) => eligibleIds.has(id))
}
