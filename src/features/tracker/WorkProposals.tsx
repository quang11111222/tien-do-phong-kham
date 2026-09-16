import { useCallback, useEffect, useState, type FormEvent } from 'react'
import type { Department, Profile, Project, UserProfile, WorkItem } from '../../types/domain'
import { useConfirm } from '../../components/confirmContext'
import { useToast } from '../../components/toastContext'
import { useAutoRefresh } from '../../lib/useAutoRefresh'
import { DepartmentMultiSelect } from './DepartmentMultiSelect'
import { ParticipantMultiSelect } from './ParticipantMultiSelect'
import { eligibleParticipants, retainEligibleParticipantIds } from './participantEligibility'
import { getWorkProposals, inheritedProposalLead, reviewWorkProposal, submitWorkProposal, withdrawWorkProposal, type ProposalDraft, type WorkProposal } from './workProposalService'

const statusLabels = { pending: 'Chờ duyệt bổ sung', rejected: 'Đã từ chối', withdrawn: 'Đã rút', approved: 'Đã duyệt bổ sung' }
const eventLabels: Record<string, string> = { submitted: 'Gửi đề xuất', rejected: 'Từ chối', withdrawn: 'Rút đề xuất', approved: 'Duyệt bổ sung' }
const blank = (): ProposalDraft => ({ parentId: '', name: '', reason: '', startDate: '', endDate: '', coordinatingDepartmentIds: [], participantIds: [] })

export function WorkProposals({ project, profile, items, parents, users, departments, onChanged, onDirtyChange }: {
  project: Project; profile: Profile; items: WorkItem[]; parents: WorkItem[]; users: UserProfile[]; departments: Department[]
  onChanged: () => Promise<void>; onDirtyChange: (dirty: boolean) => void
}) {
  const canReview = profile.role === 'manager' || project.can_manage
  const [rows, setRows] = useState<WorkProposal[]>([])
  const [openList, setOpenList] = useState(false)
  const [draft, setDraft] = useState<ProposalDraft | null>(null)
  const [original, setOriginal] = useState('')
  const [existing, setExisting] = useState<WorkProposal | undefined>()
  const [notes, setNotes] = useState<Record<string, string>>({})
  const [page, setPage] = useState(1)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const confirm = useConfirm()
  const notify = useToast()
  const dirty = Boolean(draft && JSON.stringify(draft) !== original)
  const load = useCallback(async () => { setRows(await getWorkProposals(project.id)); setError(''); setLoading(false) }, [project.id])
  useEffect(() => { let active = true; void getWorkProposals(project.id).then((data) => { if (active) { setRows(data); setError('') } }).catch((err: Error) => { if (active) setError(err.message) }).finally(() => { if (active) setLoading(false) }); return () => { active = false } }, [project.id])
  useAutoRefresh(() => load().catch((err: Error) => setError(err.message)), { enabled: !draft && !busy && !Object.values(notes).some((note) => note.trim()) })
  useEffect(() => { onDirtyChange(dirty || Object.values(notes).some((note) => note.trim().length > 0)); return () => onDirtyChange(false) }, [dirty, notes, onDirtyChange])
  const close = useCallback(async () => {
    if (busy) return
    if (dirty && !await confirm({ title: 'Bỏ đề xuất chưa gửi?', message: 'Nội dung vừa nhập chưa được gửi và sẽ bị bỏ.', confirmLabel: 'Đóng và bỏ', tone: 'danger' })) return
    setDraft(null); setExisting(undefined)
  }, [busy, dirty, confirm])
  useEffect(() => { if (!draft) return; const escape = (event: KeyboardEvent) => { if (event.key === 'Escape') void close() }; window.addEventListener('keydown', escape); return () => window.removeEventListener('keydown', escape) }, [draft, close])
  const edit = (row?: WorkProposal) => {
    const next = row ? { parentId: row.parent_id ?? '', name: row.name, reason: row.reason, startDate: row.start_date, endDate: row.end_date, coordinatingDepartmentIds: row.coordinating_department_ids, participantIds: row.participant_ids } : blank()
    setExisting(row); setDraft(next); setOriginal(JSON.stringify(next)); setError('')
  }
  const leadId = draft ? inheritedProposalLead(draft.parentId, items) : ''
  const submit = async (event: FormEvent) => {
    event.preventDefault(); if (!draft || busy) return
    setBusy(true)
    try { await submitWorkProposal(draft, existing); setDraft(null); setExisting(undefined); setOpenList(true); setPage(1); notify('Đã gửi đề xuất. Công việc chỉ vào tiến độ sau khi được duyệt.'); await load() }
    catch (err) { const message = err instanceof Error ? err.message : 'Không gửi được đề xuất.'; setError(message); notify(message, 'error') }
    finally { setBusy(false) }
  }
  const decide = async (row: WorkProposal, decision: 'approved' | 'rejected') => {
    if (busy) return
    if (!await confirm({ title: decision === 'approved' ? 'Duyệt bổ sung công việc?' : 'Từ chối đề xuất?', message: decision === 'approved' ? `Công việc “${row.name}” sẽ được thêm vào kế hoạch và tính lại tiến độ hạng mục cha.` : `Đề xuất “${row.name}” sẽ được trả lại cho người gửi.`, confirmLabel: decision === 'approved' ? 'Duyệt bổ sung' : 'Từ chối' })) return
    setBusy(true)
    try { await reviewWorkProposal(row, decision, notes[row.id] ?? ''); setNotes((current) => { const next = { ...current }; delete next[row.id]; return next }); notify(decision === 'approved' ? 'Đã duyệt và thêm công việc vào tiến độ.' : 'Đã từ chối đề xuất.'); await load(); await onChanged() }
    catch (err) { const message = err instanceof Error ? err.message : 'Không xử lý được đề xuất.'; setError(message); notify(message, 'error') }
    finally { setBusy(false) }
  }
  const withdraw = async (row: WorkProposal) => {
    if (!await confirm({ title: 'Rút đề xuất?', message: 'Đề xuất sẽ dừng chờ duyệt. Bạn có thể sửa và gửi lại.', confirmLabel: 'Rút đề xuất' })) return
    setBusy(true)
    try { await withdrawWorkProposal(row); notify('Đã rút đề xuất.'); await load() }
    catch (err) { const message = err instanceof Error ? err.message : 'Không rút được đề xuất.'; setError(message); notify(message, 'error') }
    finally { setBusy(false) }
  }
  const pending = rows.filter((row) => row.status === 'pending').length
  const pages = Math.max(1, Math.ceil(rows.length / 10))
  const currentPage = Math.min(page, pages)
  return <section className="work-proposals">
    <div className="proposal-toolbar"><button className="btn" disabled={busy || !parents.length} onClick={() => edit()}>+ Đề xuất công việc con</button><button className="btn" aria-expanded={openList} onClick={() => setOpenList((value) => !value)}>Đề xuất bổ sung {pending > 0 ? `(${pending} chờ duyệt)` : ''}</button></div>
    {openList && <div className="card proposal-list"><h2>{canReview ? 'Đề xuất bổ sung trong dự án' : 'Đề xuất bổ sung của tôi'}</h2><p className="tiny muted">Chỉ Quản trị dự án hoặc Quản trị hệ thống được duyệt. Đề xuất chờ duyệt chưa tính vào tiến độ.</p>
      {error && !draft && <div role="alert" className="note warn">{error}<button className="btn" onClick={() => void load().catch((err: Error) => setError(err.message))}>Tải lại</button></div>}
      {loading ? <p>Đang tải đề xuất…</p> : !rows.length && !error ? <p>Chưa có đề xuất bổ sung.</p> : rows.slice((currentPage - 1) * 10, currentPage * 10).map((row) => <article key={row.id} className="proposal-row">
        <div><b>{row.name}</b><span className="proposal-status">{statusLabels[row.status]}</span><p className="tiny">Hạng mục cha: {row.parent_name}{!row.parent_id && ' (đã xóa)'}</p><p className="tiny">{row.proposer?.full_name || 'Người đề xuất'} · {new Date(row.submitted_at).toLocaleString('vi-VN')}</p><p>{row.reason}</p><p className="tiny">{row.start_date} → {row.end_date} · Chủ trì: {departments.find((department) => department.id === row.lead_department_id)?.name || '—'}</p><p className="tiny">Phối hợp: {row.coordinating_department_ids.map((id) => departments.find((department) => department.id === id)?.name || id).join(', ') || 'Không có'}</p><p className="tiny">Người tham gia: {row.participant_ids.map((id) => users.find((user) => user.id === id)?.full_name || 'Tài khoản không còn hoạt động').join(', ') || 'Chưa phân công'}</p>{row.review_note && <p>Nhận xét: {row.review_note}</p>}
          <details><summary>Lịch sử đề xuất</summary>{[...row.events].sort((a, b) => a.created_at.localeCompare(b.created_at)).map((entry) => <p className="tiny" key={entry.id}>{eventLabels[entry.action]} · {new Date(entry.created_at).toLocaleString('vi-VN')}{entry.note ? ` · ${entry.note}` : ''}</p>)}</details>
        </div>
        <div className="proposal-actions">{canReview && row.status === 'pending' && <><input aria-label={`Nhận xét đề xuất ${row.name}`} placeholder="Nhận xét / lý do từ chối" disabled={busy} value={notes[row.id] ?? ''} onChange={(event) => setNotes({ ...notes, [row.id]: event.target.value })} /><button className="btn dgr" disabled={busy} onClick={() => void decide(row, 'rejected')}>Từ chối</button><button className="btn ok" disabled={busy || !row.parent_id} onClick={() => void decide(row, 'approved')}>Duyệt bổ sung</button></>}{row.proposed_by === profile.id && row.status === 'pending' && <button className="btn" disabled={busy} onClick={() => void withdraw(row)}>Rút đề xuất</button>}{row.proposed_by === profile.id && ['withdrawn','rejected'].includes(row.status) && <button className="btn" disabled={busy || !row.parent_id || !parents.some((parent) => parent.id === row.parent_id)} onClick={() => edit(row)}>Sửa và gửi lại</button>}</div>
      </article>)}
      {pages > 1 && <div className="proposal-toolbar"><button className="btn" disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)}>Trước</button><span>{currentPage}/{pages}</span><button className="btn" disabled={currentPage === pages} onClick={() => setPage(currentPage + 1)}>Sau</button></div>}
    </div>}
    {draft && <><div className="proposal-backdrop" onClick={() => void close()} /><aside className="drawer on proposal-drawer" role="dialog" aria-modal="true" aria-label="Đề xuất công việc con"><form id="dwrap" onSubmit={(event) => void submit(event)}><div className="dhead"><h2>Đề xuất công việc con</h2><button className="btn" type="button" aria-label="Đóng đề xuất" disabled={busy} onClick={() => void close()}>✕</button></div><div className="dbody">
      <p className="note">Công việc chưa được thêm vào kế hoạch. Quản trị dự án hoặc Quản trị hệ thống cần duyệt đề xuất này.</p>{error && <p role="alert" className="note warn">{error}</p>}
      <fieldset disabled={busy}><label className="f"><span>Hạng mục cha</span><select required disabled={Boolean(existing)} value={draft.parentId} onChange={(event) => setDraft({ ...draft, parentId: event.target.value, coordinatingDepartmentIds: [], participantIds: [] })}><option value="">Chọn hạng mục/công việc cha</option>{parents.map((parent) => <option key={parent.id} value={parent.id}>{parent.wbs}. {parent.name}</option>)}</select></label>
      <label className="f"><span>Tên công việc</span><input autoFocus required maxLength={500} value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} /></label>
      <label className="f"><span>Lý do phát sinh</span><textarea required maxLength={4000} value={draft.reason} onChange={(event) => setDraft({ ...draft, reason: event.target.value })} /></label>
      <p className="tiny">Đơn vị chủ trì (kế thừa): <b>{departments.find((department) => department.id === leadId)?.name || 'Chưa có đơn vị chủ trì'}</b></p>
      <DepartmentMultiSelect departments={departments} leadDepartmentId={leadId} selectedIds={draft.coordinatingDepartmentIds} disabled={!leadId} onChange={(ids) => setDraft({ ...draft, coordinatingDepartmentIds: ids, participantIds: retainEligibleParticipantIds(draft.participantIds, users, leadId, ids) })} />
      <ParticipantMultiSelect users={eligibleParticipants(users.filter((user) => user.active), leadId, draft.coordinatingDepartmentIds)} selectedIds={draft.participantIds} onChange={(ids) => setDraft({ ...draft, participantIds: ids })} />
      <label className="f"><span>Ngày bắt đầu</span><input required type="date" value={draft.startDate} onChange={(event) => setDraft({ ...draft, startDate: event.target.value })} /></label><label className="f"><span>Ngày kết thúc</span><input required type="date" min={draft.startDate} value={draft.endDate} onChange={(event) => setDraft({ ...draft, endDate: event.target.value })} /></label></fieldset>
      </div><footer className="dfoot"><button className="btn" type="button" disabled={busy} onClick={() => void close()}>Hủy bỏ</button><button className="btn pri" type="submit" disabled={busy || !leadId}>{busy ? 'Đang gửi…' : 'Gửi đề xuất'}</button></footer></form></aside></>}
  </section>
}

export function WorkProposalForm({ parent, items, users, departments, onChanged, onDirtyChange }: {
  parent: WorkItem; items: WorkItem[]; users: UserProfile[]; departments: Department[]
  onChanged: () => Promise<void>; onDirtyChange: (dirty: boolean) => void
}) {
  const initialDraft = (): ProposalDraft => ({ ...blank(), parentId: parent.id })
  const [draft, setDraft] = useState<ProposalDraft>(initialDraft)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const notify = useToast()
  const leadId = inheritedProposalLead(parent.id, items)
  const dirty = JSON.stringify(draft) !== JSON.stringify(initialDraft())
  useEffect(() => { onDirtyChange(dirty); return () => onDirtyChange(false) }, [dirty, onDirtyChange])

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (busy) return
    setBusy(true); setError('')
    try {
      await submitWorkProposal(draft)
      setDraft(initialDraft())
      notify('Đã gửi đề xuất. Công việc chỉ vào tiến độ sau khi được duyệt.')
      await onChanged()
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : 'Không gửi được đề xuất.'
      setError(message); notify(message, 'error')
    } finally { setBusy(false) }
  }

  return <form className="sec proposal-embedded" onSubmit={(event) => void submit(event)}>
    <h3>Đề xuất công việc con</h3>
    <p className="note">Công việc cha: <b>{parent.wbs}. {parent.name}</b>. Đề xuất chỉ vào kế hoạch sau khi Quản trị dự án hoặc Quản trị hệ thống duyệt.</p>
    {error && <p role="alert" className="note warn">{error}</p>}
    <fieldset disabled={busy}>
      <label className="f"><span>Tên công việc</span><input autoFocus required maxLength={500} value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} /></label>
      <label className="f"><span>Lý do phát sinh</span><textarea required maxLength={4000} value={draft.reason} onChange={(event) => setDraft({ ...draft, reason: event.target.value })} /></label>
      <p className="tiny">Đơn vị chủ trì (kế thừa): <b>{departments.find((department) => department.id === leadId)?.name || 'Chưa có đơn vị chủ trì'}</b></p>
      <DepartmentMultiSelect departments={departments} leadDepartmentId={leadId} selectedIds={draft.coordinatingDepartmentIds} disabled={!leadId} onChange={(ids) => setDraft({ ...draft, coordinatingDepartmentIds: ids, participantIds: retainEligibleParticipantIds(draft.participantIds, users, leadId, ids) })} />
      <ParticipantMultiSelect users={eligibleParticipants(users.filter((user) => user.active), leadId, draft.coordinatingDepartmentIds)} selectedIds={draft.participantIds} onChange={(ids) => setDraft({ ...draft, participantIds: ids })} />
      <label className="f"><span>Ngày bắt đầu</span><input required type="date" value={draft.startDate} onChange={(event) => setDraft({ ...draft, startDate: event.target.value })} /></label>
      <label className="f"><span>Ngày kết thúc</span><input required type="date" min={draft.startDate} value={draft.endDate} onChange={(event) => setDraft({ ...draft, endDate: event.target.value })} /></label>
    </fieldset>
    <button className="btn pri" type="submit" disabled={busy || !leadId}>{busy ? 'Đang gửi…' : 'Gửi đề xuất'}</button>
  </form>
}
