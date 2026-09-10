import { useEffect, useMemo, useRef, useState } from 'react'
import type { UserProfile } from '../../types/domain'

interface ParticipantMultiSelectProps {
  users: UserProfile[]
  disabled?: boolean
  selectedIds: string[]
  onChange: (ids: string[]) => void
}

export function ParticipantMultiSelect({ users, disabled = false, selectedIds, onChange }: ParticipantMultiSelectProps) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const root = useRef<HTMLDivElement | null>(null)
  const selected = users.filter((user) => selectedIds.includes(user.id))
  const available = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase('vi')
    return users.filter((user) => !normalized || `${user.full_name} ${user.username}`.toLocaleLowerCase('vi').includes(normalized))
  }, [query, users])

  useEffect(() => {
    if (!open) return
    const closeFromOutside = (event: PointerEvent) => { if (!root.current?.contains(event.target as Node)) setOpen(false) }
    document.addEventListener('pointerdown', closeFromOutside)
    return () => document.removeEventListener('pointerdown', closeFromOutside)
  }, [open])

  const toggle = (id: string) => onChange(selectedIds.includes(id) ? selectedIds.filter((selectedId) => selectedId !== id) : [...selectedIds, id])

  return <div className="f wide department-multi participant-multi" ref={root}>
    <label id="participants-label">Người tham gia <small>(có thể chọn nhiều)</small></label>
    <button type="button" disabled={disabled} className={`department-multi-trigger ${open ? 'open' : ''}`} aria-expanded={open && !disabled} aria-haspopup="listbox" aria-labelledby="participants-label" onClick={() => setOpen((current) => !current)}>
      <span className={`department-chip-list ${selected.length ? '' : 'empty'}`}>{selected.length ? selected.map((user) => <span className="department-chip participant-chip" key={user.id}>{user.full_name}</span>) : 'Chọn người tham gia'}</span>
      <span className="department-chevron" aria-hidden="true">⌄</span>
    </button>
    {open && !disabled && <div className="department-menu participant-menu">
      <input autoFocus type="search" placeholder="Tìm theo họ tên hoặc tài khoản…" value={query} onChange={(event) => setQuery(event.target.value)} />
      <div className="department-menu-list" role="listbox" aria-multiselectable="true" aria-labelledby="participants-label">
        {available.map((user) => {
          const isSelected = selectedIds.includes(user.id)
          return <button type="button" role="option" aria-selected={isSelected} className={isSelected ? 'selected' : ''} key={user.id} onClick={() => toggle(user.id)}>
            <span><b>{user.full_name}</b><small>@{user.username} · {user.role === 'manager' ? 'Quản trị viên' : 'Nhân viên'}</small></span>
            <i aria-hidden="true">{isSelected ? '✓' : '+'}</i>
          </button>
        })}
        {!available.length && <div className="department-menu-empty">Không tìm thấy tài khoản phù hợp.</div>}
      </div>
    </div>}
  </div>
}
