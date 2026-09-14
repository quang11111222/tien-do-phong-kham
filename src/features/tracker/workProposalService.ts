import { supabase } from '../../lib/supabase'
import type { WorkItem } from '../../types/domain'

export type ProposalStatus = 'pending' | 'withdrawn' | 'rejected' | 'approved'
export interface WorkProposal {
  id: string; project_id: string; parent_id: string | null; parent_name: string
  name: string; reason: string; lead_department_id: string
  coordinating_department_ids: string[]; participant_ids: string[]
  start_date: string; end_date: string; proposed_by: string; status: ProposalStatus
  version: number; submitted_at: string; review_note: string | null
  created_work_item_id: string | null
  proposer: { full_name: string; username: string } | null
  events: { id: string; action: string; note: string | null; created_at: string }[]
}
export interface ProposalDraft {
  parentId: string; name: string; reason: string; startDate: string; endDate: string
  coordinatingDepartmentIds: string[]; participantIds: string[]
}
export function inheritedProposalLead(parentId: string, items: WorkItem[]) {
  const visited = new Set<string>()
  let item = items.find((row) => row.id === parentId)
  while (item && !visited.has(item.id)) {
    visited.add(item.id)
    if (item.lead_department_id) return item.lead_department_id
    item = items.find((row) => row.id === item!.parent_id)
  }
  return ''
}
export function validateProposalDraft(draft: ProposalDraft) {
  if (!draft.parentId || !draft.name.trim() || !draft.reason.trim()) throw new Error('Cần chọn hạng mục cha, nhập tên công việc và lý do phát sinh.')
  if (!/^\d{4}-\d{2}-\d{2}$/.test(draft.startDate) || !/^\d{4}-\d{2}-\d{2}$/.test(draft.endDate) || draft.endDate < draft.startDate) throw new Error('Ngày kết thúc phải từ ngày bắt đầu trở đi.')
}
export async function getWorkProposals(projectId: string): Promise<WorkProposal[]> {
  if (!supabase) throw new Error('Chưa cấu hình kết nối dữ liệu.')
  const { data, error } = await supabase.from('work_item_proposals').select('*, proposer:profiles!work_item_proposals_proposed_by_fkey(full_name, username), events:work_item_proposal_events(id, action, note, created_at)').eq('project_id', projectId).order('submitted_at', { ascending: false })
  if (error) throw new Error('Không tải được đề xuất bổ sung. Kiểm tra kết nối và phiên bản database.')
  return (data ?? []) as WorkProposal[]
}
export async function submitWorkProposal(draft: ProposalDraft, existing?: WorkProposal) {
  validateProposalDraft(draft)
  if (!supabase) throw new Error('Chưa cấu hình kết nối dữ liệu.')
  const { error } = await supabase.rpc('propose_child_work_item', {
    target_parent_id: draft.parentId, target_name: draft.name.trim(), target_reason: draft.reason.trim(),
    target_start_date: draft.startDate, target_end_date: draft.endDate,
    coordinating_department_ids: draft.coordinatingDepartmentIds, participant_ids: draft.participantIds,
    target_proposal_id: existing?.id ?? null, expected_version: existing?.version ?? null,
  })
  if (error) throw new Error(error.message)
}
export async function withdrawWorkProposal(proposal: WorkProposal) {
  if (!supabase) throw new Error('Chưa cấu hình kết nối dữ liệu.')
  const { error } = await supabase.rpc('withdraw_work_item_proposal', { target_proposal_id: proposal.id, expected_version: proposal.version })
  if (error) throw new Error(error.message)
}
export async function reviewWorkProposal(proposal: WorkProposal, decision: 'approved' | 'rejected', note: string) {
  if (decision === 'rejected' && !note.trim()) throw new Error('Từ chối phải nhập lý do.')
  if (!supabase) throw new Error('Chưa cấu hình kết nối dữ liệu.')
  const { error } = await supabase.rpc('review_work_item_proposal', { target_proposal_id: proposal.id, expected_version: proposal.version, decision, manager_note: note.trim() || null })
  if (error) throw new Error(error.message)
}
