import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import type { CompletionRequest, Department, Milestone, Profile, Project, ProgressUpdate, UserProfile, WorkItem, WorkItemStatus } from '../../types/domain'
import { addProgress, cloneProjectPlan, createWorkItem, getDepartments, getMilestones, getPendingRequests, getProgressUpdates, getProjects, getUsers, getWorkItems, importProjectPlan, markWorkItemActivitySeen, removeEvidence, removeWorkItem, requestCompletion, reviewRequest, saveWorkItem, uploadEvidence, viewEvidence } from './trackerService'
import { exportProject } from './excelService'
import { ExcelImportModal } from './ExcelImportModal'
import { ProjectHeader } from './ProjectHeader'
import { DepartmentMultiSelect } from './DepartmentMultiSelect'
import { ParticipantMultiSelect } from './ParticipantMultiSelect'
import { useConfirm } from '../../components/confirmContext'
import { useAutoRefresh } from '../../lib/useAutoRefresh'

const labels: Record<WorkItemStatus, string> = { not_started: 'Chưa thực hiện', in_progress: 'Đang thực hiện', pending_approval: 'Chờ duyệt', completed: 'Hoàn thành' }
const classes: Record<WorkItemStatus | 'late', string> = { not_started: 'p-todo', in_progress: 'p-doing', pending_approval: 'p-pending', completed: 'p-done', late: 'p-late' }
type DrawerTab = 'info' | 'evidence' | 'log' | 'approval'

export function GanttView({ project, profile, initialWorkItemId, onSelectedWorkItemChange, onBack, onDirtyChange, onUnreadCountChange }: { project: Project; profile: Profile; initialWorkItemId: string | null; onSelectedWorkItemChange: (workItemId: string | null) => void; onBack: () => void; onDirtyChange: (dirty: boolean) => void; onUnreadCountChange: (count: number) => void }) {
  const [items, setItems] = useState<WorkItem[]>([])
  const [users, setUsers] = useState<UserProfile[]>([])
  const [departments, setDepartments] = useState<Department[]>([])
  const [milestones, setMilestones] = useState<Milestone[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [leadFilter, setLeadFilter] = useState('')
  const [filter, setFilter] = useState<WorkItemStatus | 'late' | ''>('')
  const [zoom, setZoom] = useState<'day' | 'week' | 'month'>('week')
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())
  const [selected, setSelected] = useState<string | null>(null)
  const [draftItem, setDraftItem] = useState<WorkItem | null>(null)
  const [showImport, setShowImport] = useState(false)
  const [showClone, setShowClone] = useState(false)
  const [drawerDirty, setDrawerDirty] = useState(false)
  const [drawerTab, setDrawerTab] = useState<DrawerTab>('info')
  const [cloneSources, setCloneSources] = useState<Project[]>([])
  const [cloneSourceId, setCloneSourceId] = useState('')
  const [cloneStart, setCloneStart] = useState(project.start_date ?? today())

  const applyItems = useCallback((nextItems: WorkItem[]) => { setItems(nextItems); onUnreadCountChange(nextItems.filter((item) => item.has_unseen_activity).length) }, [onUnreadCountChange])
  const load = async () => { const [nextItems, nextUsers, nextMilestones, nextDepartments] = await Promise.all([getWorkItems(project.id), getUsers(), getMilestones(project.id), getDepartments()]); applyItems(nextItems); setUsers(nextUsers); setMilestones(nextMilestones); setDepartments(nextDepartments) }
  useEffect(() => { let active = true; void Promise.all([getWorkItems(project.id), getUsers(), getMilestones(project.id), getDepartments()]).then(([nextItems, nextUsers, nextMilestones, nextDepartments]) => { if (!active) return; applyItems(nextItems); setUsers(nextUsers); setMilestones(nextMilestones); setDepartments(nextDepartments) }).catch(() => { if (active) setError('Không tải được tiến độ dự án.') }).finally(() => { if (active) setLoading(false) }); return () => { active = false } }, [project.id, applyItems])
  useAutoRefresh(() => load().catch(() => setError('Không tự cập nhật được dữ liệu mới.')), { enabled: !drawerDirty && !showImport && !showClone })
  useEffect(() => {
    if (!initialWorkItemId || loading) return
    const timer = window.setTimeout(() => {
      const item = items.find((candidate) => candidate.id === initialWorkItemId)
      if (!item) {
        setError('Công việc trong đường dẫn không còn tồn tại hoặc đã bị xóa.')
        onSelectedWorkItemChange(null)
        return
      }
      if (selected === item.id) return
      setDraftItem(null)
      setSelected(item.id)
      setDrawerTab(profile.role === 'manager' && item.status === 'pending_approval' ? 'approval' : 'info')
      setCollapsed((current) => {
        const next = new Set(current)
        let parentId = item.parent_id
        while (parentId) { next.delete(parentId); parentId = items.find((candidate) => candidate.id === parentId)?.parent_id ?? null }
        return next
      })
      if (item.has_unseen_activity) void markWorkItemActivitySeen(item.id, profile.id).catch(() => setError('Không đánh dấu được diễn biến đã xem.'))
    }, 0)
    return () => window.clearTimeout(timer)
  }, [initialWorkItemId, items, loading, onSelectedWorkItemChange, profile.id, profile.role, selected])

  const children = useMemo(() => groupByParent(items), [items])
  const leaves = items.filter((item) => !(children.get(item.id)?.length))
  const counts = countStatuses(leaves)
  const leads = [...new Map(leaves.flatMap((item) => item.lead_department ? [[item.lead_department.id, item.lead_department] as const] : [])).values()].sort((a, b) => a.code.localeCompare(b.code))
  const startDate = minDate([project.start_date, ...leaves.map((item) => item.start_date), ...milestones.map((item) => item.due_date)]) || today()
  const endDate = maxDate([project.end_date, ...leaves.map((item) => item.end_date), ...milestones.map((item) => item.due_date)]) || startDate
  const pixelsPerDay = zoom === 'day' ? 22 : zoom === 'week' ? 7 : 3
  const totalDays = Math.max(1, dayDiff(startDate, endDate) + 1)
  const width = totalDays * pixelsPerDay
  const flatRows = flatten(items, children, collapsed).filter((item) => {
    const departmentText = [item.lead_department, ...item.coordinating_departments].filter((department): department is Department => Boolean(department)).map((department) => `${department.code} ${department.name}`).join(' ')
    const matchesText = !query || `${item.wbs} ${item.name} ${departmentText}`.toLowerCase().includes(query.toLowerCase())
    const matchesLead = !leadFilter || item.lead_department_id === leadFilter || descendants(item.id, items).some((child) => child.lead_department_id === leadFilter)
    const state = aggregateStatus(item, items, children)
    return matchesText && matchesLead && (!filter || state === filter)
  })
  const selectedItem = items.find((item) => item.id === selected) ?? null
  const unreadActivityCount = items.filter((item) => item.has_unseen_activity).length

  const toggle = (id: string) => setCollapsed((current) => { const next = new Set(current); if (next.has(id)) next.delete(id); else next.add(id); return next })
  const run = async (action: () => Promise<void>) => { setError(null); try { await action(); await load() } catch (caught) { setError(caught instanceof Error ? caught.message : 'Không thực hiện được thao tác.') } }
  const scrollToday = () => { const container = document.querySelector<HTMLElement>('.tt'); const line = container?.querySelector<HTMLElement>('.now'); if (container && line) container.scrollLeft = Math.max(0, line.offsetLeft - container.clientWidth * 0.55) }
  const openClone = async () => { try { const projects = (await getProjects()).filter((item) => item.id !== project.id); const viable = (await Promise.all(projects.map(async (item) => ({ item, hasPlan: (await getWorkItems(item.id)).length > 0 })))).filter((entry) => entry.hasPlan).map((entry) => entry.item); setCloneSources(viable); setCloneSourceId(viable[0]?.id ?? ''); setShowClone(true) } catch { setError('Không tải được danh sách dự án để nhân bản.') } }
  const reportDirty = useCallback((dirty: boolean) => { setDrawerDirty(dirty); onDirtyChange(dirty) }, [onDirtyChange])
  const openDraft = (parent: WorkItem | null) => { setSelected(null); setDrawerTab('info'); onSelectedWorkItemChange(null); setDraftItem(makeDraft(project.id, parent, items)) }
  const openExisting = (item: WorkItem) => {
    setDraftItem(null)
    if (selected !== item.id) setDrawerTab(profile.role === 'manager' && item.status === 'pending_approval' ? 'approval' : 'info')
    setSelected(item.id)
    onSelectedWorkItemChange(item.id)
    if (!item.has_unseen_activity) return
    const nextItems = items.map((candidate) => candidate.id === item.id ? { ...candidate, has_unseen_activity: false } : candidate)
    applyItems(nextItems)
    void markWorkItemActivitySeen(item.id, profile.id).catch(() => setError('Không đánh dấu được diễn biến đã xem.'))
  }
  const closeDrawer = () => { reportDirty(false); setSelected(null); setDraftItem(null); onSelectedWorkItemChange(null) }
  const created = async (id: string) => { reportDirty(false); setDraftItem(null); setDrawerTab('info'); await load(); setSelected(id); onSelectedWorkItemChange(id) }

  if (!loading && !items.length) return <><ProjectHeader project={project} section="Tiến độ & sơ đồ Gantt" onBack={onBack} />{error && <div className="note warn offline">{error}</div>}<div className="card empty empty-plan"><h3>Dự án này chưa có tiến độ chi tiết</h3><p className="muted">Tạo bộ hạng mục bằng cách nhân bản từ một dự án đã có, hoặc thêm từng hạng mục.</p>{profile.role === 'manager' ? <div className="row2"><button className="btn pri" onClick={() => setShowImport(true)}>Nạp từ file Excel</button><button className="btn" onClick={() => void openClone()}>Nhân bản từ dự án khác</button><button className="btn" onClick={() => openDraft(null)}>Thêm hạng mục thủ công</button></div> : <div className="tiny muted">Quản trị viên chưa thiết lập tiến độ cho dự án này.</div>}</div>{draftItem && <WorkDrawer item={draftItem} items={items} users={users} departments={departments} profile={profile} isNew tab={drawerTab} onTabChange={setDrawerTab} onClose={closeDrawer} onCreated={created} onAddChild={openDraft} onChanged={load} onError={setError} onDirtyChange={reportDirty} />}{showImport && <ExcelImportModal onClose={() => setShowImport(false)} onImport={async (imported) => { await importProjectPlan(project.id, imported); await load() }} />}{showClone && <CloneModal sources={cloneSources} sourceId={cloneSourceId} startDate={cloneStart} onSourceChange={setCloneSourceId} onStartChange={setCloneStart} onClose={() => setShowClone(false)} onClone={async () => { await run(() => cloneProjectPlan(project.id, cloneSourceId, cloneStart)); setShowClone(false) }} />}</>

  return <>
    <ProjectHeader project={project} section="Tiến độ & sơ đồ Gantt" onBack={onBack} />
    {error && <div className="note warn offline">{error}</div>}
    <div className="sum"><div className="u"><b>{leaves.length}</b><span>Công việc</span></div><div className="u"><b>{counts.completed}</b><span>Hoàn thành</span></div><div className="u"><b>{counts.in_progress}</b><span>Đang thực hiện</span></div><div className="u"><b className="dl">{counts.late}</b><span>Quá hạn</span></div><div className="u"><b className="dw">{counts.pending_approval}</b><span>Chờ duyệt</span></div><div className="grow"><span className="tiny muted">Tiến độ chung {leaves.length ? Math.round(counts.completed / leaves.length * 100) : 0}%</span><div className="bar"><i style={{ width: `${leaves.length ? counts.completed / leaves.length * 100 : 0}%`, background: 'var(--st-done)' }} /></div></div></div>
    {unreadActivityCount > 0 && <button className="activity-unread-note" onClick={() => { const first = items.find((item) => item.has_unseen_activity); if (first) openExisting(first) }}><span className="activity-pulse" aria-hidden="true" /><span><b>{unreadActivityCount} công việc có diễn biến mới</b><small>Bấm để mở công việc đầu tiên chưa xem.</small></span><strong>Xem ngay →</strong></button>}
    <div className="tbar"><div><input type="search" placeholder="Tìm đầu việc…" value={query} onChange={(event) => setQuery(event.target.value)} /><select aria-label="Lọc theo đơn vị chủ trì" value={leadFilter} onChange={(event) => setLeadFilter(event.target.value)}><option value="">Tất cả đơn vị chủ trì</option>{leads.map((lead) => <option key={lead.id} value={lead.id}>{lead.code}</option>)}</select><StatusFilter value="" active={filter === ''} count={leaves.length} label="Tất cả" onClick={() => setFilter('')} />{(['not_started','in_progress','pending_approval','completed','late'] as const).map((state) => <StatusFilter key={state} value={state} active={filter === state} count={counts[state]} label={state === 'late' ? 'Quá hạn' : labels[state]} onClick={() => setFilter(filter === state ? '' : state)} />)}</div><div><div className="seg">{(['day','week','month'] as const).map((value) => <button key={value} className={zoom === value ? 'on' : ''} onClick={() => setZoom(value)}>{value === 'day' ? 'Ngày' : value === 'week' ? 'Tuần' : 'Tháng'}</button>)}</div><button className="btn" onClick={scrollToday}>Hôm nay</button><button className="btn" onClick={() => setCollapsed(new Set(items.filter((item) => children.get(item.id)?.length).map((item) => item.id)))}>Thu gọn tất cả</button><button className="btn" onClick={() => void exportProject(project, items).catch((caught) => setError(caught instanceof Error ? caught.message : 'Không xuất được Excel.'))}>Xuất Excel</button>{profile.role === 'manager' && <button className="btn" onClick={() => setShowImport(true)}>Nạp Excel</button>}<span style={{ flex: 1 }} />{profile.role === 'manager' && <button className="btn pri" onClick={() => openDraft(null)}>+ Hạng mục</button>}</div></div>
    {loading ? <div className="card empty">Đang tải tiến độ…</div> : <div className="tt"><div className="trow thead"><div className="lft"><div className="cell c-wbs">Mã</div><div className="cell c-name">Hạng mục công việc</div><div className="cell c-lead">Chủ trì</div><div className="cell c-d">Bắt đầu</div><div className="cell c-d">Kết thúc</div><div className="cell c-n">Số ngày</div><div className="cell c-st">Trạng thái</div><div className="cell c-act" /></div><TimelineHeader start={startDate} end={endDate} width={width} pixelsPerDay={pixelsPerDay} zoom={zoom} milestones={milestones} /></div>{flatRows.map((item) => {
      const ownChildren = children.get(item.id) ?? []
      const span = ownChildren.length ? spanOf(item, items) : { start: item.start_date, end: item.end_date }
      const state = aggregateStatus(item, items, children)
      const left = span.start ? dayDiff(startDate, span.start) * pixelsPerDay : 0
      const barWidth = span.start && span.end ? Math.max(3, (dayDiff(span.start, span.end) + 1) * pixelsPerDay) : 0
      return <div className={`trow ${ownChildren.length ? 'g' : ''} ${selected === item.id ? 'sel' : ''}`} key={item.id} onClick={() => openExisting(item)}><div className="lft"><div className="cell c-wbs">{ownChildren.length > 0 && <button className="exp" onClick={(event) => { event.stopPropagation(); toggle(item.id) }}>{collapsed.has(item.id) ? '▶' : '▼'}</button>}{shortWbs(item.wbs)}</div><div className="cell c-name" style={{ paddingLeft: 8 + depth(item, items) * 12 }}>{item.has_unseen_activity && <span className="activity-new-badge" title="Có diễn biến mới" aria-label="Có diễn biến mới"><i className="activity-pulse" aria-hidden="true" />Mới</span>}{item.name}</div><div className="cell c-lead" title={responsibilityLabel(item)}>{item.lead_department?.name || '—'}</div><div className="cell c-d">{date(span.start)}</div><div className="cell c-d">{date(span.end)}</div><div className="cell c-n">{span.start && span.end ? dayDiff(span.start, span.end) + 1 : '—'}</div><div className="cell c-st"><span className={`pill ${classes[state]}`}><i />{state === 'late' ? 'Quá hạn' : labels[state]}</span></div><div className="cell c-act">{profile.role === 'manager' && <button className="rowbtn" onClick={(event) => { event.stopPropagation(); openDraft(item) }}>+</button>}</div></div><div className="time" style={{ width, backgroundImage: `repeating-linear-gradient(90deg,var(--line-2) 0 1px,transparent 1px ${7 * pixelsPerDay}px)` }}>{barWidth > 0 && <div className={`gbar ${ownChildren.length ? 'pbar' : ''}`} style={{ left, width: barWidth, background: ownChildren.length ? undefined : statusColor(state) }}>{item.has_unseen_activity && <span className="gantt-activity-pulse" />}<span className="gbar-label">{item.name}</span></div>}<TodayLine start={startDate} pixelsPerDay={pixelsPerDay} /></div></div>
    })}{!flatRows.length && <div className="empty">Không có đầu việc nào khớp bộ lọc.</div>}</div>}
    {(draftItem ?? selectedItem) && <WorkDrawer key={`${(draftItem ?? selectedItem)!.id}-${(draftItem ?? selectedItem)!.version}-${(draftItem ?? selectedItem)!.attachment?.id ?? ''}`} item={(draftItem ?? selectedItem)!} items={items} users={users} departments={departments} profile={profile} isNew={Boolean(draftItem)} tab={drawerTab} onTabChange={setDrawerTab} onClose={closeDrawer} onCreated={created} onAddChild={openDraft} onChanged={load} onError={setError} onDirtyChange={reportDirty} />}
    {showImport && <ExcelImportModal onClose={() => setShowImport(false)} onImport={async (imported) => { await importProjectPlan(project.id, imported); await load() }} />}
  </>
}

function CloneModal({ sources, sourceId, startDate, onSourceChange, onStartChange, onClose, onClone }: { sources: Project[]; sourceId: string; startDate: string; onSourceChange: (value: string) => void; onStartChange: (value: string) => void; onClose: () => void; onClone: () => Promise<void> }) {
  return <div className="modal on" role="dialog" aria-modal="true" aria-label="Nhân bản bộ hạng mục"><div className="mbox"><header><h2>Nhân bản bộ hạng mục</h2><button className="btn" onClick={onClose}>✕</button></header><div className="mbody">{sources.length ? <><label className="f"><span>Lấy từ dự án</span><select value={sourceId} onChange={(event) => onSourceChange(event.target.value)}>{sources.map((source) => <option value={source.id} key={source.id}>{source.name}</option>)}</select></label><label className="f"><span>Ngày bắt đầu của dự án mới</span><input type="date" value={startDate} onChange={(event) => onStartChange(event.target.value)} /></label><div className="note">Ngày kế hoạch được dịch theo ngày bắt đầu mới. Trạng thái, bằng chứng, người tham gia và diễn biến không nhân bản.</div></> : <div className="empty">Chưa có dự án nào khác có tiến độ để nhân bản.</div>}</div><footer className="mfoot"><button className="btn" onClick={onClose}>Hủy</button><button className="btn pri" disabled={!sourceId || !startDate} onClick={() => void onClone()}>Nhân bản</button></footer></div></div>
}

function WorkDrawer({ item, items, users, departments, profile, isNew, tab, onTabChange, onClose, onCreated, onAddChild, onChanged, onError, onDirtyChange }: { item: WorkItem; items: WorkItem[]; users: UserProfile[]; departments: Department[]; profile: Profile; isNew: boolean; tab: DrawerTab; onTabChange: (tab: DrawerTab) => void; onClose: () => void; onCreated: (id: string) => Promise<void>; onAddChild: (parent: WorkItem) => void; onChanged: () => Promise<void>; onError: (message: string | null) => void; onDirtyChange: (dirty: boolean) => void }) {
  const initialForm = () => ({ name: item.name, leadDepartmentId: item.lead_department_id ?? '', coordinatingDepartmentIds: item.coordinating_department_ids, startDate: item.start_date ?? '', endDate: item.end_date ?? '', status: item.status, participantIds: item.participant_ids })
  const [form, setForm] = useState(initialForm)
  const [updates, setUpdates] = useState<ProgressUpdate[]>([])
  const [note, setNote] = useState('')
  const [pendingRequest, setPendingRequest] = useState<CompletionRequest | null>(null)
  const [reviewNote, setReviewNote] = useState('')
  const [approvalLoading, setApprovalLoading] = useState(profile.role === 'manager' && item.status === 'pending_approval')
  const [busy, setBusy] = useState(false)
  const confirm = useConfirm()
  const hasChildren = items.some((candidate) => candidate.parent_id === item.id)
  const isGroup = item.parent_id === null || hasChildren
  const displayedStatus = aggregateStatus(item, items, groupByParent(items))
  const canUpdate = profile.role === 'manager' || item.participant_ids.includes(profile.id)
  const isEvidenceLocked = !isNew && (item.status === 'pending_approval' || item.status === 'completed')
  const canEditInfo = profile.role === 'manager'
  const canManageEvidence = canUpdate && !isEvidenceLocked
  const canLogProgress = canUpdate
  const progressLockReason = !canUpdate
    ? (isGroup ? 'Nhân viên chỉ ghi diễn biến tại công việc chi tiết được phân công.' : 'Bạn chỉ có quyền xem công việc này. Quản trị viên cần thêm bạn vào danh sách người tham gia để cập nhật.')
    : null
  const dirty = isNew || JSON.stringify(form) !== JSON.stringify(initialForm())
  useEffect(() => {
    if (isNew) return
    void getProgressUpdates(item.id).then(setUpdates)
  }, [isNew, item.id])
  useEffect(() => {
    if (profile.role !== 'manager' || item.status !== 'pending_approval') return
    let active = true
    void getPendingRequests().then((requests) => { if (active) setPendingRequest(requests.find((request) => request.work_item_id === item.id) ?? null) }).catch(() => { if (active) onError('Không tải được yêu cầu chờ duyệt của công việc.') }).finally(() => { if (active) setApprovalLoading(false) })
    return () => { active = false }
  }, [item.id, item.status, onError, profile.role])
  useEffect(() => { onDirtyChange(dirty) }, [dirty, onDirtyChange])
  const run = async (action: () => Promise<void>, after?: () => void) => { setBusy(true); onError(null); try { await action(); after?.(); await onChanged() } catch (caught) { onError(caught instanceof Error ? caught.message : 'Không thực hiện được thao tác.') } finally { setBusy(false) } }
  const requestClose = async () => { if (dirty && !await confirm({ title: 'Bỏ thay đổi chưa lưu?', message: isNew ? 'Hạng mục/công việc mới chưa được lưu. Đóng panel sẽ bỏ bản nháp này.' : 'Panel đang có thay đổi chưa lưu. Đóng panel sẽ bỏ các thay đổi.', confirmLabel: 'Đóng và bỏ', tone: 'danger' })) return; onClose() }
  const switchTab = async (next: DrawerTab) => { if (next === tab) return; if (dirty && !await confirm({ title: 'Chuyển tab?', message: 'Các thay đổi chưa lưu trong tab Thông tin sẽ bị bỏ.', confirmLabel: 'Chuyển tab', tone: 'danger' })) return; onTabChange(next) }
  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (!form.name.trim()) { onError('Tên hạng mục/công việc không được để trống.'); return }
    if (form.startDate && form.endDate && form.endDate < form.startDate) { onError('Ngày kết thúc phải từ ngày bắt đầu trở đi.'); return }
    setBusy(true); onError(null)
    try {
      if (isNew) {
        const id = await createWorkItem({ projectId: item.project_id, parentId: item.parent_id, wbs: item.wbs, ...form })
        await onCreated(id)
      } else {
        await saveWorkItem(item, form)
        await onChanged()
      }
    } catch (caught) { onError(caught instanceof Error ? caught.message : 'Không lưu được hạng mục/công việc.') } finally { setBusy(false) }
  }
  const addChild = async () => { if (dirty && !await confirm({ title: 'Thêm công việc con?', message: 'Các thay đổi chưa lưu trên panel hiện tại sẽ bị bỏ trước khi mở công việc con mới.', confirmLabel: 'Tiếp tục', tone: 'danger' })) return; onAddChild(item) }
  const deleteCurrent = async () => { if (await confirm({ title: `Xóa ${isGroup ? 'hạng mục' : 'công việc'}?`, message: `${item.name}${hasChildren ? ' và toàn bộ công việc con bên trong' : ''} sẽ bị xóa. Không thể xóa nếu bên trong có bằng chứng đã nộp.`, confirmLabel: 'Xóa', tone: 'danger' })) await run(() => removeWorkItem(item.id), onClose) }
  const deleteEvidence = async () => { if (!canManageEvidence) { onError('Bằng chứng đã nộp được khóa và không thể xóa.'); return } if (item.attachment && await confirm({ title: 'Xóa tệp bằng chứng?', message: `${item.attachment.file_name} sẽ bị xóa khỏi công việc. Thao tác này không thể hoàn tác.`, confirmLabel: 'Xóa tệp', tone: 'danger' })) await run(() => removeEvidence(item.attachment!)) }
  const decide = async (decision: 'approved' | 'rejected') => {
    if (!pendingRequest) return
    if (decision === 'rejected' && !reviewNote.trim()) { onError('Từ chối phải nhập lý do.'); return }
    await run(() => reviewRequest(pendingRequest.id, decision, reviewNote), () => onTabChange('evidence'))
  }
  return <><aside className="drawer on" aria-label={isNew ? `Thêm ${isGroup ? 'hạng mục' : 'công việc'}` : 'Chi tiết công việc'}><div id="dwrap"><div className="dhead"><div style={{ flex: 1 }}><div className="eyebrow">{isGroup ? 'Hạng mục' : 'Công việc'} · {item.wbs}</div><h2>{isNew ? `Thêm ${isGroup ? 'hạng mục' : 'công việc'} mới` : item.name}</h2>{isNew ? <span className="tiny unsaved">Chưa lưu — chỉ nút Lưu mới ghi vào tiến độ</span> : <span className={`pill ${classes[displayedStatus]}`}><i />{displayedStatus === 'late' ? 'Quá hạn' : labels[displayedStatus]}</span>}</div><button className="btn" aria-label="Đóng panel" onClick={() => void requestClose()}>✕</button></div><div className="dtabs"><button className={tab === 'info' ? 'on' : ''} onClick={() => void switchTab('info')}>Thông tin</button>{!isNew && (!isGroup || item.attachment) && <button className={tab === 'evidence' ? 'on' : ''} onClick={() => void switchTab('evidence')}>Bằng chứng <span className="cnt">{item.attachment ? 1 : 0}</span></button>}{!isNew && <button className={tab === 'log' ? 'on' : ''} onClick={() => void switchTab('log')}>Diễn biến <span className="cnt">{updates.length}</span></button>}{!isNew && profile.role === 'manager' && item.status === 'pending_approval' && <button className={`approval-tab ${tab === 'approval' ? 'on' : ''}`} onClick={() => void switchTab('approval')}>Xét duyệt <span className="cnt">1</span></button>}</div><div className="dbody">
    {tab === 'info' && <><form className="sec" onSubmit={(event) => void submit(event)}><h3>Thông tin {isGroup ? 'hạng mục' : 'công việc'}</h3><div className="fg"><label className="f wide"><span>{isGroup ? 'Tên hạng mục' : 'Tên công việc'}</span><textarea autoFocus={isNew} disabled={!canEditInfo} value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></label><label className="f wide"><span>Đơn vị chủ trì</span><select disabled={!canEditInfo} value={form.leadDepartmentId} onChange={(event) => setForm({ ...form, leadDepartmentId: event.target.value, coordinatingDepartmentIds: form.coordinatingDepartmentIds.filter((id) => id !== event.target.value) })}><option value="">Chưa chọn đơn vị chủ trì</option>{departments.map((department) => <option key={department.id} value={department.id}>{department.code} — {department.name}</option>)}</select></label><DepartmentMultiSelect departments={departments} disabled={!canEditInfo} leadDepartmentId={form.leadDepartmentId} selectedIds={form.coordinatingDepartmentIds} onChange={(coordinatingDepartmentIds) => setForm({ ...form, coordinatingDepartmentIds })} />{!isGroup && <><label className="f"><span>Bắt đầu</span><input disabled={!canEditInfo} type="date" value={form.startDate} onChange={(event) => setForm({ ...form, startDate: event.target.value })} /></label><label className="f"><span>Kết thúc</span><input disabled={!canEditInfo} type="date" value={form.endDate} onChange={(event) => setForm({ ...form, endDate: event.target.value })} /></label></>}{!isGroup && profile.role === 'manager' && <label className="f wide"><span>Trạng thái</span><select disabled={!canEditInfo} value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value as WorkItemStatus })}><option value="not_started">Chưa thực hiện</option><option value="in_progress">Đang thực hiện</option><option value="pending_approval" disabled>Chờ duyệt</option><option value="completed" disabled>Hoàn thành qua duyệt</option></select></label>}{!isGroup && profile.role === 'manager' && <ParticipantMultiSelect users={users} disabled={!canEditInfo} selectedIds={form.participantIds} onChange={(participantIds) => setForm({ ...form, participantIds })} />}</div>{isGroup && <div className="note" style={{ marginTop: 10 }}>Ngày và trạng thái của hạng mục tự tính từ các công việc con.</div>}{canEditInfo && <div className="row2" style={{ marginTop: 10 }}><button className="btn pri" disabled={busy || !form.name.trim()}>{busy ? 'Đang lưu…' : isNew ? `Lưu ${isGroup ? 'hạng mục' : 'công việc'}` : 'Lưu thay đổi'}</button>{dirty && !isNew && <span className="tiny unsaved">Có thay đổi chưa lưu</span>}</div>}</form>{profile.role === 'manager' && <div className="sec"><h3>Thao tác</h3>{isNew ? <><button className="btn dgr" onClick={() => void requestClose()}>Hủy bỏ, không thêm nữa</button><div className="tiny muted" style={{ marginTop: 8 }}>Bản nháp này chưa được ghi vào database.</div></> : <div className="row2"><button className="btn" onClick={() => void addChild()}>+ Công việc con</button><button className="btn dgr" onClick={() => void deleteCurrent()}>Xóa</button></div>}</div>}</>}
    {tab === 'evidence' && (!isGroup || item.attachment) && <><div className="sec"><h3>Tài liệu bằng chứng ({item.attachment ? 1 : 0})</h3>{isEvidenceLocked && <div className="note">Bằng chứng đã nộp được khóa để phục vụ xét duyệt và truy vết. Bạn vẫn có thể mở xem nhưng không thể thay hoặc xóa tệp.</div>}{item.attachment ? <div className="evi"><span className="ic">FILE</span><button className="t" onClick={() => void viewEvidence(item.attachment!)}>{item.attachment.file_name}</button><button disabled={!canManageEvidence} title={isEvidenceLocked ? 'Bằng chứng đã được khóa' : undefined} aria-label="Xóa tệp bằng chứng" onClick={() => void deleteEvidence()}>✕</button></div> : canManageEvidence && !isGroup ? <label className="drop">Bấm để chọn tệp bằng chứng<input hidden type="file" onChange={(event) => { const file = event.target.files?.[0]; if (file) void run(() => uploadEvidence(item.id, file, profile.id)) }} /></label> : <div className="tiny muted">Chưa có bằng chứng.</div>}</div>{canManageEvidence && !isGroup && <div className="sec"><h3>Gửi hoàn thành</h3><div className="f"><label><span>Ghi chú gửi duyệt</span><textarea value={note} onChange={(event) => setNote(event.target.value)} /></label></div><div className="row2" style={{ marginTop: 9 }}><button className="btn ok" disabled={busy || !item.attachment} onClick={() => void run(() => requestCompletion(item.id, note))}>Gửi quản trị viên duyệt</button>{!item.attachment && <span className="tiny muted">Cần đúng 1 tài liệu bằng chứng</span>}</div></div>}</>}
    {tab === 'log' && <div className="sec"><h3>Diễn biến công việc ({updates.length})</h3>{updates.length ? <div className="log">{updates.map((update) => <div className="li" key={update.id}><div className="dot" /><div><div className="m">{dateTime(update.created_at)} · {update.author?.full_name || update.author?.username}</div><p>{update.content}</p></div></div>)}</div> : <div className="tiny muted">Chưa có diễn biến nào.</div>}{canLogProgress ? <><div className="f" style={{ marginTop: 10 }}><label><span>Ghi diễn biến mới</span><textarea value={note} onChange={(event) => setNote(event.target.value)} placeholder="Hiện trường hôm nay thế nào? Vướng gì?" /></label></div><button className="btn pri" disabled={!note.trim() || busy} style={{ marginTop: 8 }} onClick={() => void run(async () => { await addProgress(item.id, note, profile.id); await markWorkItemActivitySeen(item.id, profile.id); setNote(''); setUpdates(await getProgressUpdates(item.id)) })}>Ghi diễn biến</button></> : <div className="note" style={{ marginTop: 10 }}>{progressLockReason}</div>}</div>}
    {tab === 'approval' && profile.role === 'manager' && item.status === 'pending_approval' && <div className="sec approval-panel"><h3>Xét duyệt hoàn thành</h3>{approvalLoading ? <div className="tiny muted">Đang tải yêu cầu chờ duyệt…</div> : pendingRequest ? <><div className="approval-request"><span>Người gửi</span><b>{pendingRequest.submitter?.full_name || pendingRequest.submitter?.username || '—'}</b><span>Thời gian gửi</span><b>{dateTime(pendingRequest.submitted_at)}</b><span>Lần gửi</span><b>{pendingRequest.attempt_no}</b><span>Ghi chú</span><p>{pendingRequest.note || 'Không có ghi chú'}</p></div>{item.attachment && <div className="approval-evidence"><span className="tiny muted">Bằng chứng kèm theo</span><button className="btn" onClick={() => void viewEvidence(item.attachment!)}>Xem {item.attachment.file_name}</button></div>}<label className="f"><span>Nhận xét / lý do từ chối</span><textarea value={reviewNote} onChange={(event) => setReviewNote(event.target.value)} placeholder="Bắt buộc nhập khi từ chối" /></label><div className="approval-panel-actions"><button className="btn dgr" disabled={busy} onClick={() => void decide('rejected')}>{busy ? 'Đang xử lý…' : 'Từ chối'}</button><button className="btn ok" disabled={busy} onClick={() => void decide('approved')}>{busy ? 'Đang xử lý…' : 'Duyệt hoàn thành'}</button></div><div className="tiny muted">Yêu cầu này vẫn đồng thời xuất hiện tại màn Chờ duyệt của quản trị viên.</div></> : <div className="note warn">Yêu cầu có thể vừa được quản trị viên khác xử lý. Hãy tải lại dữ liệu.</div>}</div>}
  </div></div></aside><div className="scrim on" onClick={() => void requestClose()} /></>
}

function TimelineHeader({ start, end, width, pixelsPerDay, zoom, milestones }: { start: string; end: string; width: number; pixelsPerDay: number; zoom: 'day' | 'week' | 'month'; milestones: Milestone[] }) {
  const months: { label: string; left: number; width: number }[] = []
  let cursor = new Date(`${start}T00:00:00`); const last = new Date(`${end}T00:00:00`)
  while (cursor <= last) { const monthStart = new Date(cursor.getFullYear(), cursor.getMonth(), 1); const monthEnd = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0); const visibleStart = monthStart < new Date(`${start}T00:00:00`) ? new Date(`${start}T00:00:00`) : monthStart; const visibleEnd = monthEnd > last ? last : monthEnd; months.push({ label: `Tháng ${cursor.getMonth() + 1}/${cursor.getFullYear()}`, left: dayDiff(start, iso(visibleStart)) * pixelsPerDay, width: (dayDiff(iso(visibleStart), iso(visibleEnd)) + 1) * pixelsPerDay }); cursor = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1) }
  const steps = zoom === 'day' ? 1 : 7
  return <div className="time" style={{ width }}>{months.map((month) => <div className="mo" key={month.label} style={{ left: month.left, width: month.width }}>{month.label}</div>)}{zoom !== 'month' && Array.from({ length: Math.ceil((dayDiff(start, end) + 1) / steps) }, (_, index) => { const value = new Date(new Date(`${start}T00:00:00`).getTime() + index * steps * 86_400_000); return <div className="dy" key={index} style={{ left: index * steps * pixelsPerDay, width: steps * pixelsPerDay }}>{zoom === 'day' ? value.getDate() : `${value.getDate()}/${value.getMonth() + 1}`}</div> })}{milestones.filter((item) => item.due_date >= start && item.due_date <= end).map((item) => { const state = item.achieved ? 'Đã đạt' : item.due_date < today() ? 'Quá hạn chưa đạt' : 'Chưa đến hạn'; return <div key={item.id} className={`mk ${item.achieved ? 'ok' : item.due_date < today() ? 'bad' : ''}`} style={{ left: dayDiff(start, item.due_date) * pixelsPerDay }} tabIndex={0} aria-label={`Mốc ${item.name}, hạn ${date(item.due_date)}, ${state}`}><i className="mk-diamond" /><div className="mk-tooltip" role="tooltip"><b>{item.name}</b><span><strong>Ngày phải đạt:</strong> {date(item.due_date)}</span><span><strong>Đơn vị chủ trì:</strong> {item.owner_text || 'Chưa xác định'}</span>{item.condition_text && <span><strong>Điều kiện:</strong> {item.condition_text}</span>}<em className={item.achieved ? 'done' : item.due_date < today() ? 'late' : ''}>{state}</em></div></div> })}<TodayLine start={start} pixelsPerDay={pixelsPerDay} label /></div>
}
function TodayLine({ start, pixelsPerDay, label = false }: { start: string; pixelsPerDay: number; label?: boolean }) { const left = dayDiff(start, today()) * pixelsPerDay; return <>{left >= 0 && <div className="now" style={{ left }} />}{label && left >= 0 && <div className="nowlab" style={{ left }}>{new Date().getDate()}/{new Date().getMonth() + 1}</div>}</> }
function StatusFilter({ active, count, label, onClick }: { value: string; active: boolean; count: number; label: string; onClick: () => void }) { return <button className={`fchip ${active ? 'on' : ''}`} onClick={onClick}>{label} {count}</button> }
function groupByParent(items: WorkItem[]) { const result = new Map<string, WorkItem[]>(); items.forEach((item) => { if (!item.parent_id) return; result.set(item.parent_id, [...(result.get(item.parent_id) ?? []), item]) }); return result }
function makeDraft(projectId: string, parent: WorkItem | null, items: WorkItem[]): WorkItem {
  const siblings = items.filter((item) => item.parent_id === (parent?.id ?? null))
  const next = siblings.length + 1
  const timestamp = new Date().toISOString()
  return {
    id: `draft-${crypto.randomUUID()}`,
    project_id: projectId,
    parent_id: parent?.id ?? null,
    wbs: parent ? `${parent.wbs}.${next}` : roman(next),
    name: parent ? 'Công việc mới' : 'HẠNG MỤC MỚI',
    source_responsibility_text: parent?.source_responsibility_text ?? null,
    lead_department_id: parent?.lead_department_id ?? null,
    lead_department: parent?.lead_department ?? null,
    coordinating_department_ids: parent?.coordinating_department_ids ?? [],
    coordinating_departments: parent?.coordinating_departments ?? [],
    start_date: parent ? today() : null,
    end_date: parent ? today() : null,
    status: 'not_started',
    sort_order: items.reduce((max, item) => Math.max(max, item.sort_order), -1) + 1,
    version: 1,
    created_at: timestamp,
    updated_at: timestamp,
    participant_ids: [],
    attachment: null,
    has_unseen_activity: false,
  }
}
function flatten(items: WorkItem[], children: Map<string, WorkItem[]>, collapsed: Set<string>) { const result: WorkItem[] = []; const visit = (item: WorkItem) => { result.push(item); if (!collapsed.has(item.id)) (children.get(item.id) ?? []).forEach(visit) }; items.filter((item) => !item.parent_id).forEach(visit); return result }
function descendants(id: string, items: WorkItem[]): WorkItem[] { const direct = items.filter((item) => item.parent_id === id); return direct.flatMap((item) => [item, ...descendants(item.id, items)]) }
function spanOf(item: WorkItem, items: WorkItem[]) { const nodes = descendants(item.id, items); return { start: minDate(nodes.map((node) => node.start_date)), end: maxDate(nodes.map((node) => node.end_date)) } }
function depth(item: WorkItem, items: WorkItem[]) { let result = 0; let parent = item.parent_id; while (parent) { result += 1; parent = items.find((candidate) => candidate.id === parent)?.parent_id ?? null } return result }
function liveStatus(item: WorkItem): WorkItemStatus | 'late' { return item.status !== 'completed' && item.status !== 'pending_approval' && item.end_date && item.end_date < today() ? 'late' : item.status }
function aggregateStatus(item: WorkItem, items: WorkItem[], children: Map<string, WorkItem[]>): WorkItemStatus | 'late' {
  const ownChildren = children.get(item.id) ?? []
  if (!ownChildren.length) return liveStatus(item)
  const leafStates = descendants(item.id, items).filter((node) => !(children.get(node.id)?.length)).map(liveStatus)
  if (leafStates.length && leafStates.every((state) => state === 'completed')) return 'completed'
  if (leafStates.includes('pending_approval')) return 'pending_approval'
  if (leafStates.includes('late')) return 'late'
  if (leafStates.some((state) => state === 'in_progress' || state === 'completed')) return 'in_progress'
  return 'not_started'
}
function responsibilityLabel(item: WorkItem) {
  const lead = item.lead_department ? `Chủ trì: ${item.lead_department.code}` : 'Chưa chọn đơn vị chủ trì'
  const coordinating = item.coordinating_departments.length ? `Phối hợp: ${item.coordinating_departments.map((department) => department.code).join(', ')}` : 'Không có đơn vị phối hợp'
  return `${lead} · ${coordinating}`
}
function countStatuses(items: WorkItem[]) { const result = { not_started: 0, in_progress: 0, pending_approval: 0, completed: 0, late: 0 }; items.forEach((item) => { result[liveStatus(item)] += 1 }); return result }
function minDate(values: (string | null)[]) { return values.filter((value): value is string => Boolean(value)).sort()[0] ?? null }
function maxDate(values: (string | null)[]) { return values.filter((value): value is string => Boolean(value)).sort().at(-1) ?? null }
function dayDiff(start: string, end: string) { return Math.round((new Date(`${end}T00:00:00`).getTime() - new Date(`${start}T00:00:00`).getTime()) / 86_400_000) }
function shortWbs(value: string) { return value.split('.').at(-1) ?? value }
function statusColor(value: WorkItemStatus | 'late') { return ({ not_started: 'var(--st-todo)', in_progress: 'var(--st-doing)', pending_approval: 'var(--st-pending)', completed: 'var(--st-done)', late: 'var(--st-late)' })[value] }
function date(value: string | null) { return value ? new Intl.DateTimeFormat('vi-VN').format(new Date(`${value}T00:00:00`)) : '—' }
function dateTime(value: string) { return new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value)) }
function iso(value: Date) { return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}` }
function today() { return new Date().toISOString().slice(0, 10) }
function roman(value: number) { const pairs: [number, string][] = [[1000,'M'],[900,'CM'],[500,'D'],[400,'CD'],[100,'C'],[90,'XC'],[50,'L'],[40,'XL'],[10,'X'],[9,'IX'],[5,'V'],[4,'IV'],[1,'I']]; let rest=value; let result=''; for(const [amount,symbol] of pairs){while(rest>=amount){result+=symbol;rest-=amount}} return result }
