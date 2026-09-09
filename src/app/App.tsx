import { useAuth } from '../features/auth/authContext'
import { LoginPage } from '../features/auth/LoginPage'
import { SetupPage } from '../features/setup/SetupPage'
import { TrackerShell } from '../features/tracker/TrackerShell'
import { isSupabaseConfigured } from '../lib/supabase'

export function App() {
  const { session, profile, loading, signOut } = useAuth()

  if (!isSupabaseConfigured) return <SetupPage />
  if (loading) return <div className="app-loading">Đang khởi tạo hệ thống…</div>
  if (!session) return <LoginPage />
  if (!profile) return <div className="app-loading">Đang tải hồ sơ người dùng…</div>
  if (!profile.active) return <div className="account-disabled"><div className="setup-card"><p className="eyebrow">TÀI KHOẢN ĐÃ BỊ KHÓA</p><h1>Không thể truy cập hệ thống</h1><p className="muted">Tài khoản của bạn đã được quản trị viên tắt hoạt động. Liên hệ quản trị viên nếu cần mở lại.</p><button className="primary-button" onClick={() => void signOut()}>Quay lại đăng nhập</button></div></div>

  return <TrackerShell />
}
