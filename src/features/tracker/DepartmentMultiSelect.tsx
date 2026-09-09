import { useEffect, useMemo, useRef, useState } from 'react'
import type { Department } from '../../types/domain'

interface DepartmentMultiSelectProps {
  departments: Department[]
  disabled?: boolean
  leadDepartmentId: string
  selectedIds: string[]
  onChange: (ids: string[]) => void
}

export function DepartmentMultiSelect({ departments, disabled = false, leadDepartmentId, selectedIds, onChange }: DepartmentMultiSelectProps) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const root = useRef<HTMLDivElement | null>(null)
  const selected = departments.filter((department) => selectedIds.includes(department.id))
  const available = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase('vi')
    return departments.filter((department) => department.id !== leadDepartmentId && (!normalized || `${department.code} ${department.name}`.toLocaleLowerCase('vi').includes(normalized)))
  }, [departments, leadDepartmentId, query])

  useEffect(() => {
    if (!open) return
    const closeFromOutside = (event: PointerEvent) => { if (!root.current?.contains(event.target as Node)) setOpen(false) }
    document.addEventListener('pointerdown', closeFromOutside)
    return () => document.removeEventListener('pointerdown', closeFromOutside)
  }, [open])

  const toggle = (id: string) => onChange(selectedIds.includes(id) ? selectedIds.filter((selectedId) => selectedId !== id) : [...selectedIds, id])

  return <div className="f wide department-multi" ref={root}>
    <label id="coordinating-departments-label">Đơn vị phối hợp <small>(có thể chọn nhiều)</small></label>
    <button type="button" className={`department-multi-trigger ${open ? 'open' : ''}`} disabled={disabled} aria-expanded={open} aria-haspopup="listbox" aria-labelledby="coordinating-departments-label" onClick={() => setOpen((current) => !current)}>
      <span className={`department-chip-list ${selected.length ? '' : 'empty'}`}>{selected.length ? selected.map((department) => <span className="department-chip" key={department.id}>{department.name}</span>) : 'Chọn đơn vị phối hợp'}</span>
      <span className="department-chevron" aria-hidden="true">⌄</span>
    </button>
    {open && <div className="department-menu">
      <input autoFocus type="search" placeholder="Tìm phòng/ban…" value={query} onChange={(event) => setQuery(event.target.value)} />
      <div className="department-menu-list" role="listbox" aria-multiselectable="true" aria-labelledby="coordinating-departments-label">
        {available.map((department) => {
          const isSelected = selectedIds.includes(department.id)
          return <button type="button" role="option" aria-selected={isSelected} className={isSelected ? 'selected' : ''} key={department.id} onClick={() => toggle(department.id)}>
            <span><b>{department.name}</b><small>{department.code}</small></span>
            <i aria-hidden="true">{isSelected ? '✓' : '+'}</i>
          </button>
        })}
        {!available.length && <div className="department-menu-empty">Không tìm thấy phòng/ban phù hợp.</div>}
      </div>
    </div>}
  </div>
}
