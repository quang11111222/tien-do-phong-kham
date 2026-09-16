import { describe, expect, it } from 'vitest'
import { actualCompletionDate, displayWorkItemWbs, requiresLateReason } from './workItemDisplay'

describe('displayWorkItemWbs', () => {
  it('keeps the Roman numeral of a top-level category', () => {
    expect(displayWorkItemWbs('III')).toBe('III')
  })

  it('shows hierarchical numbering below the top-level category', () => {
    expect(displayWorkItemWbs('III.1')).toBe('1')
    expect(displayWorkItemWbs('III.1.1')).toBe('1.1')
    expect(displayWorkItemWbs('III.1.2')).toBe('1.2')
    expect(displayWorkItemWbs('III.1.2.1')).toBe('1.2.1')
  })

  it('does not rewrite non-Roman imported codes', () => {
    expect(displayWorkItemWbs('A.1.2')).toBe('A.1.2')
    expect(displayWorkItemWbs('1.2')).toBe('1.2')
  })
})

describe('actual completion display', () => {
  it('uses the Vietnam calendar date of the approved submission timestamp', () => {
    expect(actualCompletionDate('2026-09-15T18:30:00Z')).toBe('2026-09-16')
    expect(actualCompletionDate(null)).toBeNull()
  })

  it('requires a separate late reason only after the planned end date', () => {
    expect(requiresLateReason('2026-09-15', 'in_progress', '2026-09-16')).toBe(true)
    expect(requiresLateReason('2026-09-16', 'in_progress', '2026-09-16')).toBe(false)
    expect(requiresLateReason('2026-09-15', 'pending_approval', '2026-09-16')).toBe(false)
    expect(requiresLateReason('2026-09-15', 'completed', '2026-09-16')).toBe(false)
  })
})
