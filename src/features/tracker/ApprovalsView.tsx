import { useCallback, useEffect, useMemo, useState } from 'react'
import type { CompletionRequest, Profile, Project } from '../../types/domain'
import { useConfirm } from '../../components/confirmContext'
import { useToast } from '../../components/toastContext'
import { useAutoRefresh } from '../../lib/useAutoRefresh'
import { getPendingRequests, getProjects, reviewRequest } from './trackerService'
import { getWorkProposals, reviewWorkProposal, type WorkProposal } from './workProposalService'
import { canReviewCompletionRequest, proposalReviewProjects } from './approvalScope'

type ApprovalTab = 'completion' | 'proposal'
type ProposalQueueItem = WorkProposal & { project: Pick<Project, 'id' | 'code' | 'name'> }
const PAGE_SIZE = 10

export function ApprovalsView({ profile }: { profile: Profile }) {
  const [tab, setTab] = useState<ApprovalTab>('completion')
  const [completionItems, setCompletionItems] = useState<CompletionRequest[]>([])
  const [proposalItems, setProposalItems] = useState<ProposalQueueItem[]>([])
  const [notes, setNotes] = useState<Record<string, string>>({})
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const notify = useToast()
  const confirm = useConfirm()

  const load = useCallback(async () => {
    const projects = await getProjects()
    const managedProjectIds = new Set(projects.filter((project) => project.can_manage).map((project) => project.id))
    const requests = await getPendingRequests()
    const reviewProjects = proposalReviewProjects(projects, profile.role === 'manager')
    const proposals = (await Promise.all(reviewProjects.map(async (project) =>
      (await getWorkProposals(project.id)).filter((proposal) => proposal.status === 'pending').map((proposal) => ({ ...proposal, project }))
    ))).flat().sort((a, b) => a.submitted_at.localeCompare(b.submitted_at))
    setCompletionItems(requests.filter((item) => canReviewCompletionRequest(item, profile, managedProjectIds)))
    setProposalItems(proposals)
  }, [profile])

  useEffect(() => {
    const timer = window.setTimeout(() => void load().catch(() => setError('Không tải được danh sách xét duyệt.')).finally(() => setLoading(false)), 0)
    return () => window.clearTimeout(timer)
  }, [load])
  useAutoRefresh(() => load().catch(() => setError('Không tự cập nhật được danh sách xét duyệt.')), { enabled: !busyId })

  const activeItems = tab === 'completion' ? completionItems : proposalItems
  const pageCount = Math.max(1, Math.ceil(activeItems.length / PAGE_SIZE))
  const currentPage = Math.min(page, pageCount)
  const visibleItems = useMemo(() => activeItems.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE), [activeItems, currentPage])

  const changeTab = (next: ApprovalTab) => { setTab(next); setPage(1); setError(null) }
  const decideCompletion = async (item: CompletionRequest, decision: 'approved' | 'rejected') => {
    if (decision === 'rejected' && !notes[item.id]?.trim()) { const message = 'Từ chối phải nhập lý do.'; setError(message); notify(message, 'error'); return }
    if (!await confirm({ title: decision === 'approved' ? 'Duyệt hoàn thành công việc?' : 'Từ chối yêu cầu hoàn thành?', message: decision === 'approved' ? `Công việc “${item.work_item?.name}” sẽ chuyển sang Hoàn thành.` : `Yêu cầu của “${item.work_item?.name}” sẽ được trả lại cho người gửi.`, confirmLabel: decision === 'approved' ? 'Duyệt hoàn thành' : 'Từ chối', tone: decision === 'approved' ? 'primary' : 'danger' })) return
    try { setError(null); setBusyId(item.id); await reviewRequest(item.id, decision, notes[item.id] ?? ''); await load(); notify(decision === 'approved' ? 'Đã duyệt hoàn thành công việc.' : 'Đã từ chối yêu cầu hoàn thành.') }
    catch { const message = 'Yêu cầu đã được xử lý hoặc tài khoản không có quyền duyệt.'; setError(message); notify(message, 'error') }
    finally { setBusyId(null) }
  }
  const decideProposal = async (item: ProposalQueueItem, decision: 'approved' | 'rejected') => {
    if (decision === 'rejected' && !notes[item.id]?.trim()) { const message = 'Từ chối phải nhập lý do.'; setError(message); notify(message, 'error'); return }
    if (!await confirm({ title: decision === 'approved' ? 'Duyệt việc phát sinh?' : 'Từ chối việc phát sinh?', message: decision === 'approved' ? `Công việc “${item.name}” sẽ được thêm vào kế hoạch chính thức.` : `Đề xuất “${item.name}” sẽ được trả lại cho người gửi.`, confirmLabel: decision === 'approved' ? 'Duyệt bổ sung' : 'Từ chối', tone: decision === 'approved' ? 'primary' : 'danger' })) return
    try { setError(null); setBusyId(item.id); await reviewWorkProposal(item, decision, notes[item.id] ?? ''); await load(); notify(decision === 'approved' ? 'Đã thêm công việc phát sinh vào kế hoạch.' : 'Đã từ chối đề xuất công việc phát sinh.') }
    catch (caught) { const message = caught instanceof Error ? caught.message : 'Không xử lý được đề xuất công việc phát sinh.'; setError(message); notify(message, 'error') }
    finally { setBusyId(null) }
  }

  return <>
    <div className="ovhead"><div><div className="eyebrow">QUY TRÌNH XÉT DUYỆT</div><h1>Xét duyệt công việc</h1><p className="tiny muted">Chỉ hiển thị yêu cầu thuộc đúng phạm vi bạn được quyền xử lý.</p></div></div>
    <div className="approval-tabs" role="tablist" aria-label="Loại yêu cầu xét duyệt">
      <button role="tab" aria-selected={tab === 'completion'} className={tab === 'completion' ? 'on' : ''} onClick={() => changeTab('completion')}>Duyệt hoàn thành <b>{completionItems.length}</b></button>
      <button role="tab" aria-selected={tab === 'proposal'} className={tab === 'proposal' ? 'on' : ''} onClick={() => changeTab('proposal')}>Duyệt việc phát sinh <b>{proposalItems.length}</b></button>
    </div>
    {error && <div className="note warn offline">{error}</div>}
    <div className="stats"><div className="stat wr"><b>{activeItems.length}</b><span>{tab === 'completion' ? 'Yêu cầu hoàn thành cần xử lý' : 'Đề xuất phát sinh cần xử lý'}</span></div></div>
    <div className="card approval-queue-card">{loading ? <div className="empty">Đang tải danh sách xét duyệt…</div> : !activeItems.length ? <div className="empty"><h3>{tab === 'completion' ? 'Không có yêu cầu hoàn thành' : 'Không có đề xuất việc phát sinh'}</h3><p>Yêu cầu mới thuộc phạm vi duyệt của bạn sẽ xuất hiện tại đây.</p></div> : <div className="alist">
      {tab === 'completion' ? (visibleItems as CompletionRequest[]).map((item) => <div className="ai approval-row" key={item.id}><div><span className="pcode">{item.project?.code}</span><span className="sb">Lần {item.attempt_no}</span></div><div><span className="nm">{item.work_item?.wbs}. {item.work_item?.name}</span><span className="sb">{item.submitter?.full_name || item.submitter?.username} · {dateTime(item.submitted_at)} · {item.note || 'Không có ghi chú'}{item.late_reason ? ` · Lý do trễ: ${item.late_reason}` : ''}</span></div><ApprovalActions id={item.id} busyId={busyId} note={notes[item.id] ?? ''} setNote={(value) => setNotes({ ...notes, [item.id]: value })} approveLabel="Duyệt hoàn thành" onReject={() => void decideCompletion(item, 'rejected')} onApprove={() => void decideCompletion(item, 'approved')} /></div>)
        : (visibleItems as ProposalQueueItem[]).map((item) => <div className="ai approval-row" key={item.id}><div><span className="pcode">{item.project.code}</span><span className="sb">Việc phát sinh</span></div><div><span className="nm">{item.parent_name} → {item.name}</span><span className="sb">{item.proposer?.full_name || item.proposer?.username} · {dateTime(item.submitted_at)} · {item.reason}</span></div><ApprovalActions id={item.id} busyId={busyId} note={notes[item.id] ?? ''} setNote={(value) => setNotes({ ...notes, [item.id]: value })} approveLabel="Duyệt bổ sung" approveDisabled={!item.parent_id} onReject={() => void decideProposal(item, 'rejected')} onApprove={() => void decideProposal(item, 'approved')} /></div>)}
    </div>}
      {pageCount > 1 && <div className="approval-pagination"><span>Hiển thị {(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, activeItems.length)} trong {activeItems.length} yêu cầu</span><div><button className="btn" disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)}>← Trước</button><strong>Trang {currentPage}/{pageCount}</strong><button className="btn" disabled={currentPage === pageCount} onClick={() => setPage(currentPage + 1)}>Sau →</button></div></div>}
    </div>
  </>
}

function ApprovalActions({ id, busyId, note, setNote, approveLabel, approveDisabled = false, onReject, onApprove }: { id: string; busyId: string | null; note: string; setNote: (value: string) => void; approveLabel: string; approveDisabled?: boolean; onReject: () => void; onApprove: () => void }) {
  const busy = busyId === id
  return <div className="approval-box"><input disabled={busy} aria-label={`Nhận xét yêu cầu ${id}`} placeholder="Nhận xét / lý do từ chối" value={note} onChange={(event) => setNote(event.target.value)} /><button disabled={busy} className="btn dgr" onClick={onReject}>{busy ? 'Đang xử lý…' : 'Từ chối'}</button><button disabled={busy || approveDisabled} className="btn ok" onClick={onApprove}>{busy ? 'Đang xử lý…' : approveLabel}</button></div>
}

function dateTime(value: string) { return new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value)) }
