import { supabase } from '../../lib/supabase'
import type { Attachment, CompletionRequest, Milestone, ProgressUpdate, Project, ProjectActivity, UserProfile, WorkItem, WorkItemStatus } from '../../types/domain'
import type { ImportedWorkItem } from './excelService'

export async function getProjects(includeDeleted = false): Promise<Project[]> {
  if (!supabase) return []
  let query = supabase.from('projects').select('id, code, name, site, start_date, end_date, status, deleted_at, deleted_by, created_at, updated_at')
  if (!includeDeleted) query = query.is('deleted_at', null)
  const { data, error } = await query.order('name')
  if (error) throw error
  return (data ?? []) as Project[]
}

export async function saveProject(input: { id?: string; code: string; name: string; site: string; startDate: string; endDate: string }) {
  if (!supabase) throw new Error('Chưa cấu hình Supabase.')
  const row = { code: input.code.trim().toUpperCase(), name: input.name.trim(), site: input.site.trim() || null, start_date: input.startDate || null, end_date: input.endDate || null, status: 'active' as const }
  const result = input.id ? await supabase.from('projects').update(row).eq('id', input.id) : await supabase.from('projects').insert(row)
  if (result.error) throw result.error
}

export async function setProjectDeleted(id: string, deleted: boolean) {
  if (!supabase) throw new Error('Chưa cấu hình Supabase.')
  const { error } = await supabase.rpc('set_project_deleted', { target_project_id: id, deleted })
  if (error) throw error
}

export async function getWorkItems(projectId: string): Promise<WorkItem[]> {
  if (!supabase) return []
  const { data: rows, error } = await supabase.from('work_items').select('*').eq('project_id', projectId).order('sort_order')
  if (error) throw error
  const ids = (rows ?? []).map((row) => row.id)
  if (!ids.length) return []
  const [{ data: participants, error: participantError }, { data: attachments, error: attachmentError }] = await Promise.all([
    supabase.from('work_item_participants').select('work_item_id, user_id').in('work_item_id', ids),
    supabase.from('attachments').select('id, work_item_id, storage_path, file_name, mime_type, size_bytes, uploaded_by, uploaded_at').in('work_item_id', ids).is('completion_request_id', null),
  ])
  if (participantError) throw participantError
  if (attachmentError) throw attachmentError
  return (rows ?? []).map((row) => ({ ...row, participant_ids: (participants ?? []).filter((item) => item.work_item_id === row.id).map((item) => item.user_id), attachment: (attachments ?? []).find((item) => item.work_item_id === row.id) ?? null })) as WorkItem[]
}

export async function getUsers(): Promise<UserProfile[]> {
  if (!supabase) return []
  const { data, error } = await supabase.from('profiles').select('id, username, full_name, role, department_id, active, department:departments(code, name)').eq('active', true).order('full_name')
  if (error) throw error
  return (data ?? []) as unknown as UserProfile[]
}

export async function saveWorkItem(item: WorkItem, input: { name: string; responsibility: string; startDate: string; endDate: string; status: WorkItemStatus; participantIds: string[] }) {
  if (!supabase) throw new Error('Chưa cấu hình Supabase.')
  const { error } = await supabase.rpc('update_work_item_details', {
    target_work_item_id: item.id,
    expected_version: item.version,
    target_name: input.name.trim(),
    target_responsibility: input.responsibility.trim() || null,
    target_start_date: input.startDate || null,
    target_end_date: input.endDate || null,
    target_status: input.status,
    participant_ids: input.participantIds,
  })
  if (error) throw error
}

export async function createWorkItem(input: { projectId: string; parentId: string | null; wbs: string; name: string; responsibility: string; startDate: string; endDate: string; status: WorkItemStatus; participantIds: string[] }): Promise<string> {
  if (!supabase) throw new Error('Chưa cấu hình Supabase.')
  const { data, error } = await supabase.rpc('create_work_item', {
    target_project_id: input.projectId,
    target_parent_id: input.parentId,
    target_wbs: input.wbs,
    target_name: input.name.trim(),
    target_responsibility: input.responsibility.trim() || null,
    target_start_date: input.startDate || null,
    target_end_date: input.endDate || null,
    target_status: input.status,
    participant_ids: input.participantIds,
  })
  if (error) throw error
  if (!data) throw new Error('Không tạo được hạng mục/công việc.')
  return data as string
}

export async function removeWorkItem(id: string) {
  if (!supabase) throw new Error('Chưa cấu hình Supabase.')
  const { error } = await supabase.from('work_items').delete().eq('id', id)
  if (error) throw error
}

export async function importProjectPlan(projectId: string, items: ImportedWorkItem[]) {
  if (!supabase) throw new Error('Chưa cấu hình Supabase.')
  const payload = items.map((item) => ({ client_id: item.client_id, parent_client_id: item.parent_client_id, wbs: item.wbs, name: item.name, responsibility: item.responsibility, start_date: item.start_date, end_date: item.end_date, sort_order: item.sort_order }))
  const { error } = await supabase.rpc('import_project_plan', { target_project_id: projectId, plan_items: payload })
  if (error) throw error
}

export async function cloneProjectPlan(targetProjectId: string, sourceProjectId: string, targetStartDate: string) {
  const source = await getWorkItems(sourceProjectId)
  const dated = source.flatMap((item) => [item.start_date, item.end_date]).filter((value): value is string => Boolean(value)).sort()
  if (!source.length || !dated.length) throw new Error('Dự án nguồn chưa có tiến độ có ngày kế hoạch.')
  const shift = dayDifference(dated[0], targetStartDate)
  const payload: ImportedWorkItem[] = source.map((item, index) => ({
    client_id: item.id, parent_client_id: item.parent_id, wbs: item.wbs, name: item.name,
    responsibility: item.source_responsibility_text ?? '', start_date: shiftDate(item.start_date, shift), end_date: shiftDate(item.end_date, shift),
    sort_order: index, source_row: index + 1, error: null,
  }))
  await importProjectPlan(targetProjectId, payload)
}

export async function getProgressUpdates(workItemId: string): Promise<ProgressUpdate[]> {
  if (!supabase) return []
  const { data, error } = await supabase.from('progress_updates').select('id, work_item_id, content, created_by, created_at, author:profiles!progress_updates_created_by_fkey(username, full_name)').eq('work_item_id', workItemId).order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []) as unknown as ProgressUpdate[]
}

export async function addProgress(workItemId: string, content: string, userId: string) {
  if (!supabase) throw new Error('Chưa cấu hình Supabase.')
  const { error } = await supabase.from('progress_updates').insert({ work_item_id: workItemId, content: content.trim(), created_by: userId })
  if (error) throw error
}

export async function uploadEvidence(workItemId: string, file: File, userId: string) {
  if (!supabase) throw new Error('Chưa cấu hình Supabase.')
  const safeName = file.name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9._-]/g, '_')
  const path = `${workItemId}/${crypto.randomUUID()}-${safeName}`
  const { error: uploadError } = await supabase.storage.from('evidence').upload(path, file)
  if (uploadError) throw uploadError
  const { error } = await supabase.from('attachments').insert({ work_item_id: workItemId, storage_path: path, file_name: file.name, mime_type: file.type || null, size_bytes: file.size, uploaded_by: userId })
  if (error) { await supabase.storage.from('evidence').remove([path]); throw error }
}

export async function viewEvidence(attachment: Attachment) {
  if (!supabase) return
  const { data, error } = await supabase.storage.from('evidence').createSignedUrl(attachment.storage_path, 60)
  if (error) throw error
  window.open(data.signedUrl, '_blank', 'noopener,noreferrer')
}

export async function removeEvidence(attachment: Attachment) {
  if (!supabase) return
  const { error: storageError } = await supabase.storage.from('evidence').remove([attachment.storage_path])
  if (storageError) throw storageError
  const { error } = await supabase.from('attachments').delete().eq('id', attachment.id)
  if (error) throw error
}

export async function requestCompletion(workItemId: string, note: string) {
  if (!supabase) return
  const { error } = await supabase.rpc('submit_work_item_completion', { target_work_item_id: workItemId, submission_note: note.trim() || null })
  if (error) throw error
}

export async function getMilestones(projectId: string): Promise<Milestone[]> {
  if (!supabase) return []
  const { data, error } = await supabase.from('milestones').select('id, project_id, name, due_date, condition_text, owner_text, achieved, achieved_at, sort_order').eq('project_id', projectId).order('sort_order')
  if (error) throw error
  return (data ?? []) as Milestone[]
}

export async function saveMilestone(projectId: string, item: Partial<Milestone> & { name: string; due_date: string; sort_order: number }) {
  if (!supabase) return
  const row = { project_id: projectId, name: item.name.trim(), due_date: item.due_date, condition_text: item.condition_text?.trim() || null, owner_text: item.owner_text?.trim() || null, achieved: item.achieved ?? false, achieved_at: item.achieved ? new Date().toISOString().slice(0, 10) : null, sort_order: item.sort_order }
  const persistedId = item.id && !item.id.startsWith('new-') ? item.id : null
  const result = persistedId ? await supabase.from('milestones').update(row).eq('id', persistedId) : await supabase.from('milestones').insert(row)
  if (result.error) throw result.error
}

export async function saveMilestoneDraft(projectId: string, items: Milestone[]) {
  if (!supabase) throw new Error('Chưa cấu hình Supabase.')
  const payload = items.map((item, index) => ({ id: item.id.startsWith('new-') ? null : item.id, name: item.name, due_date: item.due_date, owner_text: item.owner_text ?? '', condition_text: item.condition_text ?? '', achieved: item.achieved, achieved_at: item.achieved ? item.achieved_at || new Date().toISOString().slice(0, 10) : null, sort_order: index }))
  const { error } = await supabase.rpc('save_project_milestones', { target_project_id: projectId, milestone_items: payload })
  if (error) throw error
}

export async function removeMilestone(id: string) { if (!supabase) return; const { error } = await supabase.from('milestones').delete().eq('id', id); if (error) throw error }

export async function getPendingRequests(): Promise<CompletionRequest[]> {
  if (!supabase) return []
  const { data, error } = await supabase.from('completion_requests').select('id, work_item_id, attempt_no, note, status, submitted_by, submitted_at, work_item:work_items(id, project_id, wbs, name, project:projects(id, code, name)), submitter:profiles!completion_requests_submitted_by_fkey(username, full_name)').eq('status', 'pending').order('submitted_at')
  if (error) throw error
  return (data ?? []).map((row) => { const work = Array.isArray(row.work_item) ? row.work_item[0] : row.work_item; const project = work && 'project' in work ? (Array.isArray(work.project) ? work.project[0] : work.project) : null; return { ...row, work_item: work, project, submitter: Array.isArray(row.submitter) ? row.submitter[0] : row.submitter } as unknown as CompletionRequest })
}

export async function reviewRequest(id: string, decision: 'approved' | 'rejected', note: string) { if (!supabase) return; const { error } = await supabase.rpc('review_completion_request', { target_request_id: id, decision, manager_note: note.trim() || null }); if (error) throw error }

export async function getProjectActivity(projectId: string): Promise<ProjectActivity[]> {
  if (!supabase) return []
  const [{ data: progress, error: progressError }, { data: requests, error: requestError }] = await Promise.all([
    supabase.from('progress_updates').select('id, work_item_id, content, created_at, author:profiles!progress_updates_created_by_fkey(full_name, username), work_item:work_items!inner(wbs, name, project_id)').eq('work_item.project_id', projectId),
    supabase.from('completion_requests').select('id, work_item_id, note, status, submitted_at, reviewed_at, review_note, submitter:profiles!completion_requests_submitted_by_fkey(full_name, username), reviewer:profiles!completion_requests_reviewed_by_fkey(full_name, username), work_item:work_items!inner(wbs, name, project_id)').eq('work_item.project_id', projectId),
  ])
  if (progressError) throw progressError
  if (requestError) throw requestError
  const pick = <T,>(value: T | T[] | null): T | null => Array.isArray(value) ? value[0] ?? null : value
  const entries: ProjectActivity[] = (progress ?? []).map((row) => { const work = pick(row.work_item); const actor = pick(row.author); return { id: `progress-${row.id}`, work_item_id: row.work_item_id, work_item_wbs: work?.wbs ?? '', work_item_name: work?.name ?? '', content: row.content, actor_name: actor?.full_name || actor?.username || '—', created_at: row.created_at, kind: 'progress' } })
  ;(requests ?? []).forEach((row) => {
    const work = pick(row.work_item); const submitter = pick(row.submitter); const reviewer = pick(row.reviewer)
    entries.push({ id: `submitted-${row.id}`, work_item_id: row.work_item_id, work_item_wbs: work?.wbs ?? '', work_item_name: work?.name ?? '', content: row.note ? `Gửi hoàn thành: ${row.note}` : 'Gửi công việc hoàn thành để duyệt.', actor_name: submitter?.full_name || submitter?.username || '—', created_at: row.submitted_at, kind: 'submitted' })
    if (row.status !== 'pending' && row.reviewed_at) entries.push({ id: `reviewed-${row.id}`, work_item_id: row.work_item_id, work_item_wbs: work?.wbs ?? '', work_item_name: work?.name ?? '', content: row.review_note || (row.status === 'approved' ? 'Đã duyệt hoàn thành.' : 'Đã từ chối yêu cầu hoàn thành.'), actor_name: reviewer?.full_name || reviewer?.username || '—', created_at: row.reviewed_at, kind: row.status as 'approved' | 'rejected' })
  })
  return entries.sort((a, b) => b.created_at.localeCompare(a.created_at))
}

function dayDifference(start: string, end: string) { return Math.round((new Date(`${end}T00:00:00`).getTime() - new Date(`${start}T00:00:00`).getTime()) / 86_400_000) }
function shiftDate(value: string | null, days: number) { if (!value) return ''; const date = new Date(`${value}T00:00:00`); date.setDate(date.getDate() + days); return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}` }
