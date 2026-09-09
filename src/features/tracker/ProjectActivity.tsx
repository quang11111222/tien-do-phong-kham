import { useEffect, useState } from 'react'
import type { Project, ProjectActivity as Activity } from '../../types/domain'
import { getProjectActivity } from './trackerService'
import { ProjectHeader } from './ProjectHeader'

export function ProjectActivity({ project, onBack, onOpenGantt }: { project: Project; onBack: () => void; onOpenGantt: () => void }) {
  const [items, setItems] = useState<Activity[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  useEffect(() => { let active = true; void getProjectActivity(project.id).then((data) => { if (active) setItems(data) }).catch(() => { if (active) setError('Không tải được nhật ký diễn biến.') }).finally(() => { if (active) setLoading(false) }); return () => { active = false } }, [project.id])
  return <><ProjectHeader project={project} section="Nhật ký diễn biến" onBack={onBack} />{error && <div className="note warn">{error}</div>}<div className="card activity-card">{loading ? <div className="empty">Đang tải nhật ký…</div> : items.length ? <div className="log">{items.map((item) => <div className={`li activity-${item.kind}`} key={item.id}><div className="dot" /><div><div className="m">{dateTime(item.created_at)} · {item.actor_name} · <button className="activity-link" onClick={onOpenGantt}>{item.work_item_wbs}. {item.work_item_name}</button></div><p>{item.content}</p></div></div>)}</div> : <div className="empty"><h3>Chưa có diễn biến nào</h3><p>Nhật ký sẽ ghi các cập nhật tiến độ và vòng gửi duyệt của dự án.</p></div>}</div></>
}

function dateTime(value: string) { return new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value)) }
