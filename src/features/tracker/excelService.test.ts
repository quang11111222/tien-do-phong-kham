import { describe, expect, it } from 'vitest'
import { utils, write } from 'xlsx'
import { parseFirstSheet } from './excelService'

function workbookFile(rows: (string | number)[][]) {
  const workbook = utils.book_new()
  utils.book_append_sheet(workbook, utils.aoa_to_sheet(rows), 'Tien do')
  const content = write(workbook, { bookType: 'xlsx', type: 'array' })
  return new File([content], 'test.xlsx', { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
}

describe('parseFirstSheet', () => {
  it('đọc riêng đơn vị chủ trì và đơn vị phối hợp từ file mẫu mới', async () => {
    const items = await parseFirstSheet(workbookFile([
      ['STT', 'Hạng mục công việc', 'Đơn vị chủ trì', 'Đơn vị phối hợp', 'Bắt đầu', 'Kết thúc'],
      ['I', 'CHUẨN BỊ', '', '', '', ''],
      [1, 'Khảo sát mặt bằng', 'PTPK', 'KT, THIETKE', '01/10/2026', '03/10/2026'],
    ]))

    expect(items[1]).toMatchObject({ name: 'Khảo sát mặt bằng', responsibility: 'PTPK / KT, THIETKE', start_date: '2026-10-01', end_date: '2026-10-03' })
  })

  it('vẫn đọc cột chủ trì/phối hợp của file Excel cũ', async () => {
    const items = await parseFirstSheet(workbookFile([
      ['STT', 'Hạng mục công việc', 'Chủ trì/phối hợp', 'Bắt đầu', 'Kết thúc'],
      ['I', 'CHUẨN BỊ', '', '', ''],
      [1, 'Khảo sát mặt bằng', 'PTPK / KT', '2026-10-01', '2026-10-03'],
    ]))

    expect(items[1].responsibility).toBe('PTPK / KT')
  })
})
