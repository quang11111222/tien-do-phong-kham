import { useCallback, useEffect, useRef, useState } from 'react'
import { useAuth } from '../auth/authContext'
import { UsersPage } from '../users/UsersPage'
import type { Project } from '../../types/domain'
import { PortfolioPage } from './PortfolioPage'
import { GanttView } from './GanttView'
import { MilestonesView } from './MilestonesView'
import { ApprovalsView } from './ApprovalsView'
import { ProjectOverview } from './ProjectOverview'
import { ProjectActivity } from './ProjectActivity'
import { getProjects } from './trackerService'
import { tthLogoDataUrl } from '../../assets/tthLogo'
import { parseRouteHash, routeHash, type Page } from '../../lib/routes'
import '../../styles/prototype.css'
import '../../styles/tracker.css'
import { useConfirm } from '../../components/confirmContext'

export function TrackerShell() {
  const { profile, signOut } = useAuth()
  const initialRoute = parseRouteHash(window.location.hash)
  const [page, setPage] = useState<Page>(initialRoute.page)
  const [project, setProject] = useState<Project | null>(null)
  const [clock, setClock] = useState(new Date())
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [unreadActivityCount, setUnreadActivityCount] = useState(0)
  const dirtyRef = useRef(false)
  const lastHashRef = useRef(window.location.hash || routeHash('projects'))
  const confirm = useConfirm()
  const isManager = profile?.role === 'manager'

  useEffect(() => {
    document.documentElement.dataset.theme = 'light'
    const timer = window.setInterval(() => setClock(new Date()), 1000)
    return () => window.clearInterval(timer)
  }, [])

  const trackDirty = useCallback((dirty: boolean) => {
    dirtyRef.current = dirty
    setHasUnsavedChanges(dirty)
  }, [])
  const clearUnreadActivity = useCallback(() => setUnreadActivityCount(0), [])

  const applyRoute = useCallback(async (hash: string) => {
    if (!profile) return
    const route = parseRouteHash(hash)
    if (!isManager && (route.page === 'approvals' || route.page === 'users')) {
      const fallback = routeHash('projects')
      window.history.replaceState(null, '', fallback)
      lastHashRef.current = fallback
      setProject(null)
      setPage('projects')
      return
    }
    if (route.projectKey) {
      const projects = await getProjects()
      const nextProject = projects.find((candidate) => candidate.id === route.projectKey || candidate.code.toLocaleLowerCase('vi') === route.projectKey!.toLocaleLowerCase('vi'))
      if (!nextProject) {
        const fallback = routeHash('projects')
        window.history.replaceState(null, '', fallback)
        lastHashRef.current = fallback
        setProject(null)
        setPage('projects')
        return
      }
      setProject(nextProject)
      setUnreadActivityCount(0)
    } else if (route.page === 'projects') {
      setProject(null)
    }
    setPage(route.page)
  }, [isManager, profile])

  useEffect(() => {
    if (!profile) return
    if (!window.location.hash) window.history.replaceState(null, '', routeHash('projects'))
    lastHashRef.current = window.location.hash
    const initialRouteTimer = window.setTimeout(() => void applyRoute(window.location.hash), 0)

    const onHashChange = () => {
      const nextHash = window.location.hash || routeHash('projects')
      if (!dirtyRef.current) {
        lastHashRef.current = nextHash
        void applyRoute(nextHash)
        return
      }
      void confirm({ title: 'Rời màn hình?', message: 'Màn hình đang có thay đổi chưa lưu. Nếu rời đi, các thay đổi này sẽ bị bỏ.', confirmLabel: 'Rời đi', tone: 'danger' }).then((accepted) => {
        if (!accepted) {
          window.history.replaceState(null, '', lastHashRef.current)
          return
        }
        trackDirty(false)
        lastHashRef.current = nextHash
        void applyRoute(nextHash)
      })
    }
    window.addEventListener('hashchange', onHashChange)
    return () => { window.clearTimeout(initialRouteTimer); window.removeEventListener('hashchange', onHashChange) }
  }, [applyRoute, confirm, profile, trackDirty])

  if (!profile) return null

  const updateAddress = (nextPage: Page, nextProject: Project | null) => {
    const hash = routeHash(nextPage, nextProject?.code ?? null)
    window.history.pushState(null, '', hash)
    lastHashRef.current = hash
  }
  const openProject = (next: Project) => {
    setProject(next)
    setUnreadActivityCount(0)
    setPage('gantt')
    updateAddress('gantt', next)
  }
  const navigate = async (next: Page, clearProject = false) => {
    if (hasUnsavedChanges && !await confirm({ title: 'Rời màn hình?', message: 'Màn hình đang có thay đổi chưa lưu. Nếu rời đi, các thay đổi này sẽ bị bỏ.', confirmLabel: 'Rời đi', tone: 'danger' })) return
    trackDirty(false)
    const nextProject = clearProject ? null : project
    if (clearProject) setProject(null)
    setPage(next)
    updateAddress(next, nextProject)
  }
  const backToPortfolio = () => { void navigate('projects', true) }
  const projectPage = project && ['overview', 'gantt', 'milestones', 'activity'].includes(page)

  return <div className="app tracker-app">
    <aside className="side">
      <div className="brandbox"><img className="tth-logo" src={tthLogoDataUrl} alt="TTH GROUP" /><div><b>TTH GROUP</b><span>Nền tảng điều hành số</span></div></div>
      <div className="navwrap"><div className="navlabel">Quản lý khảo sát mặt bằng</div><nav className="nav"><div className="sub root-sub">
        <button className={page === 'projects' ? 'on' : ''} onClick={backToPortfolio}>Danh mục dự án</button>
        {project && <><div className="cap">{project.name}</div><button className={page === 'overview' ? 'on' : ''} onClick={() => navigate('overview')}>Tổng quan dự án</button><button className={page === 'gantt' ? 'on' : ''} onClick={() => navigate('gantt')}>Tiến độ &amp; Gantt</button><button className={page === 'milestones' ? 'on' : ''} onClick={() => navigate('milestones')}>Mốc kiểm soát</button><button className={page === 'activity' ? 'on' : ''} onClick={() => navigate('activity')}><span>Nhật ký diễn biến</span>{unreadActivityCount > 0 && <span className="nav-activity-pulse" title={`${unreadActivityCount} công việc có diễn biến mới`} aria-label={`${unreadActivityCount} công việc có diễn biến mới`} />}</button></>}
      </div>{isManager && <><div className="navlabel nav-section">Quản trị</div><div className="sub root-sub"><button className={page === 'approvals' ? 'on' : ''} onClick={() => navigate('approvals')}>Chờ duyệt</button><button className={page === 'users' ? 'on' : ''} onClick={() => navigate('users')}>Quản lý người dùng</button></div></>}</nav></div>
      <div className="clock"><b>{clock.toLocaleTimeString('vi-VN')}</b><span>{clock.toLocaleDateString('vi-VN', { weekday: 'short', day: '2-digit', month: '2-digit' })}</span></div>
    </aside>
    <div className="main"><header className="top"><span className="top-spacer" />{projectPage && <div className="chip">{project.code}</div>}<div className="whoami"><div><b>{profile.full_name}</b><span>{isManager ? 'Quản trị viên' : 'Nhân viên'}</span></div><div className="av">{initials(profile.full_name)}</div><button className="logout-mini" onClick={() => void signOut()}>Đăng xuất</button></div></header>
      <main className="view">{page === 'projects' && <PortfolioPage isManager={isManager} onOpen={openProject} />}{page === 'overview' && project && <ProjectOverview project={project} onBack={backToPortfolio} onOpenWork={() => navigate('gantt')} />}{page === 'gantt' && project && <GanttView project={project} profile={profile} onBack={backToPortfolio} onDirtyChange={trackDirty} onUnreadCountChange={setUnreadActivityCount} />}{page === 'milestones' && project && <MilestonesView project={project} isManager={isManager} onBack={backToPortfolio} onDirtyChange={trackDirty} />}{page === 'activity' && project && <ProjectActivity project={project} profileId={profile.id} onBack={backToPortfolio} onOpenGantt={() => navigate('gantt')} onSeen={clearUnreadActivity} />}{page === 'approvals' && <ApprovalsView isManager={isManager} />}{page === 'users' && isManager && <div className="users-host"><UsersPage /></div>}</main>
    </div>
  </div>
}

function initials(name: string) { return name.split(/\s+/).filter(Boolean).slice(-2).map((part) => part[0]).join('').toUpperCase() }
