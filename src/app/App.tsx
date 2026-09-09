import { useAuth } from '../features/auth/authContext'
import { LoginPage } from '../features/auth/LoginPage'
import { SetupPage } from '../features/setup/SetupPage'
import { TrackerShell } from '../features/tracker/TrackerShell'
import { isSupabaseConfigured } from '../lib/supabase'

export function App() {
  const { session, loading } = useAuth()

  if (!isSupabaseConfigured) return <SetupPage />
  if (loading) return <div className="app-loading">Đang khởi tạo hệ thống…</div>
  if (!session) return <LoginPage />

  return <TrackerShell />
}
