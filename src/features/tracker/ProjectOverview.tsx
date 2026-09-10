import { useEffect, useMemo, useState } from 'react'
import type { Project, WorkItem } from '../../types/domain'
import { getWorkItems } from './trackerService'
import { ProjectHeader } from './ProjectHeader'
import { useAutoRefresh } from '../../lib/useAutoRefresh'

export function ProjectOverview({ project, onBack, onOpenWork }: { project: Project; onBack: () => void; onOpenWork: (workItemId: string) => void }) {
  const [items, setItems] = useState<WorkItem[]>([])
  const [loading, setLoading] = useState(true)
  useEffect(() => { let active = true; void getWorkItems(project.id).then((data) => { if (active) setItems(data) }).finally(() => { if (active) setLoading(false) }); return () => { active = false } }, [project.id])
  useAutoRefresh(() => getWorkItems(project.id).then(setItems))
  const childIds = useMemo(() => new Set(items.map((item) => item.parent_id).filter((value): value is string => Boolean(value))), [items])
  const leaves = items.filter((item) => !childIds.has(item.id))
  const groups = items.filter((item) => !item.parent_id)
  const statusSegments = buildStatusSegments(leaves)
  const done = statusSegments.find((segment) => segment.key === 'completed')!.count
  const doing = statusSegments.find((segment) => segment.key === 'in_progress')!.count
  const pending = statusSegments.find((segment) => segment.key === 'pending_approval')!.count
  const late = leaves.filter(isLate)
  const upcoming = leaves.filter((item) => item.status !== 'completed' && item.status !== 'pending_approval' && item.end_date && dayDiff(today(), item.end_date) >= 0 && dayDiff(today(), item.end_date) <= 14).sort((a, b) => (a.end_date ?? '').localeCompare(b.end_date ?? ''))
  return <><ProjectHeader project={project} section="Tổng quan dự án" onBack={onBack} />{loading ? <div className="card empty">Đang tải tổng quan…</div> : !items.length ? <EmptyOverview onOpenWork={() => onOpenWork('')} /> : <><div className="stats overview-stats"><Stat value={leaves.length} label="Đầu việc chi tiết" /><Stat value={groups.length} label="Hạng mục" /><Stat value={done} label="Hoàn thành" /><Stat value={doing} label="Đang thực hiện" /><Stat value={pending} label="Chờ duyệt" /><div className={`stat ${late.length ? 'hi' : ''}`}><b>{late.length}</b><span>Trễ hạn</span></div><Stat value={`${leaves.length ? Math.round(done / leaves.length * 100) : 0}%`} label="Tỷ lệ hoàn thành" /></div><StatusChart segments={statusSegments} total={leaves.length} /><div className="secthead"><h2>Cần xử lý</h2><span className="tiny muted">{late.length + upcoming.length} việc trễ hoặc đến hạn trong 14 ngày</span></div><div className="card overview-list">{[...late, ...upcoming].length ? [...late, ...upcoming].slice(0, 14).map((item) => <button key={item.id} className="ai" onClick={() => onOpenWork(item.id)}><span className={`pill ${isLate(item) ? 'p-late' : 'p-doing'}`}><i />{isLate(item) ? 'Trễ hạn' : 'Sắp đến hạn'}</span><span><span className="nm">{item.name}</span><span className="sb">{item.lead_department ? `Chủ trì: ${item.lead_department.code}` : 'Chưa chọn đơn vị chủ trì'}{item.coordinating_departments.length ? ` · Phối hợp: ${item.coordinating_departments.map((department) => department.code).join(', ')}` : ''}</span></span><span className="rt">{item.end_date ? date(item.end_date) : '—'}</span></button>) : <div className="empty">Không có việc nào cần xử lý gấp.</div>}</div><div className="secthead"><h2>Hạng mục công việc</h2><span className="tiny muted">{groups.length} hạng mục</span></div><div className="grpgrid">{groups.map((group) => { const descendants = descendantLeaves(group.id, items, childIds); const completed = descendants.filter((item) => item.status === 'completed').length; return <button className="grpc" key={group.id} onClick={() => onOpenWork(group.id)}><b>{group.wbs}. {group.name}</b><div className="m"><span>{completed}/{descendants.length} việc</span><span>{span(descendants)}</span></div><div className="overview-group-progress" aria-hidden="true"><i style={{ width: `${descendants.length ? completed / descendants.length * 100 : 0}%` }} /></div></button> })}</div></>}</>
}

type StatusSegment = { key: 'completed' | 'in_progress' | 'pending_approval' | 'not_started' | 'late'; label: string; count: number; color: string }

function StatusChart({ segments, total }: { segments: StatusSegment[]; total: number }) {
  const completed = segments.find((segment) => segment.key === 'completed')!.count
  const attention = segments.find((segment) => segment.key === 'late')!.count + segments.find((segment) => segment.key === 'pending_approval')!.count
  let cursor = 0
  const stops = segments.map((segment) => { const start = cursor; cursor += total ? segment.count / total * 360 : 0; return `${segment.color} ${start}deg ${cursor}deg` })
  const background = total ? `conic-gradient(${stops.join(', ')})` : 'var(--line-2)'
  const summary = segments.filter((segment) => segment.count).map((segment) => `${segment.label}: ${segment.count}`).join(', ')
  return <section className="card overview-chart-card" aria-labelledby="overview-status-title"><div className="overview-chart-heading"><div className="eyebrow">Cơ cấu tiến độ</div><h2 id="overview-status-title">Trạng thái công việc</h2><p>Chỉ tính các công việc cuối nhánh để không cộng trùng hạng mục cha.</p></div><div className="overview-chart-visual"><div className="overview-donut" style={{ background }} role="img" aria-label={summary}><div><b>{total ? Math.round(completed / total * 100) : 0}%</b><span>hoàn thành</span></div></div><div className="overview-chart-legend">{segments.map((segment) => <div key={segment.key}><i style={{ background: segment.color }} /><span>{segment.label}</span><b>{segment.count}</b><small>{total ? Math.round(segment.count / total * 100) : 0}%</small></div>)}</div></div><div className="overview-chart-summary"><div><span>Tổng công việc</span><b>{total}</b></div><div><span>Còn chưa hoàn thành</span><b>{total - completed}</b></div><div className={attention ? 'needs-attention' : ''}><span>Cần chú ý</span><b>{attention}</b><small>Quá hạn + chờ duyệt</small></div></div></section>
}

function EmptyOverview({ onOpenWork }: { onOpenWork: () => void }) { return <div className="card empty"><h3>Dự án này chưa có tiến độ chi tiết</h3><p>Hãy thiết lập bộ hạng mục trước khi xem tổng quan.</p><button className="btn pri" onClick={onOpenWork}>Thiết lập tiến độ</button></div> }
function Stat({ value, label }: { value: string | number; label: string }) { return <div className="stat"><b>{value}</b><span>{label}</span></div> }
function isLate(item: WorkItem) { return Boolean(item.status !== 'completed' && item.status !== 'pending_approval' && item.end_date && item.end_date < today()) }
function buildStatusSegments(items: WorkItem[]): StatusSegment[] {
  const count = (key: StatusSegment['key']) => items.filter((item) => key === 'late' ? isLate(item) : !isLate(item) && item.status === key).length
  return [
    { key: 'completed', label: 'Hoàn thành', count: count('completed'), color: 'var(--st-done)' },
    { key: 'in_progress', label: 'Đang thực hiện', count: count('in_progress'), color: 'var(--st-doing)' },
    { key: 'pending_approval', label: 'Chờ duyệt', count: count('pending_approval'), color: 'var(--st-pending)' },
    { key: 'not_started', label: 'Chưa thực hiện', count: count('not_started'), color: 'var(--st-todo)' },
    { key: 'late', label: 'Quá hạn', count: count('late'), color: 'var(--st-late)' },
  ]
}
function today() { return new Date().toISOString().slice(0, 10) }
function dayDiff(start: string, end: string) { return Math.round((new Date(`${end}T00:00:00`).getTime() - new Date(`${start}T00:00:00`).getTime()) / 86_400_000) }
function date(value: string) { return new Intl.DateTimeFormat('vi-VN').format(new Date(`${value}T00:00:00`)) }
function descendantLeaves(id: string, items: WorkItem[], childIds: Set<string>): WorkItem[] { const all: WorkItem[] = items.filter((item) => item.parent_id === id).flatMap((item): WorkItem[] => [item, ...descendantLeaves(item.id, items, childIds)]); return all.filter((item) => !childIds.has(item.id)) }
function span(items: WorkItem[]) { const starts = items.map((item) => item.start_date).filter((value): value is string => Boolean(value)).sort(); const ends = items.map((item) => item.end_date).filter((value): value is string => Boolean(value)).sort(); return starts.length && ends.length ? `${date(starts[0])} – ${date(ends.at(-1)!)} ` : 'Chưa có ngày' }
