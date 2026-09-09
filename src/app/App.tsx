import { useState } from 'react'
import { useAuth } from '../features/auth/authContext'
import { LoginPage } from '../features/auth/LoginPage'
import { ProjectsPage } from '../features/projects/ProjectsPage'
import { SetupPage } from '../features/setup/SetupPage'
import { UsersPage } from '../features/users/UsersPage'
import { isSupabaseConfigured } from '../lib/supabase'

export function App() {
  const { session, profile, loading, signOut } = useAuth()
  const [page, setPage] = useState<'projects' | 'users'>('projects')

  if (!isSupabaseConfigured) return <SetupPage />
  if (loading) return <div className="app-loading">Đang khởi tạo hệ thống…</div>
  if (!session) return <LoginPage />

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-brand"><span className="brand-mark">TTH</span><div><strong>TTH GROUP</strong><small>Nền tảng điều hành số</small></div></div>
        <nav aria-label="Điều hướng chính">
          <button className={`nav-item ${page === 'projects' ? 'active' : ''}`} onClick={() => setPage('projects')}>Danh mục dự án</button>
          <button className="nav-item" disabled>Tiến độ &amp; Gantt</button>
          <button className="nav-item" disabled>Mốc kiểm soát</button>
          <button className="nav-item" disabled>Chờ duyệt</button>
          {profile?.role === 'manager' && (
            <button className={`nav-item ${page === 'users' ? 'active' : ''}`} onClick={() => setPage('users')}>Quản lý người dùng</button>
          )}
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
        <main className="page-content">{page === 'users' && profile?.role === 'manager' ? <UsersPage /> : <ProjectsPage />}</main>
      </div>
    </div>
  )
}
