import { useEffect, useState } from 'react'
import type { Project } from '../../types/domain'
import { listProjects } from './projectService'

const statusLabels = {
  draft: 'Bản nháp',
  active: 'Đang theo dõi',
  completed: 'Hoàn thành',
  archived: 'Đã lưu trữ',
}

export function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    void listProjects()
      .then(setProjects)
      .catch(() => setError('Không tải được danh sách dự án. Vui lòng thử lại.'))
      .finally(() => setLoading(false))
  }, [])

  const activeCount = projects.filter((project) => project.status === 'active').length

  return (
    <section>
      <div className="page-heading">
        <div>
          <p className="eyebrow">QUẢN LÝ KHẢO SÁT MẶT BẰNG</p>
          <h1>Danh mục dự án phòng khám</h1>
          <p className="muted">Theo dõi toàn bộ dự án do Phòng PTPK làm đầu mối.</p>
        </div>
      </div>

      <div className="metric-grid">
        <article className="metric-card"><strong>{projects.length}</strong><span>Tổng dự án</span></article>
        <article className="metric-card"><strong>{activeCount}</strong><span>Đang theo dõi</span></article>
        <article className="metric-card"><strong>0</strong><span>Chờ duyệt</span></article>
      </div>

      <div className="content-card">
        {loading && <div className="state-message">Đang tải dự án…</div>}
        {error && <div className="alert error">{error}</div>}
        {!loading && !error && projects.length === 0 && (
          <div className="state-message">
            <h2>Chưa có dự án</h2>
            <p>Dữ liệu sẽ xuất hiện sau khi sếp tạo dự án hoặc import file Excel.</p>
          </div>
        )}
        {projects.length > 0 && (
          <div className="table-wrap">
            <table>
              <thead><tr><th>Mã</th><th>Dự án</th><th>Địa điểm</th><th>Thời gian</th><th>Trạng thái</th></tr></thead>
              <tbody>
                {projects.map((project) => (
                  <tr key={project.id}>
                    <td className="mono">{project.code}</td>
                    <td><strong>{project.name}</strong></td>
                    <td>{project.site || '—'}</td>
                    <td>{formatDate(project.start_date)} – {formatDate(project.end_date)}</td>
                    <td><span className={`status ${project.status}`}>{statusLabels[project.status]}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  )
}

function formatDate(value: string | null) {
  if (!value) return '—'
  return new Intl.DateTimeFormat('vi-VN').format(new Date(`${value}T00:00:00`))
}
