import { useEffect, useMemo, useState, type FormEvent } from 'react'
import type { Profile, Project, ProjectActivity as Activity, WorkItem } from '../../types/domain'
import { addProgress, getProjectActivity, getWorkItems, markProjectActivitySeen, markWorkItemActivitySeen } from './trackerService'
import { ProjectHeader } from './ProjectHeader'
import { useAutoRefresh } from '../../lib/useAutoRefresh'

type ActivityFilter = 'all' | 'progress' | 'approval' | 'deleted'

export function ProjectActivity({ project, profile, canViewDeleteAudit, onBack, onOpenGantt, onSeen }: { project: Project; profile: Profile; canViewDeleteAudit: boolean; onBack: () => void; onOpenGantt: (workItemId: string) => void; onSeen: () => void }) {
  const [items, setItems] = useState<Activity[]>([])
  const [workItems, setWorkItems] = useState<WorkItem[]>([])
  const [workItemId, setWorkItemId] = useState('')
  const [content, setContent] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [filter, setFilter] = useState<ActivityFilter>('all')

  const loadData = async () => {
    const [activity, tasks] = await Promise.all([getProjectActivity(project.id, canViewDeleteAudit), getWorkItems(project.id)])
    setItems(activity)
    setWorkItems(tasks)
  }

  useEffect(() => {
    let active = true
    void Promise.all([getProjectActivity(project.id, canViewDeleteAudit), getWorkItems(project.id), markProjectActivitySeen(project.id, profile.id)])
      .then(([activity, tasks]) => { if (!active) return; setItems(activity); setWorkItems(tasks); onSeen() })
      .catch(() => { if (active) setError('Không tải được nhật ký diễn biến.') })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [project.id, profile.id, canViewDeleteAudit, onSeen])
  useAutoRefresh(async () => { await loadData(); await markProjectActivitySeen(project.id, profile.id); onSeen() }, { enabled: !saving })

  const writableItems = useMemo(() => {
    const parentIds = new Set(workItems.map((item) => item.parent_id).filter((id): id is string => Boolean(id)))
    return workItems.filter((item) => item.parent_id !== null && !parentIds.has(item.id) && item.status !== 'pending_approval' && item.status !== 'completed' && (profile.role === 'manager' || item.participant_ids.includes(profile.id)))
  }, [profile.id, profile.role, workItems])
  const activityCounts = useMemo(() => ({
    all: items.length,
    progress: items.filter((item) => item.kind === 'progress').length,
    approval: items.filter((item) => ['submitted', 'approved', 'rejected'].includes(item.kind)).length,
    deleted: items.filter((item) => item.kind === 'deleted').length,
  }), [items])
  const visibleItems = useMemo(() => items.filter((item) => filter === 'all' || (filter === 'approval' ? ['submitted', 'approved', 'rejected'].includes(item.kind) : item.kind === filter)), [filter, items])

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (!workItemId || !content.trim()) return
    setSaving(true)
    setError(null)
    setSuccess(null)
    try {
      await addProgress(workItemId, content, profile.id)
      await markWorkItemActivitySeen(workItemId, profile.id)
      setContent('')
      setSuccess('Đã ghi diễn biến mới vào công việc.')
      await loadData()
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'Không ghi được diễn biến.') }
    finally { setSaving(false) }
  }

  return <><ProjectHeader project={project} section="Nhật ký diễn biến" onBack={onBack} />
    <div className="activity-layout">
      <form className="card activity-compose" onSubmit={(event) => void submit(event)}>
        <div><p className="eyebrow">CẬP NHẬT TIẾN ĐỘ</p><h2>Ghi diễn biến mới</h2><p className="tiny muted">Chọn công việc cần cập nhật. Diễn biến mới sẽ được lưu kèm người nhập và thời gian.</p></div>
        <label className="f"><span>Công việc</span><select required disabled={loading} value={workItemId} onChange={(event) => setWorkItemId(event.target.value)}><option value="">{loading ? 'Đang tải danh sách công việc…' : 'Chọn công việc…'}</option>{writableItems.map((item) => <option key={item.id} value={item.id}>{item.wbs}. {item.name}</option>)}</select></label>
        <label className="f"><span>Nội dung diễn biến</span><textarea required disabled={loading} value={content} onChange={(event) => setContent(event.target.value)} placeholder="Tiến độ hiện tại, kết quả đã làm, vướng mắc hoặc đề xuất xử lý…" /></label>
        {error && <div className="note warn">{error}</div>}{success && <div className="note success-note">{success}</div>}
        {loading ? <div className="note">Đang tải danh sách công việc có thể cập nhật…</div> : writableItems.length ? <button className="btn pri" disabled={saving || !workItemId || !content.trim()}>{saving ? 'Đang ghi…' : 'Ghi diễn biến'}</button> : <div className="note">{profile.role === 'manager' ? 'Không có công việc đang mở để cập nhật.' : 'Bạn chưa được phân công công việc đang mở nào. Quản trị viên cần thêm bạn vào danh sách người tham gia.'}</div>}
      </form>
      <div className="card activity-card"><div className="activity-list-heading"><div><h2>Lịch sử dự án</h2><span className="tiny muted">{items.length} hoạt động</span></div></div><div className="activity-filters" role="tablist" aria-label="Lọc lịch sử dự án"><button role="tab" aria-selected={filter === 'all'} className={filter === 'all' ? 'on' : ''} onClick={() => setFilter('all')}>Tất cả <b>{activityCounts.all}</b></button><button role="tab" aria-selected={filter === 'progress'} className={filter === 'progress' ? 'on' : ''} onClick={() => setFilter('progress')}>Diễn biến <b>{activityCounts.progress}</b></button><button role="tab" aria-selected={filter === 'approval'} className={filter === 'approval' ? 'on' : ''} onClick={() => setFilter('approval')}>Gửi &amp; xét duyệt <b>{activityCounts.approval}</b></button>{canViewDeleteAudit && <button role="tab" aria-selected={filter === 'deleted'} className={filter === 'deleted' ? 'on audit-filter' : 'audit-filter'} onClick={() => setFilter('deleted')}>Đã xóa <b>{activityCounts.deleted}</b></button>}</div>{loading ? <div className="empty">Đang tải nhật ký…</div> : visibleItems.length ? <div className="log">{visibleItems.map((item) => <div className={`li activity-${item.kind}`} key={item.id}><div className="dot" /><div><div className="m">{dateTime(item.created_at)} · {item.actor_name} · {item.kind === 'deleted' ? <strong className="activity-deleted-name">{item.work_item_wbs}. {item.work_item_name}</strong> : <button className="activity-link" onClick={() => onOpenGantt(item.work_item_id)}>{item.work_item_wbs}. {item.work_item_name}</button>}</div><p>{item.content}</p></div></div>)}</div> : <div className="empty"><h3>Không có dữ liệu thuộc loại này</h3><p>{filter === 'deleted' ? 'Các lần xóa hạng mục hoặc công việc sẽ được lưu tại đây.' : 'Chọn loại khác để xem các hoạt động đã ghi nhận.'}</p></div>}</div>
    </div>
  </>
}

function dateTime(value: string) { return new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value)) }
