---
name: project-patterns
description: "Use when adding new features or modifying existing code in the tracker module. Covers hash-based routing, dirty tracking, optimistic locking, auto-refresh, and other domain-specific patterns."
---

# Project Patterns

## Routing

**Hash-based routing** (không dùng React Router):

```typescript
import { routeHash, parseRouteHash } from '../../lib/routes'

// Navigate
window.history.pushState(null, '', routeHash('gantt', project.code, workItemId))

// Parse current route
const { page, projectKey, workItemId } = parseRouteHash(window.location.hash)

// Listen for changes
window.addEventListener('hashchange', onHashChange)
```

**Supported pages:** `projects`, `overview`, `gantt`, `milestones`, `activity`, `approvals`, `users`

## Dirty Tracking

Components report unsaved changes to `TrackerShell`:

```typescript
interface GanttViewProps {
  onDirtyChange: (dirty: boolean) => void
}

// In component
const [hasChanges, setHasChanges] = useState(false)

useEffect(() => {
  onDirtyChange(hasChanges)
}, [hasChanges, onDirtyChange])

// Before save
setHasChanges(true)  // mark dirty
// After save
setHasChanges(false) // clear dirty
```

**Auto-reset patterns:**
- Clear dirty after successful save
- Clear dirty when navigating away (with confirmation)
- Use `dirtyRef` to avoid stale closures in callbacks

## Optimistic Locking

Work items have a `version` field for concurrent edit detection:

```typescript
// In trackerService.ts
export async function saveWorkItem(workItem: WorkItem) {
  const { data, error } = await supabase
    .from('work_items')
    .update({
      ...fields,
      version: workItem.version + 1  // bump version
    })
    .eq('id', workItem.id)
    .eq('version', workItem.version)  // check current version
    .select()
    .single()
  
  if (!data && error?.message?.includes('version')) {
    throw new Error('Công việc đã được cập nhật bởi người khác. Vui lòng tải lại trang.')
  }
  
  return data
}
```

**Flow:**
1. Load work item with current version
2. User edits locally
3. On save: `UPDATE ... WHERE id = ? AND version = current_version`
4. If no rows updated → conflict → show error
5. If updated → increment local version

## Auto-Refresh Polling

Use `useAutoRefresh` hook for background data updates:

```typescript
import { useAutoRefresh } from '../../lib/useAutoRefresh'

useAutoRefresh(
  () => refreshData(),
  { 
    enabled: !hasUnsavedChanges,  // disable when dirty
    intervalMs: 30000              // poll every 30s
  }
)
```

**Disable conditions:**
- User has unsaved changes (`hasUnsavedChanges`)
- Component is unmounted
- User is editing sensitive data

## State Aggregation

Recursive status calculation from children:

```typescript
function aggregateStatus(children: WorkItem[]): WorkItemStatus {
  if (children.every(c => c.status === 'completed')) return 'completed'
  if (children.some(c => c.status === 'pending_approval')) return 'pending_approval'
  if (children.some(c => c.isLate)) return 'late'
  if (children.some(c => c.status === 'in_progress' || c.status === 'completed')) return 'in_progress'
  return 'not_started'
}
```

## Soft Delete

Projects use soft delete (không xóa cứng):

```typescript
// Delete
await supabase
  .from('projects')
  .update({ 
    deleted_at: new Date().toISOString(),
    deleted_by: profile.id 
  })
  .eq('id', projectId)

// Restore
await supabase
  .from('projects')
  .update({ 
    deleted_at: null,
    deleted_by: null 
  })
  .eq('id', projectId)

// Query (exclude deleted)
await supabase
  .from('projects')
  .select('*')
  .is('deleted_at', null)
```

## Component Integration Checklist

When creating a new feature component:

1. **Props:**
   - `project: Project` — current project
   - `profile: Profile` — current user
   - `onBack: () => void` — navigate back
   - `onDirtyChange: (dirty: boolean) => void` — track changes
   - `onOpenWork?: (workItemId: string) => void` — open work item

2. **Integration in TrackerShell:**
   ```typescript
   {page === 'myFeature' && project && (
     <MyFeature
       project={project}
       profile={profile}
       onBack={backToPortfolio}
       onDirtyChange={trackDirty}
     />
   )}
   ```

3. **Navigation:**
   - Add to `Page` type in `routes.ts`
   - Add route case in `routeHash` / `parseRouteHash`
   - Add sidebar button in `TrackerShell` nav

4. **Permissions:**
   - Check `canManageProject` or role before showing actions
   - Use permission functions from `lib/permissions.ts`

## Common Patterns

**Loading states:**
```typescript
const [loading, setLoading] = useState(true)
const [data, setData] = useState<Data[] | null>(null)

useEffect(() => {
  let active = true
  setLoading(true)
  fetchData().then((result) => {
    if (active) setData(result)
  }).finally(() => {
    if (active) setLoading(false)
  })
  return () => { active = false }
}, [deps])
```

**Error handling with toast:**
```typescript
const notify = useToast()

try {
  await saveData()
  notify('Đã lưu thành công.')
} catch (error) {
  notify(error.message || 'Có lỗi xảy ra. Vui lòng thử lại.', 'error')
}
```

**Confirm dialogs:**
```typescript
const confirm = useConfirm()

const onDelete = async () => {
  if (!await confirm({
    title: 'Xóa công việc?',
    message: 'Bạn có chắc chắn muốn xóa? Hành động này không thể hoàn tác.',
    confirmLabel: 'Xóa',
    tone: 'danger'
  })) return
  
  await deleteWorkItem(id)
}
```
