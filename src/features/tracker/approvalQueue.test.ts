import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { CompletionRequest, Profile, Project } from '../../types/domain'

const mocks = vi.hoisted(() => ({ getProjects: vi.fn(), getPendingRequests: vi.fn(), getWorkProposals: vi.fn() }))
vi.mock('./trackerService', () => ({ getProjects: mocks.getProjects, getPendingRequests: mocks.getPendingRequests }))
vi.mock('./workProposalService', () => ({ getWorkProposals: mocks.getWorkProposals }))

import { approvalQueueCount, getApprovalQueue } from './approvalQueue'

const profile: Profile = { id: 'admin', username: 'admin', full_name: 'Admin', role: 'employee', department_id: 'dept-a', department: null, is_department_admin: false, active: true }
const projects = [
  { id: 'managed', code: 'M', name: 'Managed', can_manage: true },
  { id: 'other', code: 'O', name: 'Other', can_manage: false },
] as Project[]
const requests = [
  { id: 'allowed', submitted_by: 'other-user', work_item: { project_id: 'managed', lead_department_id: 'dept-b' } },
  { id: 'own', submitted_by: 'admin', work_item: { project_id: 'managed', lead_department_id: 'dept-b' } },
  { id: 'outside', submitted_by: 'other-user', work_item: { project_id: 'other', lead_department_id: 'dept-b' } },
] as CompletionRequest[]

describe('tổng hàng đợi xét duyệt', () => {
  beforeEach(() => {
    mocks.getProjects.mockResolvedValue(projects)
    mocks.getPendingRequests.mockResolvedValue(requests)
    mocks.getWorkProposals.mockImplementation(async (projectId: string) => projectId === 'managed' ? [
      { id: 'pending', status: 'pending', submitted_at: '2026-09-16T01:00:00Z' },
      { id: 'approved', status: 'approved', submitted_at: '2026-09-15T01:00:00Z' },
    ] : [])
  })

  it('uses the same scoped completion and proposal queues for the navigation count', async () => {
    const queue = await getApprovalQueue(profile)
    expect(queue.completionItems.map((item) => item.id)).toEqual(['allowed'])
    expect(queue.proposalItems.map((item) => item.id)).toEqual(['pending'])
    expect(approvalQueueCount(queue)).toBe(2)
    expect(mocks.getWorkProposals).toHaveBeenCalledExactlyOnceWith('managed')
  })
})
