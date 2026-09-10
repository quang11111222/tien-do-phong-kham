import { useEffect, useMemo, useState } from 'react'
import type { Milestone, Project } from '../../types/domain'
import { getMilestones, saveMilestoneDraft } from './trackerService'
import { ProjectHeader } from './ProjectHeader'
import { useConfirm } from '../../components/confirmContext'
import { useAutoRefresh } from '../../lib/useAutoRefresh'

export function MilestonesView({ project, isManager, onBack, onDirtyChange }: { project: Project; isManager: boolean; onBack: () => void; onDirtyChange: (dirty: boolean) => void }) {
  const [saved, setSaved] = useState<Milestone[]>([])
  const [draft, setDraft] = useState<Milestone[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const confirm = useConfirm()
  const load = async () => { const data = await getMilestones(project.id); setSaved(data); setDraft(data) }
  useEffect(() => { let active = true; void getMilestones(project.id).then((data) => { if (active) { setSaved(data); setDraft(data) } }).catch(() => { if (active) setError('Không tải được mốc kiểm soát.') }).finally(() => { if (active) setLoading(false) }); return () => { active = false } }, [project.id])
  const dirty = useMemo(() => JSON.stringify(saved) !== JSON.stringify(draft), [saved, draft])
  useAutoRefresh(() => load().catch(() => setError('Không tự cập nhật được mốc kiểm soát.')), { enabled: !dirty && !saving })
  useEffect(() => { onDirtyChange(dirty) }, [dirty, onDirtyChange])
  const change = (id: string, patch: Partial<Milestone>) => setDraft((current) => current.map((item) => item.id === id ? { ...item, ...patch } : item))
  const add = () => setDraft((current) => [...current, { id: `new-${crypto.randomUUID()}`, project_id: project.id, name: 'Mốc mới', due_date: today(), condition_text: null, owner_text: null, achieved: false, achieved_at: null, sort_order: current.length }])
  const save = async () => { setSaving(true); setError(null); try { await saveMilestoneDraft(project.id, draft); await load() } catch (caught) { setError(caught instanceof Error ? caught.message : 'Không lưu được mốc kiểm soát.') } finally { setSaving(false) } }
  const cancel = async () => { if (!dirty || await confirm({ title: 'Bỏ thay đổi chưa lưu?', message: 'Mọi chỉnh sửa trên bảng mốc kiểm soát kể từ lần lưu gần nhất sẽ bị bỏ.', confirmLabel: 'Bỏ thay đổi', tone: 'danger' })) setDraft(saved) }
  const removeDraft = async (item: Milestone) => { if (await confirm({ title: 'Xóa mốc khỏi bản nháp?', message: `${item.name} sẽ được bỏ khỏi bảng. Thay đổi chỉ ghi vào dữ liệu sau khi bấm Lưu thay đổi.`, confirmLabel: 'Xóa khỏi bảng', tone: 'danger' })) setDraft((current) => current.filter((candidate) => candidate.id !== item.id)) }
  const done = draft.filter((item) => item.achieved).length
  const late = draft.filter((item) => !item.achieved && item.due_date < today()).length
  return <><ProjectHeader project={project} section="Mốc kiểm soát" onBack={onBack} />{error && <div className="note warn offline">{error}</div>}{loading ? <div className="card empty">Đang tải mốc kiểm soát…</div> : <><div className="stats"><div className="stat"><b>{draft.length}</b><span>Mốc kiểm soát</span></div><div className="stat"><b>{done}</b><span>Đã đạt</span></div><div className={`stat ${late ? 'hi' : ''}`}><b>{late}</b><span>Quá hạn chưa đạt</span></div><div className="stat"><b>{draft.length - done - late}</b><span>Còn phía trước</span></div></div><div className="card milestone-table-wrap"><table className="mile"><thead><tr><th /><th>Mốc kiểm soát</th><th>Ngày phải đạt</th><th>Đơn vị chủ trì</th><th>Điều kiện kiểm soát</th><th>Trạng thái</th>{isManager && <th />}</tr></thead><tbody>{draft.length ? draft.map((item, index) => <tr key={item.id}><td>{isManager ? <input aria-label={`Đánh dấu mốc ${index + 1} đã đạt`} type="checkbox" checked={item.achieved} onChange={(event) => change(item.id, { achieved: event.target.checked, achieved_at: event.target.checked ? today() : null })} /> : index + 1}</td><td>{isManager ? <input value={item.name} onChange={(event) => change(item.id, { name: event.target.value })} /> : item.name}</td><td>{isManager ? <input type="date" value={item.due_date} onChange={(event) => change(item.id, { due_date: event.target.value })} /> : date(item.due_date)}</td><td>{isManager ? <input value={item.owner_text ?? ''} onChange={(event) => change(item.id, { owner_text: event.target.value })} /> : item.owner_text || '—'}</td><td>{isManager ? <input value={item.condition_text ?? ''} onChange={(event) => change(item.id, { condition_text: event.target.value })} /> : item.condition_text || '—'}</td><td><span className={`pill ${item.achieved ? 'p-done' : item.due_date < today() ? 'p-late' : 'p-todo'}`}><i />{item.achieved ? 'Đã đạt' : item.due_date < today() ? 'Quá hạn' : 'Chưa đến'}</span></td>{isManager && <td><button className="btn dgr sm" onClick={() => void removeDraft(item)}>Xóa</button></td>}</tr>) : <tr><td colSpan={7}><div className="empty"><h3>Chưa có mốc kiểm soát</h3><p>Thêm mốc để theo dõi điều kiện phải đạt trước khi sang giai đoạn sau.</p></div></td></tr>}</tbody></table></div>{isManager && <div className="milestone-actions"><button className="btn" onClick={add}>+ Thêm mốc</button>{dirty ? <><button className="btn pri" disabled={saving || draft.some((item) => !item.name.trim() || !item.due_date)} onClick={() => void save()}>{saving ? 'Đang lưu…' : 'Lưu thay đổi'}</button><button className="btn" disabled={saving} onClick={() => void cancel()}>Hủy bỏ</button><span className="tiny unsaved">Có thay đổi chưa lưu</span></> : <span className="tiny muted">Mốc kiểm soát hiện thành hình thoi trên sơ đồ Gantt.</span>}</div>}</>}</>
}

function today() { return new Date().toISOString().slice(0, 10) }
function date(value: string) { return new Intl.DateTimeFormat('vi-VN').format(new Date(`${value}T00:00:00`)) }
