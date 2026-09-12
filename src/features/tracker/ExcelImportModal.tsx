import { useState } from 'react'
import type { ImportedWorkItem } from './excelService'
import { downloadImportTemplate, parseFirstSheet } from './excelService'
import { useConfirm } from '../../components/confirmContext'
import { useToast } from '../../components/toastContext'

export function ExcelImportModal({ onClose, onImport }: { onClose: () => void; onImport: (items: ImportedWorkItem[]) => Promise<void> }) {
  const [items, setItems] = useState<ImportedWorkItem[]>([])
  const [fileName, setFileName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [templateBusy, setTemplateBusy] = useState(false)
  const confirm = useConfirm()
  const notify = useToast()
  const tasks = items.filter((item) => item.parent_client_id)
  const invalid = tasks.filter((item) => item.error)
  const choose = async (file?: File) => {
    if (!file) return
    setError(null); setFileName(file.name)
    try { setItems(await parseFirstSheet(file)) } catch (caught) { const message = caught instanceof Error ? caught.message : 'Không đọc được file Excel.'; setItems([]); setError(message); notify(message, 'error') }
  }
  const submit = async () => {
    if (!items.length) return
    if (!await confirm({ title: 'Thay toàn bộ tiến độ?', message: 'Dữ liệu trong file sẽ thay thế toàn bộ hạng mục và công việc hiện tại của dự án. Sau khi nạp, chỉ Quản trị dự án hoặc Quản trị hệ thống được thay đổi kế hoạch. Thao tác này không thể hoàn tác.', confirmLabel: 'Nạp và thay thế', tone: 'danger' })) return
    setBusy(true); setError(null)
    try { await onImport(items); onClose(); notify('Đã nạp tiến độ từ file Excel.') } catch (caught) { const message = caught instanceof Error ? caught.message : 'Không nạp được tiến độ.'; setError(message); notify(message, 'error') } finally { setBusy(false) }
  }
  const downloadTemplate = async () => {
    setTemplateBusy(true); setError(null)
    try { await downloadImportTemplate(); notify('Đã tải file Excel mẫu.') } catch { const message = 'Không tạo được file Excel mẫu. Vui lòng thử lại.'; setError(message); notify(message, 'error') } finally { setTemplateBusy(false) }
  }
  return <div className="modal on" role="dialog" aria-modal="true" aria-label="Nạp tiến độ từ Excel"><div className="mbox import-box"><header><h2>Nạp tiến độ từ file Excel</h2><button className="btn" onClick={onClose}>✕</button></header><div className="mbody"><div className="import-template"><div><b>Chưa có file đúng cấu trúc?</b><span>Tải file mẫu, thay dữ liệu minh họa rồi nạp lại tại đây.</span></div><button type="button" className="btn" disabled={templateBusy} onClick={() => void downloadTemplate()}>{templateBusy ? 'Đang tạo file…' : '↓ Tải file Excel mẫu'}</button></div><label className="drop">{fileName || 'Bấm để chọn file .xlsx / .xls / .csv'}<input hidden type="file" accept=".xlsx,.xls,.csv" onChange={(event) => void choose(event.target.files?.[0])} /></label>{error && <div className="note warn">{error}</div>}{items.length > 0 && <><div className="row2 import-summary"><span className="pill p-done"><i />{items.length - tasks.length} hạng mục</span><span className="pill p-doing"><i />{tasks.length} công việc</span><span className={`pill ${invalid.length ? 'p-late' : 'p-done'}`}><i />{invalid.length ? `${invalid.length} dòng cần kiểm tra` : 'Không có lỗi'}</span></div><div className="imp"><table><thead><tr><th>Dòng</th><th>Mã</th><th>Hạng mục / công việc</th><th>Chủ trì / phối hợp</th><th>Bắt đầu</th><th>Kết thúc</th></tr></thead><tbody>{items.map((item) => <tr key={item.client_id} className={item.parent_client_id ? '' : 'gp'}><td>{item.source_row}</td><td>{item.wbs}</td><td>{item.name}</td><td>{item.responsibility}</td><td className={item.error ? 'bad' : ''}>{item.start_date || (item.parent_client_id ? '—' : '')}</td><td className={item.error ? 'bad' : ''}>{item.end_date || (item.parent_client_id ? '—' : '')}</td></tr>)}</tbody></table></div>{invalid.length > 0 && <div className="note warn">Dòng thiếu ngày vẫn nạp được nhưng chưa có thanh trên Gantt. Dòng kết thúc trước bắt đầu cần sửa trong file.</div>}</>}<div className="note">Hệ thống chỉ đọc <b>sheet đầu tiên</b>; tự nhận các cột Hạng mục công việc, Đơn vị chủ trì, Đơn vị phối hợp, Bắt đầu và Kết thúc. File cũ có cột Chủ trì/phối hợp vẫn dùng được.<br /><b>Sau khi nạp, chỉ Quản trị dự án hoặc Quản trị hệ thống được thêm, sửa hoặc xóa đầu mục kế hoạch.</b></div></div><footer className="mfoot"><button className="btn" onClick={onClose}>Hủy</button><button className="btn pri" disabled={!items.length || busy || invalid.some((item) => item.error === 'Kết thúc trước bắt đầu')} onClick={() => void submit()}>{busy ? 'Đang nạp…' : 'Nạp vào dự án'}</button></footer></div></div>
}
