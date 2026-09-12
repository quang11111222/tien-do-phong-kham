import { useEffect, useState } from 'react'
import type { CompletionRequest } from '../../types/domain'
import { getPendingRequests, reviewRequest } from './trackerService'
import { useAutoRefresh } from '../../lib/useAutoRefresh'
import { useToast } from '../../components/toastContext'

export function ApprovalsView({ isManager }: { isManager: boolean }) {
  const [items, setItems] = useState<CompletionRequest[]>([])
  const [notes, setNotes] = useState<Record<string, string>>({})
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState<string | null>(null)
  const notify = useToast()
  const load = async () => setItems(await getPendingRequests())
  useEffect(() => { let active = true; void getPendingRequests().then((data) => { if (active) setItems(data) }).catch(() => { if (active) setError('Không tải được danh sách chờ duyệt.') }).finally(() => { if (active) setLoading(false) }); return () => { active = false } }, [])
  useAutoRefresh(() => load().catch(() => setError('Không tự cập nhật được danh sách chờ duyệt.')), { enabled: !busyId })
  const decide = async (item: CompletionRequest, decision: 'approved' | 'rejected') => { if (decision === 'rejected' && !notes[item.id]?.trim()) { const message = 'Từ chối phải nhập lý do.'; setError(message); notify(message, 'error'); return } try { setError(null); setBusyId(item.id); await reviewRequest(item.id, decision, notes[item.id] ?? ''); await load(); notify(decision === 'approved' ? 'Đã duyệt hoàn thành công việc.' : 'Đã từ chối yêu cầu hoàn thành.') } catch { const message = 'Yêu cầu đã được xử lý hoặc tài khoản không có quyền duyệt.'; setError(message); notify(message, 'error') } finally { setBusyId(null) } }
  return <><div className="ovhead"><div><div className="eyebrow">Quy trình hoàn thành</div><h1>Công việc chờ duyệt</h1><p className="tiny muted">Nhân viên gửi hoàn thành; quản trị viên duyệt hoặc từ chối kèm lý do.</p></div></div>{error && <div className="note warn offline">{error}</div>}<div className="stats"><div className="stat wr"><b>{items.length}</b><span>Đang chờ quản trị viên xử lý</span></div></div><div className="card" style={{ padding: '4px 16px' }}>{loading ? <div className="empty">Đang tải danh sách chờ duyệt…</div> : !items.length ? <div className="empty"><h3>Không có công việc chờ duyệt</h3><p>Các yêu cầu mới sẽ xuất hiện tại đây.</p></div> : <div className="alist">{items.map((item) => <div className="ai approval-row" key={item.id}><div><span className="pcode">{item.project?.code}</span><span className="sb">Lần {item.attempt_no}</span></div><div><span className="nm">{item.work_item?.wbs}. {item.work_item?.name}</span><span className="sb">{item.submitter?.full_name || item.submitter?.username} · {dateTime(item.submitted_at)} · {item.note || 'Không có ghi chú'}</span></div>{isManager ? <div className="approval-box"><input disabled={busyId === item.id} placeholder="Nhận xét / lý do từ chối" value={notes[item.id] ?? ''} onChange={(event) => setNotes({ ...notes, [item.id]: event.target.value })} /><button disabled={busyId === item.id} className="btn dgr" onClick={() => void decide(item, 'rejected')}>{busyId === item.id ? 'Đang xử lý…' : 'Từ chối'}</button><button disabled={busyId === item.id} className="btn ok" onClick={() => void decide(item, 'approved')}>{busyId === item.id ? 'Đang xử lý…' : 'Duyệt'}</button></div> : <span className="pill p-pending"><i />Chờ duyệt</span>}</div>)}</div>}</div></>
}
function dateTime(value: string) { return new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value)) }
