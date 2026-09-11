import { describe, expect, it } from 'vitest'
import type { UserProfile } from '../../types/domain'
import { eligibleParticipants, retainEligibleParticipantIds } from './participantEligibility'

const users = [
  { id: 'lead-user', department_id: 'lead' },
  { id: 'coordinator-user', department_id: 'coordinator' },
  { id: 'other-user', department_id: 'other' },
  { id: 'no-department-user', department_id: null },
] as UserProfile[]

describe('participant eligibility', () => {
  it('chỉ lấy nhân sự thuộc đơn vị chủ trì hoặc phối hợp', () => {
    expect(eligibleParticipants(users, 'lead', ['coordinator']).map((user) => user.id))
      .toEqual(['lead-user', 'coordinator-user'])
  })

  it('loại phân công không còn hợp lệ khi đổi đơn vị', () => {
    expect(retainEligibleParticipantIds(
      ['lead-user', 'coordinator-user', 'other-user'],
      users,
      'lead',
      [],
    )).toEqual(['lead-user'])
  })
})
