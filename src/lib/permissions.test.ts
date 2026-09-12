import { describe, expect, it } from 'vitest'
import { canAddChildWorkItem, canCompleteWorkItemDirectly, canEditWorkItem, canManageWorkItemStructure, canReviewCompletion, canViewWorkItemDetails } from './permissions'

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

  it('locks plan structure for department administrators, including their lead branch', () => {
    const access = {
      role: 'employee' as const,
      departmentId: 'ptpk',
      isDepartmentAdmin: true,
      leadDepartmentIdsInPath: [null, 'ptpk'],
    }
    expect(canManageWorkItemStructure({ ...access, parentId: 'root-item' })).toBe(false)
    expect(canAddChildWorkItem({ ...access, parentId: 'parent-item' })).toBe(false)
  })

  it('allows only system and project administrators to change plan structure', () => {
    const access = {
      role: 'employee' as const,
      departmentId: 'ptpk',
      isDepartmentAdmin: true,
      parentId: 'parent-item',
      leadDepartmentIdsInPath: ['ptpk'],
    }
    expect(canManageWorkItemStructure({ ...access, role: 'manager' })).toBe(true)
    expect(canAddChildWorkItem({ ...access, role: 'manager' })).toBe(true)
    expect(canManageWorkItemStructure({ ...access, canManageProject: true })).toBe(true)
    expect(canAddChildWorkItem({ ...access, canManageProject: true })).toBe(true)
  })

  it('separates all-project progress visibility from detailed work data', () => {
    const base = {
      role: 'employee' as const,
      canManageProject: false,
      departmentId: 'ptpk',
      isDepartmentAdmin: true,
      parentId: 'parent-item',
      leadDepartmentIdsInPath: ['other'],
      leadDepartmentIdsInBranch: ['other'],
      coordinatingDepartmentIds: [] as string[],
      participantIds: [] as string[],
      userId: 'department-admin',
    }
    expect(canViewWorkItemDetails(base)).toBe(false)
    expect(canViewWorkItemDetails({ ...base, coordinatingDepartmentIds: ['ptpk'] })).toBe(true)
    expect(canViewWorkItemDetails({ ...base, leadDepartmentIdsInBranch: ['other', 'ptpk'] })).toBe(true)
    expect(canViewWorkItemDetails({ ...base, coordinatingDepartmentIds: [], leadDepartmentIdsInPath: ['ptpk', 'other'] })).toBe(true)
    expect(canViewWorkItemDetails({ ...base, isDepartmentAdmin: false, participantIds: ['department-admin'] })).toBe(true)
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
