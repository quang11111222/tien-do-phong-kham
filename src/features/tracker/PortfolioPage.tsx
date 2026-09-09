import { useEffect, useState, type FormEvent } from 'react'
import type { Project, WorkItem } from '../../types/domain'
import { archiveProject, getProjects, getWorkItems, saveProject } from './trackerService'

interface ProjectRow { project: Project; items: WorkItem[] }
const emptyForm = { id: '', code: '', name: '', site: '', startDate: '', endDate: '' }

export function PortfolioPage({ isManager, onOpen }: { isManager: boolean; onOpen: (project: Project) => void }) {
  const [rows, setRows] = useState<ProjectRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [modalOpen, setModalOpen] = useState(false)

  const load = async () => { const projects = await getProjects(); const items = await Promise.all(projects.map((project) => getWorkItems(project.id))); setRows(projects.map((project, index) => ({ project, items: items[index] }))) }
  useEffect(() => { let active = true; void getProjects().then(async (projects) => ({ projects, items: await Promise.all(projects.map((project) => getWorkItems(project.id))) })).then(({ projects, items }) => { if (active) setRows(projects.map((project, index) => ({ project, items: items[index] }))) }).catch(() => { if (active) setError('Không tải được danh mục dự án.') }).finally(() => { if (active) setLoading(false) }); return () => { active = false } }, [])

  const submit = async (event: FormEvent) => { event.preventDefault(); try { await saveProject({ ...form, id: form.id || undefined }); setModalOpen(false); setForm(emptyForm); await load() } catch { setError('Không lưu được dự án. Kiểm tra mã dự án bị trùng.') } }
  const detailed = rows.filter((row) => row.items.some((item) => item.parent_id))
  const lateProjects = rows.filter((row) => row.items.some((item) => isLate(item))).length
  const noDeadline = rows.filter((row) => !row.project.end_date).length

  return <>
    <div className="ovhead"><div><div className="eyebrow">Quản lý khảo sát mặt bằng</div><h1>Danh mục dự án phòng khám</h1><p className="tiny muted">Theo dõi tiến độ toàn bộ dự án phòng khám do Phòng PTPK làm đầu mối.</p></div>{isManager && <div className="row2"><button className="btn pri" onClick={() => { setForm(emptyForm); setModalOpen(true) }}>+ Thêm dự án</button></div>}</div>
    {error && <div className="note warn offline">{error}</div>}
    <div className="stats"><div className="stat"><b>{rows.length}</b><span>Dự án đang theo dõi</span></div><div className={`stat ${lateProjects ? 'hi' : ''}`}><b>{lateProjects}</b><span>Dự án có việc trễ hạn</span></div><div className="stat"><b>{rows.length - detailed.length}</b><span>Chưa lập tiến độ chi tiết</span></div><div className="stat"><b>{noDeadline}</b><span>Chưa chốt hạn hoàn thành</span></div></div>
    <div className="card">{loading ? <div className="empty">Đang tải dự án…</div> : <table className="ptab"><thead><tr><th>Dự án</th><th>Địa điểm</th><th>Bắt đầu</th><th>Hạn hoàn thành</th><th>Còn lại</th><th>Tiến độ</th><th>Trễ</th>{isManager && <th />}</tr></thead><tbody>{rows.map(({ project, items }) => {
      const parentIds = new Set(items.map((item) => item.parent_id).filter(Boolean))
      const tasks = items.filter((item) => !parentIds.has(item.id))
      const done = tasks.filter((item) => item.status === 'completed').length
      const late = tasks.filter(isLate).length
      const pct = tasks.length ? Math.round(done / tasks.length * 100) : 0
      return <tr key={project.id} onClick={() => onOpen(project)}><td><span className="pname">{project.name}</span><span className="pcode">{project.code}</span></td><td>{project.site || '—'}</td><td className="num">{date(project.start_date)}</td><td className="num">{project.end_date ? date(project.end_date) : 'chưa chốt'}</td><td className="num">{remaining(project.end_date)}</td><td>{tasks.length ? <><span className="mini"><i style={{ width: `${pct}%` }} /></span>{pct}% · {done}/{tasks.length}</> : 'Chưa lập tiến độ'}</td><td className={late ? 'dl' : ''}>{late}</td>{isManager && <td><div className="rowact"><button className="btn sm" onClick={(event) => { event.stopPropagation(); setForm({ id: project.id, code: project.code, name: project.name, site: project.site ?? '', startDate: project.start_date ?? '', endDate: project.end_date ?? '' }); setModalOpen(true) }}>Sửa</button><button className="btn sm" onClick={(event) => { event.stopPropagation(); if (window.confirm(`Lưu trữ dự án ${project.name}?`)) void archiveProject(project.id).then(load) }}>Lưu trữ</button></div></td>}</tr>
    })}</tbody></table>}</div>
    <div className="note" style={{ marginTop: 12 }}>Dự án đã kết thúc thì <b>Lưu trữ</b>, không xoá — giữ nguyên tiến độ và nhật ký để đối chiếu về sau.</div>
    <div className={`modal ${modalOpen ? 'on' : ''}`}><form className="mbox" onSubmit={(event) => void submit(event)}><header><h2>{form.id ? 'Sửa dự án' : 'Thêm dự án'}</h2><button type="button" className="btn" onClick={() => setModalOpen(false)}>✕</button></header><div className="mbody"><div className="fg"><label className="f"><span>Mã dự án</span><input required value={form.code} onChange={(event) => setForm({ ...form, code: event.target.value })} /></label><label className="f"><span>Tên dự án</span><input required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></label><label className="f wide"><span>Địa điểm</span><input value={form.site} onChange={(event) => setForm({ ...form, site: event.target.value })} /></label><label className="f"><span>Bắt đầu</span><input type="date" value={form.startDate} onChange={(event) => setForm({ ...form, startDate: event.target.value })} /></label><label className="f"><span>Hạn hoàn thành</span><input type="date" value={form.endDate} onChange={(event) => setForm({ ...form, endDate: event.target.value })} /></label></div></div><footer className="mfoot"><button type="button" className="btn" onClick={() => setModalOpen(false)}>Hủy</button><button className="btn pri">Lưu dự án</button></footer></form></div>
  </>
}

function date(value: string | null) { return value ? new Intl.DateTimeFormat('vi-VN').format(new Date(`${value}T00:00:00`)) : '—' }
function remaining(value: string | null) { if (!value) return '—'; const days = Math.ceil((new Date(`${value}T00:00:00`).getTime() - Date.now()) / 86_400_000); return days < 0 ? `${Math.abs(days)} ngày trễ` : `${days} ngày` }
function isLate(item: WorkItem) { return Boolean(item.parent_id && item.status !== 'completed' && item.status !== 'pending_approval' && item.end_date && item.end_date < new Date().toISOString().slice(0, 10)) }
