import { useState, type FormEvent } from 'react'
import { useAuth } from './authContext'

export function ChangePasswordDialog({ onClose }: { onClose: () => void }) {
  const { profile, changePassword } = useAuth()
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setError(null)
    if (newPassword.length < 8) return setError('Mật khẩu mới phải có ít nhất 8 ký tự.')
    if (newPassword !== confirmation) return setError('Hai lần nhập mật khẩu mới chưa khớp.')
    setSaving(true)
    const nextError = await changePassword(currentPassword, newPassword)
    if (nextError) { setError(nextError); setSaving(false); return }
    onClose()
  }

  return <div className="user-dialog-layer" onMouseDown={(event) => { if (event.target === event.currentTarget && !saving) onClose() }}>
    <form className="user-dialog" role="dialog" aria-modal="true" aria-labelledby="change-password-title" onSubmit={submit}>
      <div className="user-dialog-heading"><div><p className="eyebrow">BẢO MẬT TÀI KHOẢN</p><h2 id="change-password-title">Đổi mật khẩu của tôi</h2><p>{profile?.full_name} · @{profile?.username}</p></div><button type="button" className="user-dialog-close" aria-label="Đóng" disabled={saving} onClick={onClose}>×</button></div>
      <label>Mật khẩu hiện tại<input required type="password" autoComplete="current-password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} autoFocus /></label>
      <label>Mật khẩu mới<input required minLength={8} type="password" autoComplete="new-password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} /></label>
      <label>Nhập lại mật khẩu mới<input required minLength={8} type="password" autoComplete="new-password" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} /></label>
      {error && <div className="alert error">{error}</div>}
      <div className="user-dialog-actions"><button type="button" className="btn" disabled={saving} onClick={onClose}>Hủy bỏ</button><button className="btn pri" disabled={saving}>{saving ? 'Đang đổi…' : 'Đổi mật khẩu'}</button></div>
    </form>
  </div>
}
