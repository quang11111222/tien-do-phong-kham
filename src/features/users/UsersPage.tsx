import { useCallback, useEffect, useState, type FormEvent } from 'react'
import type { AppRole, UserProfile } from '../../types/domain'
import { createUser, listUsers } from './userService'
import { normalizeUsername, USERNAME_PATTERN } from '../../lib/username'

const emptyForm = {
  username: '',
  password: '',
  role: 'employee' as AppRole,
}

export function UsersPage() {
  const [users, setUsers] = useState<UserProfile[]>([])
  const [form, setForm] = useState(emptyForm)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const loadData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setUsers(await listUsers())
    } catch {
      setError('Không tải được danh sách người dùng.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    let active = true
    void listUsers()
      .then((nextUsers) => {
        if (!active) return
        setUsers(nextUsers)
      })
      .catch(() => {
        if (active) setError('Không tải được danh sách người dùng.')
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [])

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setError(null)
    setSuccess(null)

    if (form.password.length < 8) {
      setError('Mật khẩu tạm phải có ít nhất 8 ký tự.')
      return
    }

    const username = normalizeUsername(form.username)
    if (!USERNAME_PATTERN.test(username)) {
      setError('Tài khoản gồm 3–32 ký tự: chữ thường, số, dấu chấm, gạch ngang hoặc gạch dưới.')
      return
    }
    setSubmitting(true)
    try {
      await createUser({ ...form, username })
      setSuccess(`Đã tạo tài khoản ${username}.`)
      setForm(emptyForm)
      await loadData()
    } catch {
      setError('Không tạo được tài khoản. Kiểm tra tên trùng hoặc quyền sếp.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section>
      <div className="page-heading">
        <div>
          <p className="eyebrow">QUẢN TRỊ HỆ THỐNG</p>
          <h1>Quản lý người dùng</h1>
          <p className="muted">Sếp tạo tài khoản và gán vai trò. Hệ thống không cho phép tự đăng ký.</p>
        </div>
      </div>

      <div className="admin-grid">
        <form className="content-card user-form" onSubmit={handleSubmit}>
          <div>
            <h2>Tạo tài khoản</h2>
            <p className="muted">Người dùng chỉ cần tài khoản và mật khẩu để đăng nhập.</p>
          </div>
          <label>Tài khoản<input required autoComplete="off" pattern="[a-z0-9._-]{3,32}" value={form.username} onChange={(event) => setForm({ ...form, username: event.target.value.toLowerCase() })} /></label>
          <label>Mật khẩu tạm<input required minLength={8} type="password" autoComplete="new-password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} /></label>
          <label>Vai trò<select value={form.role} onChange={(event) => setForm({ ...form, role: event.target.value as AppRole })}>
            <option value="employee">Nhân viên</option>
            <option value="manager">Sếp</option>
          </select></label>
          {error && <div className="alert error">{error}</div>}
          {success && <div className="alert success">{success}</div>}
          <button className="primary-button" disabled={submitting} type="submit">
            {submitting ? 'Đang tạo…' : 'Tạo tài khoản'}
          </button>
        </form>

        <div className="content-card">
          <div className="card-heading"><h2>Danh sách tài khoản</h2><span>{users.length} người</span></div>
          {loading && <div className="state-message">Đang tải người dùng…</div>}
          {!loading && users.length === 0 && <div className="state-message">Chưa có tài khoản.</div>}
          {users.length > 0 && <div className="table-wrap"><table>
            <thead><tr><th>Tài khoản</th><th>Vai trò</th><th>Trạng thái</th></tr></thead>
            <tbody>{users.map((user) => <tr key={user.id}>
              <td><strong>{user.username}</strong></td>
              <td>{user.role === 'manager' ? 'Sếp' : 'Nhân viên'}</td>
              <td><span className={`status ${user.active ? 'active' : 'archived'}`}>{user.active ? 'Đang hoạt động' : 'Đã khóa'}</span></td>
            </tr>)}</tbody>
          </table></div>}
        </div>
      </div>
    </section>
  )
}
