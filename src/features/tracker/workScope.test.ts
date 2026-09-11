import { describe, expect, it } from 'vitest'
import type { WorkItem } from '../../types/domain'
import { defaultWorkScope, filterWorkItemsByScope } from './workScope'

const item = (id: string, parentId: string | null, lead: string, coordinators: string[], participants: string[]) => ({
  id, parent_id: parentId, lead_department_id: lead, coordinating_department_ids: coordinators, participant_ids: participants,
} as WorkItem)

const items = [
  item('group', null, 'ptpk', [], []),
  item('mine', 'group', 'ptpk', [], ['user-1']),
  item('department', 'group', 'ptpk', [], []),
  item('unrelated', null, 'other', [], []),
]

describe('work scope', () => {
  it('chọn phạm vi mặc định theo cấp quyền', () => {
    expect(defaultWorkScope('manager', false, false)).toBe('visible')
    expect(defaultWorkScope('employee', true, true)).toBe('visible')
    expect(defaultWorkScope('employee', false, true)).toBe('visible')
    expect(defaultWorkScope('employee', false, false)).toBe('mine')
  })

  it('việc của tôi giữ lại hạng mục cha và ẩn việc cùng phòng chưa được giao', () => {
    expect(filterWorkItemsByScope(items, 'mine', 'user-1').map((entry) => entry.id)).toEqual(['group', 'mine'])
  })
})
