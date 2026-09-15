import { describe, expect, it } from 'vitest'
import type { CompletionRequest, Profile, Project } from '../../types/domain'
import { canReviewCompletionRequest, proposalReviewProjects } from './approvalScope'

const profile = (overrides: Partial<Profile> = {}): Profile => ({ id: 'employee', username: 'employee', full_name: 'Employee', role: 'employee', department_id: 'dept-a', department: null, is_department_admin: false, active: true, ...overrides })
const request = (overrides: Partial<CompletionRequest> = {}): CompletionRequest => ({ id: 'request', work_item_id: 'work', attempt_no: 1, note: null, status: 'pending', submitted_by: 'other', submitted_at: '2026-09-15T00:00:00Z', work_item: { id: 'work', project_id: 'project-a', wbs: '1', name: 'Work', lead_department_id: 'dept-a' }, ...overrides })
const project = (id: string, canManage: boolean): Project => ({ id, code: id, name: id, site: null, start_date: null, end_date: null, status: 'active', deleted_at: null, deleted_by: null, created_at: '', updated_at: '', administrator_ids: [], can_manage: canManage })

describe('phạm vi màn xét duyệt', () => {
  it('never shows approval actions for a request submitted by the current account', () => {
    expect(canReviewCompletionRequest(request({ submitted_by: 'employee' }), profile(), new Set(['project-a']))).toBe(false)
  })
  it('allows only the matching project or lead-department administrators', () => {
    expect(canReviewCompletionRequest(request(), profile(), new Set(['project-a']))).toBe(true)
    expect(canReviewCompletionRequest(request(), profile(), new Set(['project-b']))).toBe(false)
    expect(canReviewCompletionRequest(request(), profile({ is_department_admin: true }), new Set())).toBe(true)
    expect(canReviewCompletionRequest(request(), profile({ is_department_admin: true, department_id: 'dept-b' }), new Set())).toBe(false)
  })
  it('system administrator sees other users requests and proposal projects; project administrator sees only assigned projects', () => {
    expect(canReviewCompletionRequest(request(), profile({ role: 'manager' }), new Set())).toBe(true)
    const projects = [project('project-a', true), project('project-b', false)]
    expect(proposalReviewProjects(projects, false).map((item) => item.id)).toEqual(['project-a'])
    expect(proposalReviewProjects(projects, true).map((item) => item.id)).toEqual(['project-a', 'project-b'])
  })
})
