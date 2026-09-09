import { useEffect, useMemo, useState } from 'react'
import type { Project, WorkItem } from '../../types/domain'
import { getWorkItems } from './trackerService'
import { ProjectHeader } from './ProjectHeader'

export function ProjectOverview({ project, onBack, onOpenWork }: { project: Project; onBack: () => void; onOpenWork: () => void }) {
  const [items, setItems] = useState<WorkItem[]>([])
  const [loading, setLoading] = useState(true)
  useEffect(() => { let active = true; void getWorkItems(project.id).then((data) => { if (active) setItems(data) }).finally(() => { if (active) setLoading(false) }); return () => { active = false } }, [project.id])
  const childIds = useMemo(() => new Set(items.map((item) => item.parent_id).filter((value): value is string => Boolean(value))), [items])
  const leaves = items.filter((item) => !childIds.has(item.id))
  const groups = items.filter((item) => !item.parent_id)
  const done = leaves.filter((item) => item.status === 'completed').length
  const doing = leaves.filter((item) => item.status === 'in_progress').length
  const pending = leaves.filter((item) => item.status === 'pending_approval').length
  const late = leaves.filter(isLate)
  const upcoming = leaves.filter((item) => item.status !== 'completed' && item.status !== 'pending_approval' && item.end_date && dayDiff(today(), item.end_date) >= 0 && dayDiff(today(), item.end_date) <= 14).sort((a, b) => (a.end_date ?? '').localeCompare(b.end_date ?? ''))
  return <><ProjectHeader project={project} section="Tổng quan dự án" onBack={onBack} />{loading ? <div className="card empty">Đang tải tổng quan…</div> : !items.length ? <EmptyOverview onOpenWork={onOpenWork} /> : <><div className="stats overview-stats"><Stat value={leaves.length} label="Đầu việc chi tiết" /><Stat value={groups.length} label="Hạng mục" /><Stat value={done} label="Hoàn thành" /><Stat value={doing} label="Đang thực hiện" /><Stat value={pending} label="Chờ duyệt" /><div className={`stat ${late.length ? 'hi' : ''}`}><b>{late.length}</b><span>Trễ hạn</span></div><Stat value={`${leaves.length ? Math.round(done / leaves.length * 100) : 0}%`} label="Tỷ lệ hoàn thành" /></div><div className="secthead"><h2>Cần xử lý</h2><span className="tiny muted">{late.length + upcoming.length} việc trễ hoặc đến hạn trong 14 ngày</span></div><div className="card overview-list">{[...late, ...upcoming].length ? [...late, ...upcoming].slice(0, 14).map((item) => <button key={item.id} className="ai" onClick={onOpenWork}><span className={`pill ${isLate(item) ? 'p-late' : 'p-doing'}`}><i />{isLate(item) ? 'Trễ hạn' : 'Sắp đến hạn'}</span><span><span className="nm">{item.name}</span><span className="sb">{item.source_responsibility_text || 'Chưa gán đơn vị'}</span></span><span className="rt">{item.end_date ? date(item.end_date) : '—'}</span></button>) : <div className="empty">Không có việc nào cần xử lý gấp.</div>}</div><div className="secthead"><h2>Hạng mục công việc</h2><span className="tiny muted">{groups.length} hạng mục</span></div><div className="grpgrid">{groups.map((group) => { const descendants = descendantLeaves(group.id, items, childIds); const completed = descendants.filter((item) => item.status === 'completed').length; return <button className="grpc" key={group.id} onClick={onOpenWork}><b>{group.wbs}. {group.name}</b><div className="m"><span>{completed}/{descendants.length} việc</span><span>{span(descendants)}</span></div></button> })}</div></>}</>
}

function EmptyOverview({ onOpenWork }: { onOpenWork: () => void }) { return <div className="card empty"><h3>Dự án này chưa có tiến độ chi tiết</h3><p>Hãy thiết lập bộ hạng mục trước khi xem tổng quan.</p><button className="btn pri" onClick={onOpenWork}>Thiết lập tiến độ</button></div> }
function Stat({ value, label }: { value: string | number; label: string }) { return <div className="stat"><b>{value}</b><span>{label}</span></div> }
function isLate(item: WorkItem) { return Boolean(item.status !== 'completed' && item.status !== 'pending_approval' && item.end_date && item.end_date < today()) }
function today() { return new Date().toISOString().slice(0, 10) }
function dayDiff(start: string, end: string) { return Math.round((new Date(`${end}T00:00:00`).getTime() - new Date(`${start}T00:00:00`).getTime()) / 86_400_000) }
function date(value: string) { return new Intl.DateTimeFormat('vi-VN').format(new Date(`${value}T00:00:00`)) }
function descendantLeaves(id: string, items: WorkItem[], childIds: Set<string>): WorkItem[] { const all: WorkItem[] = items.filter((item) => item.parent_id === id).flatMap((item): WorkItem[] => [item, ...descendantLeaves(item.id, items, childIds)]); return all.filter((item) => !childIds.has(item.id)) }
function span(items: WorkItem[]) { const starts = items.map((item) => item.start_date).filter((value): value is string => Boolean(value)).sort(); const ends = items.map((item) => item.end_date).filter((value): value is string => Boolean(value)).sort(); return starts.length && ends.length ? `${date(starts[0])} – ${date(ends.at(-1)!)} ` : 'Chưa có ngày' }
