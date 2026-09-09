import { useEffect, useMemo, useState, type FormEvent } from 'react'
import type { Milestone, Profile, Project, ProgressUpdate, UserProfile, WorkItem, WorkItemStatus } from '../../types/domain'
import { addProgress, addWorkItem, getMilestones, getProgressUpdates, getUsers, getWorkItems, importProjectPlan, removeEvidence, removeWorkItem, requestCompletion, saveWorkItem, uploadEvidence, viewEvidence } from './trackerService'
import { exportProject } from './excelService'
import { ExcelImportModal } from './ExcelImportModal'

const labels: Record<WorkItemStatus, string> = { not_started: 'Chưa thực hiện', in_progress: 'Đang thực hiện', pending_approval: 'Chờ duyệt', completed: 'Hoàn thành' }
const classes: Record<WorkItemStatus | 'late', string> = { not_started: 'p-todo', in_progress: 'p-doing', pending_approval: 'p-pending', completed: 'p-done', late: 'p-late' }

export function GanttView({ project, profile }: { project: Project; profile: Profile }) {
  const [items, setItems] = useState<WorkItem[]>([])
  const [users, setUsers] = useState<UserProfile[]>([])
  const [milestones, setMilestones] = useState<Milestone[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<WorkItemStatus | 'late' | ''>('')
  const [zoom, setZoom] = useState<'day' | 'week' | 'month'>('week')
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())
  const [selected, setSelected] = useState<string | null>(null)
  const [showImport, setShowImport] = useState(false)

  const load = async () => { const [nextItems, nextUsers, nextMilestones] = await Promise.all([getWorkItems(project.id), getUsers(), getMilestones(project.id)]); setItems(nextItems); setUsers(nextUsers); setMilestones(nextMilestones) }
  useEffect(() => { let active = true; void Promise.all([getWorkItems(project.id), getUsers(), getMilestones(project.id)]).then(([nextItems, nextUsers, nextMilestones]) => { if (!active) return; setItems(nextItems); setUsers(nextUsers); setMilestones(nextMilestones) }).catch(() => { if (active) setError('Không tải được tiến độ dự án.') }).finally(() => { if (active) setLoading(false) }); return () => { active = false } }, [project.id])

  const children = useMemo(() => groupByParent(items), [items])
  const leaves = items.filter((item) => !(children.get(item.id)?.length))
  const counts = countStatuses(leaves)
  const startDate = minDate([project.start_date, ...leaves.map((item) => item.start_date), ...milestones.map((item) => item.due_date)]) || today()
  const endDate = maxDate([project.end_date, ...leaves.map((item) => item.end_date), ...milestones.map((item) => item.due_date)]) || startDate
  const pixelsPerDay = zoom === 'day' ? 22 : zoom === 'week' ? 7 : 3
  const totalDays = Math.max(1, dayDiff(startDate, endDate) + 1)
  const width = totalDays * pixelsPerDay
  const flatRows = flatten(items, children, collapsed).filter((item) => {
    const matchesText = !query || `${item.wbs} ${item.name} ${item.source_responsibility_text ?? ''}`.toLowerCase().includes(query.toLowerCase())
    const state = aggregateStatus(item, items, children)
    return matchesText && (!filter || state === filter)
  })
  const selectedItem = items.find((item) => item.id === selected) ?? null

  const toggle = (id: string) => setCollapsed((current) => { const next = new Set(current); if (next.has(id)) next.delete(id); else next.add(id); return next })
  const run = async (action: () => Promise<void>) => { setError(null); try { await action(); await load() } catch (caught) { setError(caught instanceof Error ? caught.message : 'Không thực hiện được thao tác.') } }

  return <>
    <div className="ovhead"><div><div className="crumb"><button>{project.name}</button><span>›</span><span>Tiến độ &amp; Gantt</span></div><h1>Tiến độ &amp; sơ đồ Gantt</h1><p className="tiny muted">{project.site} · {date(startDate)} → {date(endDate)}</p></div></div>
    {error && <div className="note warn offline">{error}</div>}
    <div className="sum"><div className="u"><b>{leaves.length}</b><span>Công việc</span></div><div className="u"><b>{counts.completed}</b><span>Hoàn thành</span></div><div className="u"><b>{counts.in_progress}</b><span>Đang thực hiện</span></div><div className="u"><b className="dl">{counts.late}</b><span>Quá hạn</span></div><div className="u"><b className="dw">{counts.pending_approval}</b><span>Chờ duyệt</span></div><div className="grow"><span className="tiny muted">Tiến độ chung {leaves.length ? Math.round(counts.completed / leaves.length * 100) : 0}%</span><div className="bar"><i style={{ width: `${leaves.length ? counts.completed / leaves.length * 100 : 0}%`, background: 'var(--st-done)' }} /></div></div></div>
    <div className="tbar"><div><input type="search" placeholder="Tìm đầu việc…" value={query} onChange={(event) => setQuery(event.target.value)} /><StatusFilter value="" active={filter === ''} count={leaves.length} label="Tất cả" onClick={() => setFilter('')} />{(['not_started','in_progress','pending_approval','completed','late'] as const).map((state) => <StatusFilter key={state} value={state} active={filter === state} count={counts[state]} label={state === 'late' ? 'Quá hạn' : labels[state]} onClick={() => setFilter(filter === state ? '' : state)} />)}</div><div><div className="seg">{(['day','week','month'] as const).map((value) => <button key={value} className={zoom === value ? 'on' : ''} onClick={() => setZoom(value)}>{value === 'day' ? 'Ngày' : value === 'week' ? 'Tuần' : 'Tháng'}</button>)}</div><button className="btn" onClick={() => setCollapsed(new Set(items.filter((item) => children.get(item.id)?.length).map((item) => item.id)))}>Thu gọn tất cả</button><button className="btn" onClick={() => void exportProject(project, items).catch((caught) => setError(caught instanceof Error ? caught.message : 'Không xuất được Excel.'))}>Xuất Excel</button>{profile.role === 'manager' && <button className="btn" onClick={() => setShowImport(true)}>Nạp Excel</button>}<span style={{ flex: 1 }} />{profile.role === 'manager' && <button className="btn pri" onClick={() => void run(() => addWorkItem(project.id, null, items))}>+ Hạng mục</button>}</div></div>
    {loading ? <div className="card empty">Đang tải tiến độ…</div> : <div className="tt"><div className="trow thead"><div className="lft"><div className="cell c-wbs">Mã</div><div className="cell c-name">Hạng mục công việc</div><div className="cell c-lead">Chủ trì</div><div className="cell c-d">Bắt đầu</div><div className="cell c-d">Kết thúc</div><div className="cell c-n">Số ngày</div><div className="cell c-st">Trạng thái</div><div className="cell c-act" /></div><TimelineHeader start={startDate} end={endDate} width={width} pixelsPerDay={pixelsPerDay} zoom={zoom} milestones={milestones} /></div>{flatRows.map((item) => {
      const ownChildren = children.get(item.id) ?? []
      const span = ownChildren.length ? spanOf(item, items) : { start: item.start_date, end: item.end_date }
      const state = aggregateStatus(item, items, children)
      const left = span.start ? dayDiff(startDate, span.start) * pixelsPerDay : 0
      const barWidth = span.start && span.end ? Math.max(3, (dayDiff(span.start, span.end) + 1) * pixelsPerDay) : 0
      return <div className={`trow ${ownChildren.length ? 'g' : ''} ${selected === item.id ? 'sel' : ''}`} key={item.id} onClick={() => setSelected(item.id)}><div className="lft"><div className="cell c-wbs">{ownChildren.length > 0 && <button className="exp" onClick={(event) => { event.stopPropagation(); toggle(item.id) }}>{collapsed.has(item.id) ? '▶' : '▼'}</button>}{shortWbs(item.wbs)}</div><div className="cell c-name" style={{ paddingLeft: 8 + depth(item, items) * 12 }}>{item.name}</div><div className="cell c-lead">{item.source_responsibility_text || '—'}</div><div className="cell c-d">{date(span.start)}</div><div className="cell c-d">{date(span.end)}</div><div className="cell c-n">{span.start && span.end ? dayDiff(span.start, span.end) + 1 : '—'}</div><div className="cell c-st"><span className={`pill ${classes[state]}`}><i />{state === 'late' ? 'Quá hạn' : labels[item.status]}</span></div><div className="cell c-act">{profile.role === 'manager' && <button className="rowbtn" onClick={(event) => { event.stopPropagation(); void run(() => addWorkItem(project.id, item, items)) }}>+</button>}</div></div><div className="time" style={{ width, backgroundImage: `repeating-linear-gradient(90deg,var(--line-2) 0 1px,transparent 1px ${7 * pixelsPerDay}px)` }}>{barWidth > 0 && <div className={`gbar ${ownChildren.length ? 'pbar' : ''}`} style={{ left, width: barWidth, background: ownChildren.length ? undefined : statusColor(state) }}>{barWidth > 75 && !ownChildren.length ? item.name : ''}</div>}<TodayLine start={startDate} pixelsPerDay={pixelsPerDay} /></div></div>
    })}{!flatRows.length && <div className="empty">Không có đầu việc nào khớp bộ lọc.</div>}</div>}
    {selectedItem && <WorkDrawer key={`${selectedItem.id}-${selectedItem.version}-${selectedItem.attachment?.id ?? ''}`} item={selectedItem} items={items} users={users} profile={profile} onClose={() => setSelected(null)} onChanged={load} onError={setError} />}
    {selectedItem && <div className="scrim on" onClick={() => setSelected(null)} />}
    {showImport && <ExcelImportModal onClose={() => setShowImport(false)} onImport={async (imported) => { await importProjectPlan(project.id, imported); await load() }} />}
  </>
}

function WorkDrawer({ item, items, users, profile, onClose, onChanged, onError }: { item: WorkItem; items: WorkItem[]; users: UserProfile[]; profile: Profile; onClose: () => void; onChanged: () => Promise<void>; onError: (message: string | null) => void }) {
  const [tab, setTab] = useState<'info' | 'evidence' | 'log'>('info')
  const [form, setForm] = useState({ name: item.name, responsibility: item.source_responsibility_text ?? '', startDate: item.start_date ?? '', endDate: item.end_date ?? '', status: item.status, participantIds: item.participant_ids })
  const [updates, setUpdates] = useState<ProgressUpdate[]>([])
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const hasChildren = items.some((candidate) => candidate.parent_id === item.id)
  const canUpdate = profile.role === 'manager' || item.participant_ids.includes(profile.id)
  useEffect(() => { void getProgressUpdates(item.id).then(setUpdates) }, [item.id])
  const run = async (action: () => Promise<void>, after?: () => void) => { setBusy(true); onError(null); try { await action(); after?.(); await onChanged() } catch (caught) { onError(caught instanceof Error ? caught.message : 'Không thực hiện được thao tác.') } finally { setBusy(false) } }
  const submit = (event: FormEvent) => { event.preventDefault(); void run(() => saveWorkItem(item, form)) }
  return <aside className="drawer on" aria-label="Chi tiết công việc"><div id="dwrap"><div className="dhead"><div style={{ flex: 1 }}><div className="eyebrow">{hasChildren ? 'Hạng mục' : 'Công việc'} · {item.wbs}</div><h2>{item.name}</h2><span className={`pill ${classes[liveStatus(item)]}`}><i />{liveStatus(item) === 'late' ? 'Quá hạn' : labels[item.status]}</span></div><button className="btn" onClick={onClose}>✕</button></div><div className="dtabs"><button className={tab === 'info' ? 'on' : ''} onClick={() => setTab('info')}>Thông tin</button>{!hasChildren && <button className={tab === 'evidence' ? 'on' : ''} onClick={() => setTab('evidence')}>Bằng chứng <span className="cnt">{item.attachment ? 1 : 0}</span></button>}<button className={tab === 'log' ? 'on' : ''} onClick={() => setTab('log')}>Diễn biến <span className="cnt">{updates.length}</span></button></div><div className="dbody">
    {tab === 'info' && <><form className="sec" onSubmit={submit}><h3>Thông tin công việc</h3><div className="fg"><label className="f wide"><span>{hasChildren ? 'Tên hạng mục' : 'Tên công việc'}</span><textarea disabled={profile.role !== 'manager'} value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></label><label className="f wide"><span>Đơn vị theo file nguồn</span><input disabled={profile.role !== 'manager'} value={form.responsibility} onChange={(event) => setForm({ ...form, responsibility: event.target.value })} /></label>{!hasChildren && <><label className="f"><span>Bắt đầu</span><input disabled={profile.role !== 'manager'} type="date" value={form.startDate} onChange={(event) => setForm({ ...form, startDate: event.target.value })} /></label><label className="f"><span>Kết thúc</span><input disabled={profile.role !== 'manager'} type="date" value={form.endDate} onChange={(event) => setForm({ ...form, endDate: event.target.value })} /></label></>}{!hasChildren && profile.role === 'manager' && <label className="f wide"><span>Trạng thái</span><select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value as WorkItemStatus })}><option value="not_started">Chưa thực hiện</option><option value="in_progress">Đang thực hiện</option><option value="pending_approval" disabled>Chờ duyệt</option><option value="completed" disabled>Hoàn thành qua duyệt</option></select></label>}</div>{!hasChildren && profile.role === 'manager' && <div className="sec" style={{ marginTop: 10 }}><h3>Người tham gia</h3><div className="ev">{users.map((user) => <label className="evi" key={user.id}><input type="checkbox" checked={form.participantIds.includes(user.id)} onChange={(event) => setForm({ ...form, participantIds: event.target.checked ? [...form.participantIds, user.id] : form.participantIds.filter((id) => id !== user.id) })} /><span><span className="t">{user.full_name}</span><span className="s">{user.department?.code || (user.role === 'manager' ? 'Sếp' : '—')}</span></span></label>)}</div></div>}{profile.role === 'manager' && <div className="row2" style={{ marginTop: 10 }}><button className="btn pri" disabled={busy}>Lưu thay đổi</button></div>}</form>{profile.role === 'manager' && <div className="sec"><h3>Thao tác</h3><div className="row2"><button className="btn" onClick={() => void run(() => addWorkItem(item.project_id, item, items))}>+ Công việc con</button><button className="btn dgr" onClick={() => { if (window.confirm(`Xóa ${item.name}${hasChildren ? ' và toàn bộ công việc con' : ''}?`)) void run(() => removeWorkItem(item.id), onClose) }}>Xóa</button></div></div>}</>}
    {tab === 'evidence' && !hasChildren && <><div className="sec"><h3>Tài liệu bằng chứng ({item.attachment ? 1 : 0})</h3>{item.attachment ? <div className="evi"><span className="ic">FILE</span><button className="t" onClick={() => void viewEvidence(item.attachment!)}>{item.attachment.file_name}</button><button disabled={!canUpdate} onClick={() => { if (window.confirm('Xóa tệp bằng chứng này?')) void run(() => removeEvidence(item.attachment!)) }}>✕</button></div> : canUpdate ? <label className="drop">Bấm để chọn tệp bằng chứng<input hidden type="file" onChange={(event) => { const file = event.target.files?.[0]; if (file) void run(() => uploadEvidence(item.id, file, profile.id)) }} /></label> : <div className="tiny muted">Chưa có bằng chứng.</div>}</div>{canUpdate && item.status !== 'pending_approval' && item.status !== 'completed' && <div className="sec"><h3>Gửi hoàn thành</h3><div className="f"><label><span>Ghi chú gửi duyệt</span><textarea value={note} onChange={(event) => setNote(event.target.value)} /></label></div><div className="row2" style={{ marginTop: 9 }}><button className="btn ok" disabled={busy || !item.attachment} onClick={() => void run(() => requestCompletion(item.id, note))}>Gửi sếp duyệt</button>{!item.attachment && <span className="tiny muted">Cần đúng 1 tài liệu bằng chứng</span>}</div></div>}</>}
    {tab === 'log' && <div className="sec"><h3>Diễn biến công việc ({updates.length})</h3>{updates.length ? <div className="log">{updates.map((update) => <div className="li" key={update.id}><div className="dot" /><div><div className="m">{dateTime(update.created_at)} · {update.author?.full_name || update.author?.username}</div><p>{update.content}</p></div></div>)}</div> : <div className="tiny muted">Chưa có diễn biến nào.</div>}{canUpdate && item.status !== 'pending_approval' && item.status !== 'completed' && <><div className="f" style={{ marginTop: 10 }}><label><span>Ghi diễn biến mới</span><textarea value={note} onChange={(event) => setNote(event.target.value)} placeholder="Hiện trường hôm nay thế nào? Vướng gì?" /></label></div><button className="btn pri" disabled={!note.trim() || busy} style={{ marginTop: 8 }} onClick={() => void run(async () => { await addProgress(item.id, note, profile.id); setNote(''); setUpdates(await getProgressUpdates(item.id)) })}>Ghi diễn biến</button></>}</div>}
  </div></div></aside>
}

function TimelineHeader({ start, end, width, pixelsPerDay, zoom, milestones }: { start: string; end: string; width: number; pixelsPerDay: number; zoom: 'day' | 'week' | 'month'; milestones: Milestone[] }) {
  const months: { label: string; left: number; width: number }[] = []
  let cursor = new Date(`${start}T00:00:00`); const last = new Date(`${end}T00:00:00`)
  while (cursor <= last) { const monthStart = new Date(cursor.getFullYear(), cursor.getMonth(), 1); const monthEnd = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0); const visibleStart = monthStart < new Date(`${start}T00:00:00`) ? new Date(`${start}T00:00:00`) : monthStart; const visibleEnd = monthEnd > last ? last : monthEnd; months.push({ label: `Tháng ${cursor.getMonth() + 1}/${cursor.getFullYear()}`, left: dayDiff(start, iso(visibleStart)) * pixelsPerDay, width: (dayDiff(iso(visibleStart), iso(visibleEnd)) + 1) * pixelsPerDay }); cursor = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1) }
  const steps = zoom === 'day' ? 1 : 7
  return <div className="time" style={{ width }}>{months.map((month) => <div className="mo" key={month.label} style={{ left: month.left, width: month.width }}>{month.label}</div>)}{zoom !== 'month' && Array.from({ length: Math.ceil((dayDiff(start, end) + 1) / steps) }, (_, index) => { const value = new Date(new Date(`${start}T00:00:00`).getTime() + index * steps * 86_400_000); return <div className="dy" key={index} style={{ left: index * steps * pixelsPerDay, width: steps * pixelsPerDay }}>{zoom === 'day' ? value.getDate() : `${value.getDate()}/${value.getMonth() + 1}`}</div> })}{milestones.filter((item) => item.due_date >= start && item.due_date <= end).map((item) => <div key={item.id} className={`mk ${item.achieved ? 'ok' : item.due_date < today() ? 'bad' : ''}`} style={{ left: dayDiff(start, item.due_date) * pixelsPerDay }} title={`${item.name} · ${date(item.due_date)}`} aria-label={`Mốc ${item.name}, ${date(item.due_date)}`} />)}<TodayLine start={start} pixelsPerDay={pixelsPerDay} label /></div>
}
function TodayLine({ start, pixelsPerDay, label = false }: { start: string; pixelsPerDay: number; label?: boolean }) { const left = dayDiff(start, today()) * pixelsPerDay; return <>{left >= 0 && <div className="now" style={{ left }} />}{label && left >= 0 && <div className="nowlab" style={{ left }}>{new Date().getDate()}/{new Date().getMonth() + 1}</div>}</> }
function StatusFilter({ active, count, label, onClick }: { value: string; active: boolean; count: number; label: string; onClick: () => void }) { return <button className={`fchip ${active ? 'on' : ''}`} onClick={onClick}>{label} {count}</button> }
function groupByParent(items: WorkItem[]) { const result = new Map<string, WorkItem[]>(); items.forEach((item) => { if (!item.parent_id) return; result.set(item.parent_id, [...(result.get(item.parent_id) ?? []), item]) }); return result }
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
