import { describe, expect, it } from 'vitest'
import { canAddChildWorkItem, canCompleteWorkItemDirectly, canEditWorkItem, canManageWorkItemStructure, canReviewCompletion } from './permissions'

describe('work item permissions', () => {
  it('allows a manager to edit every work item', () => {
    expect(canEditWorkItem({ role: 'manager', userId: 'manager-1', participantIds: [] })).toBe(true)
  })

  it('allows a project administrator to manage a work item without being assigned', () => {
    expect(canEditWorkItem({ role: 'employee', canManageProject: true, userId: 'project-admin', participantIds: [] })).toBe(true)
  })

  it('allows an employee to edit only assigned work items', () => {
    expect(
      canEditWorkItem({ role: 'employee', userId: 'employee-1', participantIds: ['employee-1'] }),
    ).toBe(true)
    expect(
      canEditWorkItem({ role: 'employee', userId: 'employee-1', participantIds: ['employee-2'] }),
    ).toBe(false)
  })

  it('allows department administrators to manage work inside their lead branch', () => {
    const access = {
      role: 'employee' as const,
      departmentId: 'ptpk',
      isDepartmentAdmin: true,
      leadDepartmentIdsInPath: [null, 'ptpk'],
    }
    expect(canManageWorkItemStructure({ ...access, parentId: 'root-item' })).toBe(true)
    expect(canAddChildWorkItem({ ...access, parentId: 'parent-item' })).toBe(true)
  })

  it('does not let department administrators manage a top-level category or coordinating-only branch', () => {
    const access = {
      role: 'employee' as const,
      departmentId: 'ptpk',
      isDepartmentAdmin: true,
    }
    expect(canManageWorkItemStructure({ ...access, parentId: null, leadDepartmentIdsInPath: ['ptpk'] })).toBe(false)
    expect(canAddChildWorkItem({ ...access, parentId: 'parent-item', leadDepartmentIdsInPath: ['marketing'] })).toBe(false)
  })

  it('allows one eligible reviewer but never the submitter', () => {
    const profile = { id: 'department-admin', role: 'employee' as const, department_id: 'ptpk', is_department_admin: true }
    expect(canReviewCompletion({ profile, projectCanManage: false, leadDepartmentId: 'ptpk', submittedBy: 'employee' })).toBe(true)
    expect(canReviewCompletion({ profile, projectCanManage: false, leadDepartmentId: 'ptpk', submittedBy: 'department-admin' })).toBe(false)
    expect(canReviewCompletion({ profile: { ...profile, is_department_admin: false }, projectCanManage: false, leadDepartmentId: 'ptpk' })).toBe(false)
  })

  it('allows project and system administrators to review', () => {
    const employee = { id: 'project-admin', role: 'employee' as const, department_id: null, is_department_admin: false }
    expect(canReviewCompletion({ profile: employee, projectCanManage: true, leadDepartmentId: null })).toBe(true)
    expect(canReviewCompletion({ profile: { ...employee, role: 'manager' }, projectCanManage: false, leadDepartmentId: null })).toBe(true)
  })

  it('completes directly for project administrators and lead department administrators', () => {
    const departmentAdmin = { department_id: 'ptpk', is_department_admin: true }
    expect(canCompleteWorkItemDirectly({ profile: departmentAdmin, projectCanManage: false, leadDepartmentId: 'ptpk' })).toBe(true)
    expect(canCompleteWorkItemDirectly({ profile: departmentAdmin, projectCanManage: false, leadDepartmentId: 'marketing' })).toBe(false)
    expect(canCompleteWorkItemDirectly({ profile: { department_id: 'ptpk', is_department_admin: false }, projectCanManage: true, leadDepartmentId: 'marketing' })).toBe(true)
  })
})
