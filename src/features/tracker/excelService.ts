import type { Project, WorkItem, WorkItemStatus } from '../../types/domain'

export interface ImportedWorkItem {
  client_id: string
  parent_client_id: string | null
  wbs: string
  name: string
  responsibility: string
  start_date: string
  end_date: string
  sort_order: number
  source_row: number
  error: string | null
}

const statusLabels: Record<WorkItemStatus | 'late', string> = { not_started: 'Chưa thực hiện', in_progress: 'Đang thực hiện', pending_approval: 'Chờ duyệt', completed: 'Hoàn thành', late: 'Quá hạn' }

export async function downloadImportTemplate() {
  const { utils, writeFileXLSX } = await import('xlsx')
  const planRows: (string | number)[][] = [
    ['MẪU NẠP TIẾN ĐỘ DỰ ÁN PTPK'],
    ['Chỉ nhập dữ liệu tiến độ tại sheet này. Có thể thay nội dung mẫu bên dưới bằng dữ liệu thực tế.'],
    [],
    ['STT', 'Hạng mục công việc', 'Đơn vị chủ trì', 'Đơn vị phối hợp', 'Bắt đầu', 'Kết thúc'],
    ['I', 'CHUẨN BỊ - THIẾT KẾ', 'THIETKE', '', '', ''],
    [1, 'Rà soát hiện trạng và nhu cầu', '', '', '01/10/2026', '03/10/2026'],
    [2, 'Hoàn thiện phương án thiết kế', '', 'PTPK', '04/10/2026', '08/10/2026'],
    ['II', 'TRIỂN KHAI', 'KT', '', '', ''],
    [1, 'Chuẩn bị mặt bằng', '', 'BQLDA', '09/10/2026', '12/10/2026'],
  ]
  const guideRows: string[][] = [
    ['HƯỚNG DẪN DÙNG FILE MẪU'],
    ['1. Hệ thống chỉ nạp dữ liệu ở sheet đầu tiên (sheet Tien do).'],
    ['2. Dòng có STT là số La Mã như I, II, III được hiểu là hạng mục cha.'],
    ['3. Dòng có STT là số 1, 2, 3... được hiểu là công việc thuộc hạng mục gần nhất phía trên.'],
    ['4. Mỗi công việc cần có tên, ngày bắt đầu và ngày kết thúc.'],
    ['5. Ngày dùng định dạng DD/MM/YYYY hoặc YYYY-MM-DD.'],
    ['6. Đơn vị chủ trì và đơn vị phối hợp là hai cột riêng; dùng mã hoặc tên phòng/ban.'],
    ['7. Công việc để trống Đơn vị chủ trì sẽ tự lấy Đơn vị chủ trì của hạng mục gần nhất phía trên.'],
    ['8. Nếu có nhiều đơn vị phối hợp, có thể ngăn cách bằng dấu phẩy hoặc dấu /.'],
    ['9. Hãy thay các dòng minh họa bằng dữ liệu thực tế trước khi nạp.'],
  ]
  const planSheet = utils.aoa_to_sheet(planRows)
  planSheet['!cols'] = [{ wch: 10 }, { wch: 55 }, { wch: 22 }, { wch: 32 }, { wch: 15 }, { wch: 15 }]
  planSheet['!autofilter'] = { ref: 'A4:F9' }
  const guideSheet = utils.aoa_to_sheet(guideRows)
  guideSheet['!cols'] = [{ wch: 100 }]
  const workbook = utils.book_new()
  utils.book_append_sheet(workbook, planSheet, 'Tien do')
  utils.book_append_sheet(workbook, guideSheet, 'Huong dan')
  writeFileXLSX(workbook, 'mau-nap-tien-do-ptpk.xlsx')
}

export async function parseFirstSheet(file: File): Promise<ImportedWorkItem[]> {
  const { read, utils } = await import('xlsx')
  const workbook = read(await file.arrayBuffer(), { type: 'array', cellDates: true })
  const firstSheet = workbook.Sheets[workbook.SheetNames[0]]
  if (!firstSheet) throw new Error('File Excel không có sheet dữ liệu.')
  const rows = utils.sheet_to_json<unknown[]>(firstSheet, { header: 1, raw: false, dateNF: 'yyyy-mm-dd', defval: '' })
  let headerIndex = -1
  let columns: { stt?: number; name?: number; responsibility?: number; lead?: number; coordinating?: number; start?: number; end?: number } = {}
  for (let rowIndex = 0; rowIndex < Math.min(rows.length, 25); rowIndex += 1) {
    const found: typeof columns = {}
    rows[rowIndex].forEach((cell, columnIndex) => {
      const value = String(cell ?? '').toLowerCase().trim()
      if (/hạng mục|công việc|nội dung/.test(value) && found.name === undefined) found.name = columnIndex
      if ((/chủ trì.*phối hợp|phối hợp.*chủ trì/.test(value)) && found.responsibility === undefined) found.responsibility = columnIndex
      else if (/chủ trì/.test(value) && found.lead === undefined) found.lead = columnIndex
      else if (/phối hợp/.test(value) && found.coordinating === undefined) found.coordinating = columnIndex
      else if (/đơn vị|bộ phận/.test(value) && found.responsibility === undefined) found.responsibility = columnIndex
      if (/^bắt đầu|ngày bắt đầu|start/.test(value) && found.start === undefined) found.start = columnIndex
      if (/^kết thúc|ngày kết thúc|end|hoàn thành/.test(value) && found.end === undefined) found.end = columnIndex
      if (/^stt|^mã|^tt$/.test(value) && found.stt === undefined) found.stt = columnIndex
    })
    if (found.name !== undefined && found.start !== undefined && found.end !== undefined) { headerIndex = rowIndex; columns = found; break }
  }
  if (headerIndex < 0 || columns.name === undefined || columns.start === undefined || columns.end === undefined) throw new Error('Không tìm thấy dòng tiêu đề gồm Hạng mục công việc, Bắt đầu và Kết thúc.')
  const sttColumn = columns.stt ?? Math.max(0, columns.name - 1)
  const result: ImportedWorkItem[] = []
  let group = 0
  let child = 0
  let parentId: string | null = null
  let parentLead = ''
  rows.slice(headerIndex + 1).forEach((row, offset) => {
    const name = String(row[columns.name!] ?? '').replace(/\s+/g, ' ').trim()
    if (!name) return
    const stt = String(row[sttColumn] ?? '').trim()
    const start = parseDate(row[columns.start!])
    const end = parseDate(row[columns.end!])
    const legacyResponsibility = String(columns.responsibility === undefined ? '' : row[columns.responsibility] ?? '').replace(/\s+/g, ' ').trim()
    const lead = String(columns.lead === undefined ? '' : row[columns.lead] ?? '').replace(/\s+/g, ' ').trim()
    const coordinating = String(columns.coordinating === undefined ? '' : row[columns.coordinating] ?? '').replace(/\s+/g, ' ').trim()
    const responsibility = legacyResponsibility || [lead || parentLead, coordinating].filter(Boolean).join(' / ')
    const isGroup = /^[IVXLCDM]+$/i.test(stt) || (!stt && !start && !end)
    if (isGroup) {
      group += 1; child = 0; parentId = `group-${group}`
      parentLead = lead || firstResponsibilityUnit(legacyResponsibility)
      result.push({ client_id: parentId, parent_client_id: null, wbs: roman(group), name, responsibility: legacyResponsibility || [lead, coordinating].filter(Boolean).join(' / '), start_date: '', end_date: '', sort_order: result.length, source_row: headerIndex + offset + 2, error: null })
      return
    }
    if (!parentId) {
      group += 1; parentId = `group-${group}`; parentLead = ''
      result.push({ client_id: parentId, parent_client_id: null, wbs: roman(group), name: 'CHƯA PHÂN NHÓM', responsibility: '', start_date: '', end_date: '', sort_order: result.length, source_row: headerIndex + offset + 2, error: null })
    }
    child += 1
    result.push({ client_id: `task-${group}-${child}`, parent_client_id: parentId, wbs: `${roman(group)}.${child}`, name, responsibility, start_date: start ?? '', end_date: end ?? '', sort_order: result.length, source_row: headerIndex + offset + 2, error: !start || !end ? 'Thiếu ngày' : end < start ? 'Kết thúc trước bắt đầu' : null })
  })
  if (!result.length) throw new Error('Sheet đầu không có hạng mục hoặc công việc để nạp.')
  return result
}

export async function exportProject(project: Project, items: WorkItem[]) {
  if (!items.length) throw new Error('Dự án chưa có tiến độ để xuất.')
  const { utils, writeFileXLSX } = await import('xlsx')
  const byParent = new Map<string, WorkItem[]>()
  items.forEach((item) => { if (item.parent_id) byParent.set(item.parent_id, [...(byParent.get(item.parent_id) ?? []), item]) })
  const rows: (string | number)[][] = [[project.name + ' — tiến độ tại ngày ' + formatDate(today())], [], ['STT', 'Hạng mục công việc', 'Đơn vị chủ trì', 'Đơn vị phối hợp', 'Bắt đầu', 'Kết thúc', 'Số ngày KH', 'Trạng thái', 'Số tài liệu']]
  const visit = (item: WorkItem) => {
    const children = byParent.get(item.id) ?? []
    const spanItems = children.length ? allDescendants(item.id, items).filter((node) => node.start_date || node.end_date) : [item]
    const start = spanItems.map((node) => node.start_date).filter(Boolean).sort()[0] ?? null
    const end = spanItems.map((node) => node.end_date).filter(Boolean).sort().at(-1) ?? null
    const state = item.status !== 'completed' && item.status !== 'pending_approval' && item.end_date && item.end_date < today() ? 'late' : item.status
    rows.push([item.wbs, `${item.parent_id ? '   ' : ''}${item.name}`, item.lead_department?.code ?? '', item.coordinating_departments.map((department) => department.code).join(', '), start ? formatDate(start) : '', end ? formatDate(end) : '', start && end ? dayDiff(start, end) + 1 : '', statusLabels[state], children.length ? '' : item.attachment ? 1 : 0])
    children.forEach(visit)
  }
  items.filter((item) => !item.parent_id).forEach(visit)
  const sheet = utils.aoa_to_sheet(rows)
  sheet['!cols'] = [{ wch: 10 }, { wch: 58 }, { wch: 20 }, { wch: 30 }, { wch: 13 }, { wch: 13 }, { wch: 12 }, { wch: 18 }, { wch: 12 }]
  const workbook = utils.book_new()
  utils.book_append_sheet(workbook, sheet, 'Tien do')
  writeFileXLSX(workbook, `tien-do-${project.code.toLowerCase()}-${today()}.xlsx`)
}

function parseDate(value: unknown): string | null {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return iso(value)
  const text = String(value ?? '').trim()
  let match = text.match(new RegExp('^(\\d{1,2})[/.-](\\d{1,2})[/.-](\\d{2,4})$'))
  if (match) { const year = Number(match[3]) < 100 ? Number(match[3]) + 2000 : Number(match[3]); return iso(new Date(year, Number(match[2]) - 1, Number(match[1]))) }
  match = text.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/)
  if (match) return iso(new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3])))
  if (/^\d+(\.\d+)?$/.test(text)) { const date = new Date(Date.UTC(1899, 11, 30) + Math.round(Number(text)) * 86_400_000); return iso(new Date(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())) }
  return null
}
function allDescendants(id: string, items: WorkItem[]): WorkItem[] { const direct = items.filter((item) => item.parent_id === id); return direct.flatMap((item) => [item, ...allDescendants(item.id, items)]) }
function dayDiff(start: string, end: string) { return Math.round((new Date(`${end}T00:00:00`).getTime() - new Date(`${start}T00:00:00`).getTime()) / 86_400_000) }
function formatDate(value: string) { return new Intl.DateTimeFormat('vi-VN').format(new Date(`${value}T00:00:00`)) }
function iso(value: Date) { return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}` }
function today() { return new Date().toISOString().slice(0, 10) }
function firstResponsibilityUnit(value: string) { return value.split(/[/,]/)[0]?.trim() ?? '' }
function roman(value: number) { const pairs: [number, string][] = [[1000,'M'],[900,'CM'],[500,'D'],[400,'CD'],[100,'C'],[90,'XC'],[50,'L'],[40,'XL'],[10,'X'],[9,'IX'],[5,'V'],[4,'IV'],[1,'I']]; let rest = value; let result = ''; for (const [amount, symbol] of pairs) while (rest >= amount) { result += symbol; rest -= amount } return result }
