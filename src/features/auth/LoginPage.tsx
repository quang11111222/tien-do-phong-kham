import { useState, type FormEvent } from 'react'
import { useAuth } from './authContext'

export function LoginPage() {
  const { signIn } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setSubmitting(true)
    setError(null)
    const message = await signIn(email.trim(), password)
    setError(message)
    setSubmitting(false)
  }

  return (
    <main className="auth-page">
      <section className="auth-brand">
        <span className="brand-mark">TTH</span>
        <p className="eyebrow">PHÒNG PHÁT TRIỂN PHÒNG KHÁM</p>
        <h1>Theo dõi tiến độ dự án trên một nguồn dữ liệu thống nhất.</h1>
        <p>Quản lý kế hoạch, người tham gia, mốc kiểm soát và quy trình duyệt hoàn thành.</p>
      </section>

      <section className="auth-card" aria-labelledby="login-title">
        <div>
          <p className="eyebrow">TTH GROUP</p>
          <h2 id="login-title">Đăng nhập hệ thống</h2>
          <p className="muted">Sử dụng tài khoản do quản trị viên cung cấp.</p>
        </div>
        <form onSubmit={handleSubmit}>
          <label>
            Email
            <input
              type="email"
              autoComplete="username"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </label>
          <label>
            Mật khẩu
            <input
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
          </label>
          {error && <div className="alert error">{error}</div>}
          <button className="primary-button" type="submit" disabled={submitting}>
            {submitting ? 'Đang đăng nhập…' : 'Đăng nhập'}
          </button>
        </form>
      </section>
    </main>
  )
}
