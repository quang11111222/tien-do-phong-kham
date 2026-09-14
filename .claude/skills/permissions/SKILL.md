---
name: permissions
description: "Use when implementing access control, checking user permissions, or filtering data by role. Covers role-based permissions, work item access, completion review, and department scoping."
---

# Permission Model

## Roles

**3 main roles:**
- `manager` — system admin, full access
- `department_admin` — department admin, scoped to department
- `employee` — regular staff, limited to assigned work

**Additional flags:**
- `is_department_admin` — user is dept admin for their department
- `can_manage` — user can manage specific project (project-level override)
- `department_id` — user's department

## Permission Functions

### canEditWorkItem

Who can edit a work item's details:

```typescript
import { canEditWorkItem } from '../../lib/permissions'

const canEdit = canEditWorkItem({
  role: profile.role,
  canManageProject: project.can_manage,
  userId: profile.id,
  participantIds: workItem.participant_ids
})

// Logic:
// - manager → always true
// - canManageProject → true
// - participant → true (if user is in participant_ids)
// - otherwise → false
```

### canManageWorkItemStructure

Who can add/delete/reorder work items:

```typescript
import { canManageWorkItemStructure } from '../../lib/permissions'

const canManage = canManageWorkItemStructure({
  role: profile.role,
  canManageProject: project.can_manage,
  departmentId: profile.department_id,
  isDepartmentAdmin: profile.is_department_admin,
  parentId: workItem.parent_id,
  leadDepartmentIdsInPath: getLeadDeptIdsInPath(workItem)
})

// Logic:
// - manager → always true
// - canManageProject → true
// - otherwise → false
```

### canViewWorkItemDetails

Who can view work item details (complex logic):

```typescript
import { canViewWorkItemDetails } from '../../lib/permissions'

const canView = canViewWorkItemDetails({
  role: profile.role,
  canManageProject: project.can_manage,
  departmentId: profile.department_id,
  isDepartmentAdmin: profile.is_department_admin,
  leadDepartmentIdsInBranch: getLeadDeptIdsInBranch(workItem),
  coordinatingDepartmentIds: workItem.coordinating_department_ids,
  participantIds: workItem.participant_ids,
  userId: profile.id
})

// Logic (in order):
// 1. manager or canManageProject → true
// 2. participant → true
// 3. no department_id → false
// 4. department is lead or coordinating → true
// 5. isDepartmentAdmin AND department in path → true
// 6. otherwise → false
```

### canReviewCompletion

Who can approve/reject completion requests:

```typescript
import { canReviewCompletion } from '../../lib/permissions'

const canReview = canReviewCompletion({
  profile: profile,
  projectCanManage: project.can_manage,
  leadDepartmentId: workItem.lead_department_id,
  submittedBy: request.submitted_by
})

// Logic:
// - submittedBy === profile.id → false (no self-review!)
// - manager → true
// - projectCanManage → true
// - isDepartmentAdmin AND department === leadDepartment → true
// - otherwise → false
```

**Critical rule:** Users cannot review their own completion requests.

### canCompleteWorkItemDirectly

Who can mark work as completed without request:

```typescript
import { canCompleteWorkItemDirectly } from '../../lib/permissions'

const canComplete = canCompleteWorkItemDirectly({
  profile: profile,
  projectCanManage: project.can_manage,
  leadDepartmentId: workItem.lead_department_id
})

// Logic:
// - projectCanManage → true
// - isDepartmentAdmin AND department === leadDepartment → true
// - otherwise → false (must submit request)
```

### participantManagementScope

Who can add/remove participants from which departments:

```typescript
import { participantManagementScope } from '../../lib/permissions'

const scope = participantManagementScope({
  role: profile.role,
  canManageProject: project.can_manage,
  departmentId: profile.department_id,
  isDepartmentAdmin: profile.is_department_admin,
  leadDepartmentId: workItem.lead_department_id,
  coordinatingDepartmentIds: workItem.coordinating_department_ids
})

// Returns:
// - 'all_related_departments' → can add from lead + coordinating depts
// - 'own_department' → can only add from own department
// - 'none' → cannot add participants
```

**Logic:**
- manager or canManageProject → `all_related_departments`
- not dept admin or no dept → `none`
- dept admin AND dept === lead → `all_related_departments`
- dept admin AND dept in coordinating → `own_department`
- otherwise → `none`

## Work Scope Filtering

### WorkScope Types

```typescript
type WorkScope = 'mine' | 'department' | 'visible'

// Default scopes by role:
// - manager → 'visible' (see all)
// - canManageProject → 'visible'
// - dept admin → 'department'
// - employee → 'mine' (only assigned)
```

### Filtering Logic

**mine:** Work items where user is participant or lead

```typescript
function isMineScope(item: WorkItem, userId: string): boolean {
  return item.participant_ids.includes(userId) || 
         item.lead_department_id === user.department_id
}
```

**department:** Work items for user's department

```typescript
function isDepartmentScope(item: WorkItem, departmentId: string): boolean {
  return item.lead_department_id === departmentId ||
         item.coordinating_department_ids.includes(departmentId)
}
```

**visible:** All work items user can view (uses canViewWorkItemDetails)

### Recursive Filtering

**Parent items are visible if any child matches scope:**

```typescript
function filterWorkItems(items: WorkItem[], scope: WorkScope, profile: Profile): WorkItem[] {
  return items.filter(item => {
    // Check if this item matches scope
    const matchesScope = checkScope(item, scope, profile)
    
    // Check if any descendant matches
    const hasMatchingChild = item.children.some(child => 
      checkScope(child, scope, profile)
    )
    
    return matchesScope || hasMatchingChild
  })
}
```

## Department Hierarchy

### Lead Department

**Primary responsible department:**
- Inherited by child work items
- Used for permission checks
- Required for completion review

### Coordinating Departments

**Supporting departments:**
- Array of department IDs
- Can view work item details
- Scoped participant management for dept admins

### Department Path

**Hierarchy for permission checks:**
```typescript
function getLeadDeptIdsInPath(item: WorkItem): string[] {
  const path: string[] = []
  let current = item
  while (current) {
    if (current.lead_department_id) {
      path.push(current.lead_department_id)
    }
    current = getParent(current)
  }
  return path
}
```

## Common Patterns

### Hide UI elements by permission

```typescript
const canEdit = canEditWorkItem({...})

{canEdit && (
  <button onClick={handleEdit}>Chỉnh sửa</button>
)}

{canManageWorkItemStructure({...}) && (
  <>
    <button onClick={handleAddChild}>Thêm công việc con</button>
    <button onClick={handleDelete}>Xóa</button>
  </>
)}
```

### Filter participants by scope

```typescript
const scope = participantManagementScope({...})

const availableUsers = allUsers.filter(user => {
  if (scope === 'all_related_departments') {
    return relatedDepartmentIds.includes(user.department_id)
  }
  if (scope === 'own_department') {
    return user.department_id === profile.department_id
  }
  return false // scope === 'none'
})
```

### Conditional completion flow

```typescript
const canCompleteDirectly = canCompleteWorkItemDirectly({...})

const handleComplete = async () => {
  if (canCompleteDirectly) {
    // Direct completion
    await saveWorkItem({ ...workItem, status: 'completed' })
    notify('Đã hoàn thành công việc.')
  } else {
    // Submit request
    await submitCompletionRequest({
      work_item_id: workItem.id,
      submitted_by: profile.id
    })
    notify('Đã gửi yêu cầu hoàn thành.')
  }
}
```

### Show/hide review button

```typescript
const request = getCompletionRequest(workItem.id)

{request && canReviewCompletion({
  profile,
  projectCanManage: project.can_manage,
  leadDepartmentId: workItem.lead_department_id,
  submittedBy: request.submitted_by
}) && (
  <div>
    <button onClick={() => handleApprove(request.id)}>Duyệt</button>
    <button onClick={() => handleReject(request.id)}>Từ chối</button>
  </div>
)}
```

## Admin Account Protection

**Root admin cannot be modified:**

```typescript
// In UsersPage
const isRootAdmin = user.username === 'admin'

<TableRow>
  <TableCell>{user.full_name}</TableCell>
  <TableCell>{user.role}</TableCell>
  {!isRootAdmin && (
    <TableCell>
      <button onClick={() => handleEdit(user)}>Sửa</button>
      <button onClick={() => handleDelete(user.id)}>Xóa</button>
    </TableCell>
  )}
</TableRow>
```

## Debugging Permissions

**Check what user can do:**

```typescript
console.log('Can edit:', canEditWorkItem({...}))
console.log('Can manage structure:', canManageWorkItemStructure({...}))
console.log('Can view details:', canViewWorkItemDetails({...}))
console.log('Can review:', canReviewCompletion({...}))
console.log('Can complete:', canCompleteWorkItemDirectly({...}))
console.log('Participant scope:', participantManagementScope({...}))
```

**Common issues:**
- User can't edit → check if they're in `participant_ids`
- User can't review → check if `submittedBy === profile.id` (self-review blocked)
- User can't see work item → check department permissions
- User can't add participants → check `participantManagementScope`
