import type { Project } from '../../types/domain'

export function ProjectHeader({ project, section, onBack, onEdit }: { project: Project; section: string; onBack: () => void; onEdit?: () => void }) {
  return <div className="ovhead"><div><div className="crumb"><button onClick={onBack}>Danh mục dự án</button><span>›</span><span>{section}</span></div><h1>{project.name}</h1><p className="tiny muted">{project.site || 'Chưa cập nhật địa điểm'}{project.start_date ? ` · ${date(project.start_date)} – ${project.end_date ? date(project.end_date) : 'chưa chốt hạn'}` : ''}</p></div><div className="row2"><span className="chip">{project.code}</span>{onEdit && <button className="btn" onClick={onEdit}>Sửa dự án</button>}</div></div>
}

function date(value: string) { return new Intl.DateTimeFormat('vi-VN').format(new Date(`${value}T00:00:00`)) }
