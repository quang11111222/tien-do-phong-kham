import { describe, expect, it } from 'vitest'
import { displayWorkItemWbs } from './workItemDisplay'

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
