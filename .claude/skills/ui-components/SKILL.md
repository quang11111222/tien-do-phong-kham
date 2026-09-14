---
name: ui-components
description: "Use when building UI components, forms, or views. Covers component structure, CSS patterns, responsive design, loading states, and common UI patterns used in the tracker module."
---

# UI Components Guide

## Component Structure

### Standard Feature Component

```typescript
import { useEffect, useState } from 'react'
import { useAuth } from '../auth/authContext'
import { useToast } from '../../components/toastContext'
import { useConfirm } from '../../components/confirmContext'

interface MyFeatureProps {
  project: Project
  profile: Profile
  onBack: () => void
  onDirtyChange: (dirty: boolean) => void
}

export function MyFeature({ project, profile, onBack, onDirtyChange }: MyFeatureProps) {
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<Data[]>([])
  const notify = useToast()
  const confirm = useConfirm()

  useEffect(() => {
    let active = true
    setLoading(true)
    fetchData()
      .then(result => { if (active) setData(result) })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [project.id])

  if (loading) return <div className="loading">Đang tải...</div>

  return (
    <div className="feature-container">
      <header className="feature-header">
        <button className="back-btn" onClick={onBack}>← Quay lại</button>
        <h1>Tên tính năng</h1>
      </header>
      <main className="feature-content">
        {/* Content */}
      </main>
    </div>
  )
}
```

## CSS Patterns

### File Organization

```
src/
  styles/
    prototype.css      # Base styles, reset, variables
    tracker.css        # Tracker-specific styles
  features/
    tracker/
      GanttView.tsx
      GanttView.css    # Component-specific styles
```

### CSS Variables (prototype.css)

```css
:root {
  --bg: #f8f9fa;
  --surface: #ffffff;
  --border: #e0e0e0;
  --text: #1a1a1a;
  --text-secondary: #666666;
  --primary: #0066cc;
  --primary-hover: #0052a3;
  --danger: #dc3545;
  --success: #28a745;
  --warning: #ffc107;
  --info: #17a2b8;
}
```

### Common Layout Patterns

**Container with header:**
```css
.feature-container {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--bg);
}

.feature-header {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem 1.5rem;
  background: var(--surface);
  border-bottom: 1px solid var(--border);
}

.feature-content {
  flex: 1;
  overflow: auto;
  padding: 1.5rem;
}
```

**Card layout:**
```css
.card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 1.5rem;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
}
```

**Grid layout:**
```css
.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 1rem;
}
```

## Forms

### Controlled Form Pattern

```typescript
const [formData, setFormData] = useState({
  title: '',
  description: '',
  status: 'not_started'
})

const handleChange = (field: keyof typeof formData) => (
  e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
) => {
  setFormData(prev => ({ ...prev, [field]: e.target.value }))
  onDirtyChange(true)
}

return (
  <form onSubmit={handleSubmit}>
    <div className="form-field">
      <label>Tiêu đề</label>
      <input
        type="text"
        value={formData.title}
        onChange={handleChange('title')}
        required
      />
    </div>
    <div className="form-field">
      <label>Mô tả</label>
      <textarea
        value={formData.description}
        onChange={handleChange('description')}
        rows={3}
      />
    </div>
    <div className="form-field">
      <label>Trạng thái</label>
      <select
        value={formData.status}
        onChange={handleChange('status')}
      >
        <option value="not_started">Chưa bắt đầu</option>
        <option value="in_progress">Đang thực hiện</option>
        <option value="completed">Hoàn thành</option>
      </select>
    </div>
    <div className="form-actions">
      <button type="button" onClick={onBack}>Hủy</button>
      <button type="submit" disabled={loading}>
        {loading ? 'Đang lưu...' : 'Lưu'}
      </button>
    </div>
  </form>
)
```

### Form Field Styling

```css
.form-field {
  margin-bottom: 1rem;
}

.form-field label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 500;
  color: var(--text);
}

.form-field input,
.form-field textarea,
.form-field select {
  width: 100%;
  padding: 0.5rem;
  border: 1px solid var(--border);
  border-radius: 4px;
  font-size: 1rem;
}

.form-field input:focus,
.form-field textarea:focus,
.form-field select:focus {
  outline: none;
  border-color: var(--primary);
  box-shadow: 0 0 0 2px rgba(0, 102, 204, 0.1);
}

.form-actions {
  display: flex;
  gap: 0.5rem;
  justify-content: flex-end;
  margin-top: 1.5rem;
}
```

## Buttons

### Button Variants

```typescript
// Primary button
<button className="btn btn-primary">Lưu</button>

// Secondary button
<button className="btn btn-secondary">Hủy</button>

// Danger button
<button className="btn btn-danger">Xóa</button>

// Icon button
<button className="btn btn-icon" title="Chỉnh sửa">
  <EditIcon />
</button>

// Loading button
<button className="btn btn-primary" disabled={loading}>
  {loading ? 'Đang lưu...' : 'Lưu'}
</button>
```

### Button Styling

```css
.btn {
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 4px;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-primary {
  background: var(--primary);
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background: var(--primary-hover);
}

.btn-secondary {
  background: transparent;
  color: var(--text);
  border: 1px solid var(--border);
}

.btn-secondary:hover:not(:disabled) {
  background: var(--bg);
}

.btn-danger {
  background: var(--danger);
  color: white;
}

.btn-danger:hover:not(:disabled) {
  background: #c82333;
}

.btn-icon {
  padding: 0.5rem;
  background: transparent;
  color: var(--text-secondary);
}

.btn-icon:hover:not(:disabled) {
  background: var(--bg);
  color: var(--text);
}
```

## Tables

### Data Table Pattern

```typescript
return (
  <div className="table-container">
    <table className="data-table">
      <thead>
        <tr>
          <th>Tên</th>
          <th>Trạng thái</th>
          <th>Phòng ban</th>
          <th>Thao tác</th>
        </tr>
      </thead>
      <tbody>
        {items.map(item => (
          <tr key={item.id}>
            <td>{item.title}</td>
            <td>
              <StatusBadge status={item.status} />
            </td>
            <td>{item.department_name}</td>
            <td>
              <button onClick={() => handleEdit(item)}>Sửa</button>
              <button onClick={() => handleDelete(item.id)}>Xóa</button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
)
```

### Table Styling

```css
.table-container {
  overflow-x: auto;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 8px;
}

.data-table {
  width: 100%;
  border-collapse: collapse;
}

.data-table thead {
  background: var(--bg);
  border-bottom: 2px solid var(--border);
}

.data-table th {
  padding: 0.75rem 1rem;
  text-align: left;
  font-weight: 600;
  color: var(--text-secondary);
  font-size: 0.875rem;
}

.data-table td {
  padding: 0.75rem 1rem;
  border-bottom: 1px solid var(--border);
}

.data-table tbody tr:hover {
  background: var(--bg);
}

.data-table tbody tr:last-child td {
  border-bottom: none;
}
```

## Status Badges

```typescript
function StatusBadge({ status }: { status: WorkItemStatus }) {
  const labels: Record<WorkItemStatus, string> = {
    not_started: 'Chưa bắt đầu',
    in_progress: 'Đang thực hiện',
    pending_approval: 'Chờ duyệt',
    completed: 'Hoàn thành'
  }
  
  return (
    <span className={`status-badge status-${status}`}>
      {labels[status]}
    </span>
  )
}
```

```css
.status-badge {
  display: inline-block;
  padding: 0.25rem 0.75rem;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 500;
}

.status-not_started {
  background: #e9ecef;
  color: #495057;
}

.status-in_progress {
  background: #cfe2ff;
  color: #084298;
}

.status-pending_approval {
  background: #fff3cd;
  color: #856404;
}

.status-completed {
  background: #d1e7dd;
  color: #0f5132;
}
```

## Modals & Dialogs

### Using Confirm Context

```typescript
const confirm = useConfirm()

const handleDelete = async () => {
  const confirmed = await confirm({
    title: 'Xóa công việc?',
    message: 'Bạn có chắc chắn muốn xóa? Hành động này không thể hoàn tác.',
    confirmLabel: 'Xóa',
    tone: 'danger'
  })
  
  if (!confirmed) return
  
  await deleteWorkItem(id)
  notify('Đã xóa công việc.')
}
```

### Custom Modal

```typescript
interface ModalProps {
  title: string
  onClose: () => void
  children: React.ReactNode
}

function Modal({ title, onClose, children }: ModalProps) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <header className="modal-header">
          <h2>{title}</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </header>
        <div className="modal-body">
          {children}
        </div>
      </div>
    </div>
  )
}
```

```css
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal {
  background: var(--surface);
  border-radius: 8px;
  max-width: 500px;
  width: 90%;
  max-height: 90vh;
  overflow: auto;
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem 1.5rem;
  border-bottom: 1px solid var(--border);
}

.modal-header h2 {
  margin: 0;
  font-size: 1.25rem;
}

.modal-close {
  background: none;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
  color: var(--text-secondary);
}

.modal-body {
  padding: 1.5rem;
}
```

## Loading States

```typescript
// Skeleton loading
function LoadingSkeleton() {
  return (
    <div className="skeleton">
      <div className="skeleton-line" style={{ width: '60%' }} />
      <div className="skeleton-line" style={{ width: '80%' }} />
      <div className="skeleton-line" style={{ width: '40%' }} />
    </div>
  )
}

// Spinner
function Spinner() {
  return <div className="spinner" />
}
```

```css
.skeleton {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.skeleton-line {
  height: 1rem;
  background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
  background-size: 200% 100%;
  animation: loading 1.5s infinite;
  border-radius: 4px;
}

@keyframes loading {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

.spinner {
  width: 2rem;
  height: 2rem;
  border: 3px solid var(--border);
  border-top-color: var(--primary);
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
```

## Empty States

```typescript
function EmptyState({ title, description, action }: {
  title: string
  description?: string
  action?: { label: string; onClick: () => void }
}) {
  return (
    <div className="empty-state">
      <h3>{title}</h3>
      {description && <p>{description}</p>}
      {action && (
        <button className="btn btn-primary" onClick={action.onClick}>
          {action.label}
        </button>
      )}
    </div>
  )
}
```

```css
.empty-state {
  text-align: center;
  padding: 3rem 1.5rem;
  color: var(--text-secondary);
}

.empty-state h3 {
  margin: 0 0 0.5rem;
  color: var(--text);
}

.empty-state p {
  margin: 0 0 1.5rem;
}
```

## Responsive Design

```css
/* Mobile-first approach */
.grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 1rem;
}

@media (min-width: 768px) {
  .grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (min-width: 1024px) {
  .grid {
    grid-template-columns: repeat(3, 1fr);
  }
}

/* Hide on mobile */
.hide-mobile {
  display: none;
}

@media (min-width: 768px) {
  .hide-mobile {
    display: block;
  }
}

/* Responsive table */
@media (max-width: 768px) {
  .data-table {
    font-size: 0.875rem;
  }
  
  .data-table th,
  .data-table td {
    padding: 0.5rem;
  }
}
```

## Toast Notifications

```typescript
const notify = useToast()

// Success
notify('Đã lưu thành công.')

// Error
notify('Có lỗi xảy ra. Vui lòng thử lại.', 'error')

// Warning
notify('Dữ liệu đã thay đổi.', 'warning')

// Info
notify('Đang xử lý...', 'info')
```

## Common Patterns

### Search & Filter

```typescript
const [search, setSearch] = useState('')
const [filter, setFilter] = useState('all')

const filteredItems = items.filter(item => {
  const matchesSearch = item.title.toLowerCase().includes(search.toLowerCase())
  const matchesFilter = filter === 'all' || item.status === filter
  return matchesSearch && matchesFilter
})

return (
  <>
    <div className="filters">
      <input
        type="text"
        placeholder="Tìm kiếm..."
        value={search}
        onChange={e => setSearch(e.target.value)}
      />
      <select value={filter} onChange={e => setFilter(e.target.value)}>
        <option value="all">Tất cả</option>
        <option value="in_progress">Đang thực hiện</option>
        <option value="completed">Hoàn thành</option>
      </select>
    </div>
    {filteredItems.length === 0 ? (
      <EmptyState title="Không có kết quả" />
    ) : (
      <Table items={filteredItems} />
    )}
  </>
)
```

### Pagination

```typescript
const [page, setPage] = useState(1)
const pageSize = 20
const totalPages = Math.ceil(items.length / pageSize)
const paginatedItems = items.slice((page - 1) * pageSize, page * pageSize)

return (
  <>
    <Table items={paginatedItems} />
    <div className="pagination">
      <button 
        onClick={() => setPage(p => p - 1)} 
        disabled={page === 1}
      >
        Trước
      </button>
      <span>Trang {page} / {totalPages}</span>
      <button 
        onClick={() => setPage(p => p + 1)} 
        disabled={page === totalPages}
      >
        Sau
      </button>
    </div>
  </>
)
```
