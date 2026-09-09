import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../auth/authContext'
import { UsersPage } from '../users/UsersPage'
import type { Project } from '../../types/domain'
import { PortfolioPage } from './PortfolioPage'
import { GanttView } from './GanttView'
import { MilestonesView } from './MilestonesView'
import { ApprovalsView } from './ApprovalsView'
import { ProjectOverview } from './ProjectOverview'
import { ProjectActivity } from './ProjectActivity'
import { tthLogoDataUrl } from '../../assets/tthLogo'
import '../../styles/prototype.css'
import '../../styles/tracker.css'
import { useConfirm } from '../../components/confirmContext'

type Page = 'projects' | 'overview' | 'gantt' | 'milestones' | 'activity' | 'approvals' | 'users'

export function TrackerShell() {
  const { profile, signOut } = useAuth()
  const [page, setPage] = useState<Page>('projects')
  const [project, setProject] = useState<Project | null>(null)
  const [clock, setClock] = useState(new Date())
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [unreadActivityCount, setUnreadActivityCount] = useState(0)
  const confirm = useConfirm()
  useEffect(() => { document.documentElement.dataset.theme = 'light'; const timer = window.setInterval(() => setClock(new Date()), 1000); return () => window.clearInterval(timer) }, [])
  const trackDirty = useCallback((dirty: boolean) => setHasUnsavedChanges(dirty), [])
  const clearUnreadActivity = useCallback(() => setUnreadActivityCount(0), [])
  if (!profile) return null
  const isManager = profile.role === 'manager'
  const openProject = (next: Project) => { setProject(next); setUnreadActivityCount(0); setPage('gantt') }
  const navigate = async (next: Page, clearProject = false) => {
    if (hasUnsavedChanges && !await confirm({ title: 'Rời màn hình?', message: 'Màn hình đang có thay đổi chưa lưu. Nếu rời đi, các thay đổi này sẽ bị bỏ.', confirmLabel: 'Rời đi', tone: 'danger' })) return
    setHasUnsavedChanges(false)
    if (clearProject) setProject(null)
    setPage(next)
  }
  const backToPortfolio = () => { void navigate('projects', true) }
  const projectPage = project && ['overview', 'gantt', 'milestones', 'activity'].includes(page)
  return <div className="app tracker-app"><aside className="side"><div className="brandbox"><img className="tth-logo" src={tthLogoDataUrl} alt="TTH GROUP" /><div><b>TTH GROUP</b><span>Nền tảng điều hành số</span></div></div><div className="navwrap"><div className="navlabel">Quản lý khảo sát mặt bằng</div><nav className="nav"><div className="sub root-sub"><button className={page === 'projects' ? 'on' : ''} onClick={backToPortfolio}>Danh mục dự án</button>{project && <><div className="cap">{project.name}</div><button className={page === 'overview' ? 'on' : ''} onClick={() => navigate('overview')}>Tổng quan dự án</button><button className={page === 'gantt' ? 'on' : ''} onClick={() => navigate('gantt')}>Tiến độ &amp; Gantt</button><button className={page === 'milestones' ? 'on' : ''} onClick={() => navigate('milestones')}>Mốc kiểm soát</button><button className={page === 'activity' ? 'on' : ''} onClick={() => navigate('activity')}><span>Nhật ký diễn biến</span>{unreadActivityCount > 0 && <span className="nav-activity-pulse" title={`${unreadActivityCount} công việc có diễn biến mới`} aria-label={`${unreadActivityCount} công việc có diễn biến mới`} />}</button></>}</div>{isManager && <><div className="navlabel nav-section">Quản trị</div><div className="sub root-sub"><button className={page === 'approvals' ? 'on' : ''} onClick={() => navigate('approvals')}>Chờ duyệt</button><button className={page === 'users' ? 'on' : ''} onClick={() => navigate('users')}>Quản lý người dùng</button></div></>}</nav></div><div className="clock"><b>{clock.toLocaleTimeString('vi-VN')}</b><span>{clock.toLocaleDateString('vi-VN', { weekday: 'short', day: '2-digit', month: '2-digit' })}</span></div></aside><div className="main"><header className="top"><span className="top-spacer" />{projectPage && <div className="chip">{project.code}</div>}<div className="whoami"><div><b>{profile.full_name}</b><span>{isManager ? 'Sếp' : 'Nhân viên'}</span></div><div className="av">{initials(profile.full_name)}</div><button className="logout-mini" onClick={() => void signOut()}>Đăng xuất</button></div></header><main className="view">{page === 'projects' && <PortfolioPage isManager={isManager} onOpen={openProject} />}{page === 'overview' && project && <ProjectOverview project={project} onBack={backToPortfolio} onOpenWork={() => navigate('gantt')} />}{page === 'gantt' && project && <GanttView project={project} profile={profile} onBack={backToPortfolio} onDirtyChange={trackDirty} onUnreadCountChange={setUnreadActivityCount} />}{page === 'milestones' && project && <MilestonesView project={project} isManager={isManager} onBack={backToPortfolio} onDirtyChange={trackDirty} />}{page === 'activity' && project && <ProjectActivity project={project} profileId={profile.id} onBack={backToPortfolio} onOpenGantt={() => navigate('gantt')} onSeen={clearUnreadActivity} />}{page === 'approvals' && <ApprovalsView isManager={isManager} />}{page === 'users' && isManager && <div className="users-host"><UsersPage /></div>}</main></div></div>
}

function initials(name: string) { return name.split(/\s+/).filter(Boolean).slice(-2).map((part) => part[0]).join('').toUpperCase() }
