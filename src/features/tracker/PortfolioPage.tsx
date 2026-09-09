import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import type { Project, WorkItem } from '../../types/domain'
import { getProjects, getWorkItems, saveProject, setProjectDeleted } from './trackerService'

interface ProjectRow { project: Project; items: WorkItem[] }
const emptyForm = { id: '', code: '', name: '', site: '', startDate: '', endDate: '' }

export function PortfolioPage({ isManager, onOpen }: { isManager: boolean; onOpen: (project: Project) => void }) {
  const [rows, setRows] = useState<ProjectRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [modalOpen, setModalOpen] = useState(false)
  const [showDeleted, setShowDeleted] = useState(false)
  const [busyProjectId, setBusyProjectId] = useState<string | null>(null)

  const fetchRows = useCallback(async () => {
    const projects = await getProjects(isManager)
    const activeProjects = projects.filter((project) => !project.deleted_at)
    const itemSets = await Promise.all(activeProjects.map((project) => getWorkItems(project.id)))
    const itemsByProject = new Map(activeProjects.map((project, index) => [project.id, itemSets[index]]))
    return projects.map((project) => ({ project, items: itemsByProject.get(project.id) ?? [] }))
  }, [isManager])

  useEffect(() => {
    let active = true
    void fetchRows().then((data) => { if (active) setRows(data) }).catch(() => { if (active) setError('Không tải được danh mục dự án.') }).finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [fetchRows])

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (form.startDate && form.endDate && form.endDate < form.startDate) {
      setError('Hạn hoàn thành phải từ ngày bắt đầu trở đi.')
      return
    }
    try {
      setError(null)
      await saveProject({ ...form, id: form.id || undefined })
      setModalOpen(false)
      setForm(emptyForm)
      setRows(await fetchRows())
    } catch {
      setError('Không lưu được dự án. Kiểm tra dữ liệu và mã dự án bị trùng.')
    }
  }

  const changeDeleted = async (project: Project, deleted: boolean) => {
    const question = deleted
      ? `Xóa dự án ${project.name}? Dự án sẽ ẩn khỏi danh sách sử dụng nhưng toàn bộ tiến độ và nhật ký vẫn được giữ để có thể khôi phục.`
      : `Khôi phục dự án ${project.name} về danh sách đang theo dõi?`
    if (!window.confirm(question)) return
    try {
      setError(null)
      setBusyProjectId(project.id)
      await setProjectDeleted(project.id, deleted)
      setRows(await fetchRows())
    } catch {
      setError(deleted ? 'Không xóa được dự án.' : 'Không khôi phục được dự án.')
    } finally {
      setBusyProjectId(null)
    }
  }

  const activeRows = useMemo(() => rows.filter((row) => !row.project.deleted_at), [rows])
  const deletedRows = useMemo(() => rows.filter((row) => row.project.deleted_at), [rows])
  const displayedRows = showDeleted ? deletedRows : activeRows
  const detailed = activeRows.filter((row) => leafItems(row.items).length > 0)
  const lateProjects = activeRows.filter((row) => leafItems(row.items).some(isLate)).length
  const noDeadline = activeRows.filter((row) => !row.project.end_date).length

  return <>
    <div className="ovhead"><div><div className="eyebrow">Quản lý khảo sát mặt bằng</div><h1>Danh mục dự án phòng khám</h1><p className="tiny muted">Theo dõi tiến độ toàn bộ dự án phòng khám do Phòng PTPK làm đầu mối.</p></div>{isManager && <div className="row2"><button className="btn pri" onClick={() => { setForm(emptyForm); setModalOpen(true) }}>+ Thêm dự án</button></div>}</div>
    {error && <div className="note warn offline">{error}</div>}
    <div className="stats"><div className="stat"><b>{activeRows.length}</b><span>Dự án đang theo dõi</span></div><div className={`stat ${lateProjects ? 'hi' : ''}`}><b>{lateProjects}</b><span>Dự án có việc trễ hạn</span></div><div className="stat"><b>{activeRows.length - detailed.length}</b><span>Chưa lập tiến độ chi tiết</span></div><div className="stat"><b>{noDeadline}</b><span>Chưa chốt hạn hoàn thành</span></div></div>
    {isManager && <div className="project-list-tabs" role="tablist" aria-label="Trạng thái dự án"><button role="tab" aria-selected={!showDeleted} className={`btn ${!showDeleted ? 'pri' : ''}`} onClick={() => setShowDeleted(false)}>Đang theo dõi ({activeRows.length})</button><button role="tab" aria-selected={showDeleted} className={`btn ${showDeleted ? 'pri' : ''}`} onClick={() => setShowDeleted(true)}>Đã xóa ({deletedRows.length})</button></div>}
    <div className="card project-table-wrap">{loading ? <div className="empty">Đang tải dự án…</div> : displayedRows.length ? <table className="ptab"><thead><tr><th>Dự án</th><th>Địa điểm</th><th>Bắt đầu</th><th>Hạn hoàn thành</th><th>{showDeleted ? 'Đã xóa lúc' : 'Còn lại'}</th><th>Tiến độ</th><th>Trễ</th>{isManager && <th />}</tr></thead><tbody>{displayedRows.map(({ project, items }) => {
      const tasks = leafItems(items)
      const done = tasks.filter((item) => item.status === 'completed').length
      const late = tasks.filter(isLate).length
      const pct = tasks.length ? Math.round(done / tasks.length * 100) : 0
      return <tr className={showDeleted ? 'deleted-project-row' : ''} key={project.id} onClick={() => { if (!showDeleted) onOpen(project) }}><td><span className="pname">{project.name}</span><span className="pcode">{project.code}</span></td><td>{project.site || '—'}</td><td className="num">{date(project.start_date)}</td><td className="num">{project.end_date ? date(project.end_date) : 'chưa chốt'}</td><td className="num">{showDeleted ? dateTime(project.deleted_at) : remaining(project.end_date)}</td><td>{showDeleted ? 'Đang ẩn' : tasks.length ? <><span className="mini"><i style={{ width: `${pct}%` }} /></span>{pct}% · {done}/{tasks.length}</> : 'Chưa lập tiến độ'}</td><td className={late ? 'dl' : ''}>{showDeleted ? '—' : late}</td>{isManager && <td><div className="rowact">{showDeleted ? <button className="btn sm" disabled={busyProjectId === project.id} onClick={(event) => { event.stopPropagation(); void changeDeleted(project, false) }}>{busyProjectId === project.id ? 'Đang xử lý…' : 'Khôi phục'}</button> : <><button className="btn sm" onClick={(event) => { event.stopPropagation(); setForm({ id: project.id, code: project.code, name: project.name, site: project.site ?? '', startDate: project.start_date ?? '', endDate: project.end_date ?? '' }); setModalOpen(true) }}>Sửa</button><button className="btn dgr sm" disabled={busyProjectId === project.id} onClick={(event) => { event.stopPropagation(); void changeDeleted(project, true) }}>{busyProjectId === project.id ? 'Đang xóa…' : 'Xóa'}</button></>}</div></td>}</tr>
    })}</tbody></table> : <div className="empty"><h3>{showDeleted ? 'Chưa có dự án đã xóa' : 'Chưa có dự án'}</h3><p>{showDeleted ? 'Dự án xóa mềm sẽ xuất hiện tại đây để sếp có thể khôi phục.' : 'Sếp có thể thêm dự án mới để bắt đầu lập tiến độ.'}</p></div>}</div>
    {isManager && <div className="note" style={{ marginTop: 12 }}><b>Xóa dự án</b> là xóa mềm: dự án bị ẩn khỏi người dùng nhưng dữ liệu tiến độ, bằng chứng và nhật ký không bị mất. Sếp có thể khôi phục trong mục <b>Đã xóa</b>.</div>}
    <div className={`modal ${modalOpen ? 'on' : ''}`}><form className="mbox" onSubmit={(event) => void submit(event)}><header><h2>{form.id ? 'Sửa dự án' : 'Thêm dự án'}</h2><button type="button" className="btn" onClick={() => setModalOpen(false)}>✕</button></header><div className="mbody"><div className="fg"><label className="f"><span>Mã dự án</span><input required value={form.code} onChange={(event) => setForm({ ...form, code: event.target.value })} /></label><label className="f"><span>Tên dự án</span><input required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></label><label className="f wide"><span>Địa điểm</span><input value={form.site} onChange={(event) => setForm({ ...form, site: event.target.value })} /></label><label className="f"><span>Bắt đầu</span><input type="date" value={form.startDate} onChange={(event) => setForm({ ...form, startDate: event.target.value })} /></label><label className="f"><span>Hạn hoàn thành</span><input type="date" min={form.startDate || undefined} value={form.endDate} onChange={(event) => setForm({ ...form, endDate: event.target.value })} /></label></div></div><footer className="mfoot"><button type="button" className="btn" onClick={() => setModalOpen(false)}>Hủy</button><button className="btn pri">Lưu dự án</button></footer></form></div>
  </>
}

function leafItems(items: WorkItem[]) { const parentIds = new Set(items.map((item) => item.parent_id).filter(Boolean)); return items.filter((item) => !parentIds.has(item.id)) }
function date(value: string | null) { return value ? new Intl.DateTimeFormat('vi-VN').format(new Date(`${value}T00:00:00`)) : '—' }
function dateTime(value: string | null) { return value ? new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value)) : '—' }
function remaining(value: string | null) { if (!value) return '—'; const today = new Date(); today.setHours(0, 0, 0, 0); const days = Math.round((new Date(`${value}T00:00:00`).getTime() - today.getTime()) / 86_400_000); return days < 0 ? `${Math.abs(days)} ngày trễ` : days === 0 ? 'Hôm nay' : `${days} ngày` }
function isLate(item: WorkItem) { return Boolean(item.status !== 'completed' && item.status !== 'pending_approval' && item.end_date && item.end_date < new Date().toISOString().slice(0, 10)) }
