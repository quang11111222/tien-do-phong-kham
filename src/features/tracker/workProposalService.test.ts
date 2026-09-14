import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { WorkItem } from '../../types/domain'
const mock = vi.hoisted(() => ({ rpc: vi.fn() }))
vi.mock('../../lib/supabase', () => ({ supabase: mock }))
import { inheritedProposalLead, reviewWorkProposal, submitWorkProposal, validateProposalDraft, withdrawWorkProposal, type ProposalDraft, type WorkProposal } from './workProposalService'
const draft = (): ProposalDraft => ({ parentId: 'parent', name: ' Phát sinh ', reason: ' Sở yêu cầu thêm ', startDate: '2026-09-14', endDate: '2026-09-16', coordinatingDepartmentIds: ['coord'], participantIds: ['employee'] })
const proposal = { id: 'proposal', version: 2 } as WorkProposal
describe('đề xuất bổ sung công việc', () => {
  beforeEach(() => { mock.rpc.mockReset(); mock.rpc.mockResolvedValue({ error: null }) })
  it('finds nearest parent lead, not a coordinating department; handles incomplete/cyclic trees', () => {
    const items = [{ id: 'parent', parent_id: 'grand', lead_department_id: null }, { id: 'grand', parent_id: null, lead_department_id: 'lead' }] as WorkItem[]
    expect(inheritedProposalLead('parent', items)).toBe('lead')
    expect(inheritedProposalLead('missing', items)).toBe('')
    expect(inheritedProposalLead('parent', [{ id: 'parent', parent_id: 'parent', lead_department_id: null }] as WorkItem[])).toBe('')
  })
  it('rejects blank reason or reversed dates before writing', async () => {
    expect(() => validateProposalDraft({ ...draft(), reason: ' ' })).toThrow('lý do')
    await expect(submitWorkProposal({ ...draft(), endDate: '2026-09-12' })).rejects.toThrow('Ngày kết thúc')
    expect(mock.rpc).not.toHaveBeenCalled()
  })
  it('submits separately from create_work_item; no work is created before approval', async () => {
    await submitWorkProposal(draft())
    expect(mock.rpc).toHaveBeenCalledExactlyOnceWith('propose_child_work_item', expect.objectContaining({ target_name: 'Phát sinh', target_reason: 'Sở yêu cầu thêm', target_parent_id: 'parent', target_proposal_id: null, expected_version: null }))
  })
  it('resubmits and withdraws using the existing id/version, without overwriting another revision', async () => {
    await submitWorkProposal(draft(), proposal)
    expect(mock.rpc).toHaveBeenCalledWith('propose_child_work_item', expect.objectContaining({ target_proposal_id: 'proposal', expected_version: 2 }))
    await withdrawWorkProposal(proposal)
    expect(mock.rpc).toHaveBeenCalledWith('withdraw_work_item_proposal', { target_proposal_id: 'proposal', expected_version: 2 })
  })
  it('requires rejection reason, sends only versioned review, and surfaces backend permission errors', async () => {
    await expect(reviewWorkProposal(proposal, 'rejected', ' ')).rejects.toThrow('lý do')
    expect(mock.rpc).not.toHaveBeenCalled()
    mock.rpc.mockResolvedValue({ error: { message: 'Chỉ Quản trị dự án được duyệt' } })
    await expect(reviewWorkProposal(proposal, 'approved', '')).rejects.toThrow('Quản trị dự án')
    expect(mock.rpc).toHaveBeenCalledWith('review_work_item_proposal', { target_proposal_id: 'proposal', expected_version: 2, decision: 'approved', manager_note: null })
  })
})
