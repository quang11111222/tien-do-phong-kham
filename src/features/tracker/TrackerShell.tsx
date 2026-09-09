import { useEffect, useState } from 'react'
import { useAuth } from '../auth/authContext'
import { UsersPage } from '../users/UsersPage'
import type { Project } from '../../types/domain'
import { getProjects } from './trackerService'
import { PortfolioPage } from './PortfolioPage'
import { GanttView } from './GanttView'
import { MilestonesView } from './MilestonesView'
import { ApprovalsView } from './ApprovalsView'
import '../../styles/prototype.css'
import '../../styles/tracker.css'

type Page = 'projects' | 'gantt' | 'milestones' | 'approvals' | 'users'

export function TrackerShell() {
  const { profile, signOut } = useAuth()
  const [page, setPage] = useState<Page>('projects')
  const [project, setProject] = useState<Project | null>(null)
  const [clock, setClock] = useState(new Date())
  useEffect(() => { document.documentElement.dataset.theme = 'light'; const timer = window.setInterval(() => setClock(new Date()), 1000); return () => window.clearInterval(timer) }, [])
  useEffect(() => { let active = true; void getProjects().then((projects) => { if (active) setProject(projects.find((item) => item.code === 'PK-KHETRE') ?? projects[0] ?? null) }); return () => { active = false } }, [])
  if (!profile) return null
  const isManager = profile.role === 'manager'
  const openProject = (next: Project) => { setProject(next); setPage('gantt') }
  return <div className="app tracker-app"><aside className="side"><div className="brandbox"><div className="logo">TTH</div><div><b>TTH GROUP</b><span>Nền tảng điều hành số</span></div></div><div className="navwrap"><div className="navlabel">Tiến độ dự án PTPK</div><nav className="nav clean-nav"><button className={page === 'projects' ? 'on' : ''} onClick={() => setPage('projects')}><span>▦</span>Danh mục dự án</button><button className={page === 'gantt' ? 'on' : ''} onClick={() => setPage('gantt')}><span>▤</span>Tiến độ &amp; Gantt</button><button className={page === 'milestones' ? 'on' : ''} onClick={() => setPage('milestones')}><span>◆</span>Mốc kiểm soát</button><button className={page === 'approvals' ? 'on' : ''} onClick={() => setPage('approvals')}><span>✓</span>Chờ duyệt</button>{isManager && <button className={page === 'users' ? 'on' : ''} onClick={() => setPage('users')}><span>♟</span>Quản lý người dùng</button>}</nav>{project && <div className="selected-project"><span>Dự án đang chọn</span><b>{project.name}</b><small>{project.code}</small></div>}</div><div className="clock"><b>{clock.toLocaleTimeString('vi-VN')}</b><span>{clock.toLocaleDateString('vi-VN', { weekday: 'short', day: '2-digit', month: '2-digit' })}</span></div></aside><div className="main"><header className="top"><div className="search">⌕ <span>Tìm nhanh công việc, dự án…</span><span className="kbd">Ctrl+K</span></div><div className="chip">{project?.code ?? 'Chưa chọn dự án'}</div><div className="whoami"><div><b>{profile.full_name}</b><span>{isManager ? 'Sếp' : 'Nhân viên'}</span></div><div className="av">{initials(profile.full_name)}</div><button className="logout-mini" onClick={() => void signOut()}>Đăng xuất</button></div></header><main className="view">{page === 'projects' && <PortfolioPage isManager={isManager} onOpen={openProject} />}{page === 'gantt' && (project ? <GanttView project={project} profile={profile} /> : <NeedProject onChoose={() => setPage('projects')} />)}{page === 'milestones' && (project ? <MilestonesView project={project} isManager={isManager} /> : <NeedProject onChoose={() => setPage('projects')} />)}{page === 'approvals' && <ApprovalsView isManager={isManager} />}{page === 'users' && isManager && <UsersPage />}</main></div></div>
}

function NeedProject({ onChoose }: { onChoose: () => void }) { return <div className="card empty"><h3>Chưa chọn dự án</h3><p>Chọn một dự án trước khi xem tiến độ.</p><button className="btn pri" onClick={onChoose}>Chọn dự án</button></div> }
function initials(name: string) { return name.split(/\s+/).filter(Boolean).slice(-2).map((part) => part[0]).join('').toUpperCase() }
