---
name: tracker-service
description: "Use when working with work items, evidence, completion requests, or project data. Covers CRUD operations, status transitions, evidence management, and completion workflow."
---

# Tracker Service API

## Core Functions

### Work Items

**Get work items for project:**
```typescript
import { getWorkItems } from './trackerService'

const items = await getWorkItems(projectId)
// Returns: WorkItem[] with parent/child hierarchy
```

**Create work item:**
```typescript
import { createWorkItem } from './trackerService'

const newItem = await createWorkItem({
  project_id: projectId,
  parent_id: parentId || null,  // null for root
  title: 'Task name',
  lead_department_id: departmentId,  // inherited from parent if child
  coordinating_department_ids: [],
  participant_ids: [],
  start_date: '2026-01-01',
  end_date: '2026-01-31',
  status: 'not_started'
})
```

**Update work item:**
```typescript
import { saveWorkItem } from './trackerService'

await saveWorkItem({
  ...workItem,
  title: 'Updated title',
  status: 'in_progress',
  progress: 50
})
// Uses optimistic locking - throws error if version conflict
```

**Delete work item:**
```typescript
import { deleteWorkItem } from './trackerService'

await deleteWorkItem(workItemId)
// Cascade deletes children
```

## Status Transitions

### Direct Completion (manager/dept admin same dept)

```typescript
// Check permission first
import { canCompleteWorkItemDirectly } from '../../lib/permissions'

if (canCompleteWorkItemDirectly({
  profile,
  projectCanManage: project.can_manage,
  leadDepartmentId: workItem.lead_department_id
})) {
  // Direct update
  await saveWorkItem({ ...workItem, status: 'completed' })
}
```

### Completion Request Workflow

**1. Submit request (employee):**
```typescript
import { submitCompletionRequest } from './trackerService'

await submitCompletionRequest({
  work_item_id: workItem.id,
  submitted_by: profile.id,
  note: 'Hoàn thành công việc'
})
// Work item status → 'pending_approval'
```

**2. Review request (manager/dept admin):**
```typescript
import { reviewCompletionRequest } from './trackerService'

// Approve
await reviewCompletionRequest(requestId, {
  status: 'approved',
  reviewed_by: profile.id
})
// Work item status → 'completed'

// Reject (requires reason)
await reviewCompletionRequest(requestId, {
  status: 'rejected',
  reviewed_by: profile.id,
  reason: 'Cần bổ sung minh chứng'
})
// Work item status → 'in_progress'
```

**Permission check:**
```typescript
import { canReviewCompletion } from '../../lib/permissions'

const canReview = canReviewCompletion({
  profile,
  projectCanManage: project.can_manage,
  leadDepartmentId: workItem.lead_department_id,
  submittedBy: request.submitted_by
})
// Returns false if submittedBy === profile.id (no self-review)
```

## Evidence Management

### Upload Evidence

```typescript
import { uploadEvidence } from './trackerService'

const file = inputRef.current.files[0]
const attachment = await uploadEvidence({
  work_item_id: workItem.id,
  file: file,
  uploaded_by: profile.id
})

// Returns: { id, file_name, file_path, signed_url }
```

**Flow:**
1. Upload file to Supabase Storage (`evidence` bucket)
2. Create `attachments` record with file path
3. Generate signed URL (1 hour expiry)
4. Return attachment object

### Get Evidence

```typescript
import { getAttachments } from './trackerService'

const attachments = await getAttachments(workItem.id)
// Returns: Attachment[] with signed URLs
```

### Delete Evidence

```typescript
import { deleteAttachment } from './trackerService'

await deleteAttachment(attachmentId)
// Removes file from storage + deletes DB record
```

### Evidence Validation

**Server-side check:** Work item must have valid evidence before status transition to `completed` or `pending_approval`.

```typescript
// Before submit completion
const attachments = await getAttachments(workItem.id)
if (attachments.length === 0) {
  throw new Error('Cần đính kèm minh chứng trước khi hoàn thành')
}
```

## Progress Updates

**Add progress update:**
```typescript
import { addProgressUpdate } from './trackerService'

await addProgressUpdate({
  work_item_id: workItem.id,
  progress: 75,
  note: 'Đã hoàn thành 75% công việc',
  created_by: profile.id
})
```

**Get progress history:**
```typescript
import { getProgressUpdates } from './trackerService'

const updates = await getProgressUpdates(workItem.id)
// Returns: ProgressUpdate[] sorted by created_at desc
```

## Projects

**Get all projects:**
```typescript
import { getProjects } from './trackerService'

const projects = await getProjects()
// Returns: Project[] (excludes soft-deleted)
```

**Create project:**
```typescript
import { createProject } from './trackerService'

const project = await createProject({
  code: 'PRJ001',
  name: 'Dự án mẫu',
  start_date: '2026-01-01',
  end_date: '2026-12-31'
})
```

**Clone project:**
```typescript
import { cloneProjectPlan } from './trackerService'

const newProject = await cloneProjectPlan(sourceProjectId, {
  code: 'PRJ002',
  name: 'Dự án sao chép'
})
// Clones: work items, milestones, attachments structure
// Does NOT clone: runtime data (progress, status, evidence)
```

## Excel Import/Export

**Import from Excel:**
```typescript
import { importFromExcel } from './trackerService'

const result = await importFromExcel(file, projectId)
// Validates structure
// Creates/updates work items
// Returns: { created: 10, updated: 5, errors: [] }
```

**Export to Excel:**
```typescript
import { exportToExcel } from './trackerService'

await exportToExcel(projectId, 'project-plan.xlsx')
// Generates .xlsx with Vietnamese status labels
```

## Milestones

**Get milestones:**
```typescript
import { getMilestones } from './trackerService'

const milestones = await getMilestones(projectId)
```

**Save milestone draft:**
```typescript
import { saveMilestoneDraft } from './trackerService'

await saveMilestoneDraft({
  project_id: projectId,
  id: milestoneId || null,  // null for new
  title: 'Mốc kiểm tra',
  date: '2026-06-30',
  linked_work_item_ids: [workItemId1, workItemId2]
})
```

## Activity & Notifications

**Get project activity:**
```typescript
import { getProjectActivity } from './trackerService'

const activity = await getProjectActivity(projectId)
// Returns: ActivityItem[] from progress updates + completion requests + audit logs
```

**Get personal notifications:**
```typescript
import { getPersonalNotifications } from './trackerService'

const notifications = await getPersonalNotifications(profile.id)
// Returns: PersonalNotification[] for current user
```

**Mark as seen:**
```typescript
import { markNotificationsSeen } from './trackerService'

await markNotificationsSeen([workItemId1, workItemId2], profile.id)
```

**Unread count:**
```typescript
import { getUnreadWorkItemCount } from './trackerService'

const count = await getUnreadWorkItemCount(projectId)
```

## Common Patterns

### Load work item with full context

```typescript
const [workItem, attachments, progressUpdates] = await Promise.all([
  getWorkItem(workItemId),
  getAttachments(workItemId),
  getProgressUpdates(workItemId)
])
```

### Handle optimistic lock conflict

```typescript
try {
  await saveWorkItem(updatedItem)
  notify('Đã lưu thành công.')
  onDirtyChange(false)
} catch (error) {
  if (error.message.includes('người khác')) {
    const reloaded = await getWorkItem(workItem.id)
    if (await confirm({
      title: 'Dữ liệu đã thay đổi',
      message: 'Công việc đã được cập nhật bởi người khác. Bạn có muốn tải lại?',
      confirmLabel: 'Tải lại',
      tone: 'warning'
    })) {
      setWorkItem(reloaded)
    }
  } else {
    notify(error.message, 'error')
  }
}
```

### Batch operations

```typescript
// Delete multiple work items
await Promise.all(selectedIds.map(id => deleteWorkItem(id)))

// Mark multiple notifications as seen
await markNotificationsSeen(notifications.map(n => n.work_item_id), profile.id)
```
