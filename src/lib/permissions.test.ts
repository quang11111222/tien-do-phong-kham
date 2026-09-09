import { describe, expect, it } from 'vitest'
import { canEditWorkItem, canReviewCompletion } from './permissions'

describe('work item permissions', () => {
  it('allows a manager to edit every work item', () => {
    expect(canEditWorkItem({ role: 'manager', userId: 'manager-1', participantIds: [] })).toBe(true)
  })

  it('allows an employee to edit only assigned work items', () => {
    expect(
      canEditWorkItem({ role: 'employee', userId: 'employee-1', participantIds: ['employee-1'] }),
    ).toBe(true)
    expect(
      canEditWorkItem({ role: 'employee', userId: 'employee-1', participantIds: ['employee-2'] }),
    ).toBe(false)
  })

  it('allows only managers to review completion requests', () => {
    expect(canReviewCompletion('manager')).toBe(true)
    expect(canReviewCompletion('employee')).toBe(false)
  })
})
