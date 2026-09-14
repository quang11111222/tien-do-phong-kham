import { useEffect, useState } from 'react'
import { useAuth } from '../auth/authContext'
import { useToast } from '../../components/toastContext'
import { getNotificationPolicies, notificationLabels, notificationRecipientGroups, recipientLabels, saveNotificationPolicies, type NotificationPolicy } from './notificationSettingsService'

export function NotificationSettingsPage({ onDirtyChange, onSaved }: { onDirtyChange: (dirty: boolean) => void; onSaved: () => void }) {
  const { profile } = useAuth()
  const notify = useToast()
  const [policies, setPolicies] = useState<NotificationPolicy[]>([])
  const [original, setOriginal] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [reload, setReload] = useState(0)
  const dirty = Boolean(original && JSON.stringify(policies) !== original)
  const isManager = profile?.role === 'manager' && profile.active

  useEffect(() => {
    if (!isManager) return
    let active = true
    void getNotificationPolicies().then((rows) => { if (active) { setPolicies(rows); setOriginal(JSON.stringify(rows)); setError('') } }).catch((err: Error) => { if (active) setError(err.message) }).finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [isManager, reload])
  useEffect(() => { onDirtyChange(dirty); return () => onDirtyChange(false) }, [dirty, onDirtyChange])

  if (!isManager) return <p>Bạn không có quyền cấu hình thông báo.</p>
  const change = (kind: NotificationPolicy['kind'], patch: Partial<NotificationPolicy>) => setPolicies((rows) => rows.map((row) => row.kind === kind ? { ...row, ...patch } : row))
  const save = async () => {
    setSaving(true)
    try {
      await saveNotificationPolicies(policies)
      // The RPC increments every row's version atomically. Do not discard the draft on a failed reload.
      const rows = policies.map((policy) => ({ ...policy, version: policy.version + 1 }))
      setPolicies(rows); setOriginal(JSON.stringify(rows)); setError(''); notify('Đã lưu cấu hình thông báo.'); onSaved()
    } catch (err) { const message = err instanceof Error ? err.message : 'Không lưu được cấu hình.'; setError(message); notify(message, 'error') }
    finally { setSaving(false) }
  }
  return <section className="notification-settings">
    <div className="eyebrow">QUẢN TRỊ HỆ THỐNG</div><h1>Cấu hình thông báo</h1>
    <p>Áp dụng chung cho mọi tài khoản. Chỉ gửi trong phạm vi người nhận được phép xem; nhiều vai trò không làm lặp thông báo.</p>
    <p>Thông báo giao việc gửi cho người được giao. Quản trị phòng phối hợp chỉ nhận nhắc hạn khi được giao việc, không mặc nhiên nhận mọi việc phối hợp. Chọn “Quản trị hệ thống” sẽ nhắc trên mọi dự án.</p>
    {error && <div role="alert" className="notification-settings-error">{error} {!dirty && <button disabled={saving} onClick={() => { setLoading(true); setReload((value) => value + 1) }}>Tải lại</button>}</div>}
    {loading ? <p>Đang tải cấu hình…</p> : policies.length > 0 && <>
      <fieldset disabled={saving} className="notification-settings-fields">
        {policies.map((policy) => <article className="notification-policy" key={policy.kind}>
          <div className="notification-policy-heading"><h2>{notificationLabels[policy.kind]}</h2><label><input type="checkbox" checked={policy.enabled} onChange={(event) => change(policy.kind, { enabled: event.target.checked })} /> Bật thông báo</label></div>
          {(policy.kind === 'due_soon' || policy.kind === 'overdue') && <label className="notification-days">{policy.kind === 'due_soon' ? 'Nhắc trước ngày kết thúc' : 'Bắt đầu nhắc sau ngày kết thúc'}<input aria-label={`Số ngày ${notificationLabels[policy.kind]}`} type="number" min={1} max={30} step={1} value={policy.days ?? ''} onChange={(event) => change(policy.kind, { days: event.target.value === '' ? null : Number(event.target.value) })} /> ngày</label>}
          <div className="notification-recipients">{notificationRecipientGroups(policy.kind).map((group) => <label key={group}><input type="checkbox" checked={policy.recipients.includes(group)} onChange={(event) => change(policy.kind, { recipients: event.target.checked ? [...policy.recipients, group] : policy.recipients.filter((value) => value !== group) })} />{group === 'participants' && policy.kind.startsWith('proposal_') ? 'Người đề xuất' : recipientLabels[group]}</label>)}</div>
        </article>)}
      </fieldset>
      <p>Nhắc hạn chỉ tính công việc cuối nhánh, bỏ qua Chờ duyệt và Hoàn thành. Tính ngày theo Việt Nam; không thay đổi trạng thái Quá hạn trên Gantt. Một lời nhắc tồn tại cho đến khi hết điều kiện, không gửi lặp hằng ngày.</p>
      <footer className="notification-settings-footer"><span>{dirty ? 'Có thay đổi chưa lưu' : 'Đã lưu cấu hình hiện tại'}</span><button disabled={dirty || saving} onClick={() => { setLoading(true); setReload((value) => value + 1) }}>Tải lại</button><button disabled={!dirty || saving} onClick={() => { setPolicies(JSON.parse(original) as NotificationPolicy[]); setError('') }}>Bỏ thay đổi</button><button className="btn primary" disabled={!dirty || saving} onClick={() => void save()}>{saving ? 'Đang lưu…' : 'Lưu cấu hình'}</button></footer>
    </>}
  </section>
}
