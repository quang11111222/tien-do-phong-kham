import { describe, expect, it } from 'vitest'
import { normalizeUsername, USERNAME_PATTERN, usernameToInternalEmail } from './username'

describe('username helpers', () => {
  it('chuẩn hóa tài khoản trước khi đăng nhập', () => {
    expect(normalizeUsername('  Admin ')).toBe('admin')
    expect(usernameToInternalEmail('Admin')).toBe('admin@ptpk.local')
  })

  it('chỉ chấp nhận tài khoản nội bộ an toàn', () => {
    expect(USERNAME_PATTERN.test('nv.ptpk-01')).toBe(true)
    expect(USERNAME_PATTERN.test('ab')).toBe(false)
    expect(USERNAME_PATTERN.test('nguyễn văn a')).toBe(false)
  })
})
