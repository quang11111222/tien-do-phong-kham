import { useAuth } from '../features/auth/authContext'
import { LoginPage } from '../features/auth/LoginPage'
import { ProjectsPage } from '../features/projects/ProjectsPage'
import { SetupPage } from '../features/setup/SetupPage'
import { isSupabaseConfigured } from '../lib/supabase'

export function App() {
  const { session, profile, loading, signOut } = useAuth()

  if (!isSupabaseConfigured) return <SetupPage />
  if (loading) return <div className="app-loading">Đang khởi tạo hệ thống…</div>
  if (!session) return <LoginPage />

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-brand"><span className="brand-mark">TTH</span><div><strong>TTH GROUP</strong><small>Nền tảng điều hành số</small></div></div>
        <nav aria-label="Điều hướng chính">
          <button className="nav-item active">Danh mục dự án</button>
          <button className="nav-item" disabled>Tiến độ &amp; Gantt</button>
          <button className="nav-item" disabled>Mốc kiểm soát</button>
          <button className="nav-item" disabled>Chờ duyệt</button>
        </nav>
      </aside>
      <div className="main-area">
        <header className="topbar">
          <span className="topbar-title">Tiến độ dự án PTPK</span>
          <div className="account">
            <div><strong>{profile?.full_name || session.user.email}</strong><small>{profile?.role === 'manager' ? 'Sếp' : 'Nhân viên'}</small></div>
            <button type="button" onClick={() => void signOut()}>Đăng xuất</button>
          </div>
        </header>
        <main className="page-content"><ProjectsPage /></main>
      </div>
    </div>
  )
}
