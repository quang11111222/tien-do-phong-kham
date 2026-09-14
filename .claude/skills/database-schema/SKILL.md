---
name: database-schema
description: "Use when working with database tables, queries, or migrations. Covers table structures, relationships, RPCs, and common queries for projects, work items, evidence, and users."
---

# Database Schema

## Core Tables

### projects

```sql
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  start_date DATE,
  end_date DATE,
  deleted_at TIMESTAMP WITH TIME ZONE,
  deleted_by UUID REFERENCES profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**Soft delete:** Check `deleted_at IS NULL` when querying.

### profiles

```sql
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  username TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('manager', 'employee')),
  department_id UUID REFERENCES departments(id),
  is_department_admin BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**Roles:** `manager` (system admin), `employee` (regular staff)

**Additional flags:**
- `is_department_admin` — user is dept admin for their department
- Project-level `can_manage` stored in separate table (see below)

### departments

```sql
CREATE TABLE departments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  parent_id UUID REFERENCES departments(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**Hierarchy:** `parent_id` creates department tree structure.

### work_items

```sql
CREATE TABLE work_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES work_items(id) ON DELETE CASCADE,
  wbs_number TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  lead_department_id UUID REFERENCES departments(id),
  coordinating_department_ids UUID[] DEFAULT '{}',
  participant_ids UUID[] DEFAULT '{}',
  status TEXT NOT NULL CHECK (status IN ('not_started', 'in_progress', 'pending_approval', 'completed')),
  progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  start_date DATE,
  end_date DATE,
  actual_start_date DATE,
  actual_end_date DATE,
  version INTEGER DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(project_id, wbs_number)
);
```

**Key fields:**
- `parent_id` — creates work item hierarchy (1 → 1.1 → 1.1.1)
- `wbs_number` — auto-generated (e.g., "1", "1.1", "1.1.1")
- `version` — optimistic locking (increment on update)
- `lead_department_id` — primary responsible department (inherited by children)
- `coordinating_department_ids` — array of supporting departments
- `participant_ids` — array of user IDs assigned to work item

### project_managers

```sql
CREATE TABLE project_managers (
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  PRIMARY KEY (project_id, user_id)
);
```

**Purpose:** Users in this table have `can_manage = true` for that project.

### attachments (evidence)

```sql
CREATE TABLE attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  work_item_id UUID NOT NULL REFERENCES work_items(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  uploaded_by UUID REFERENCES profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**Storage:** Files stored in Supabase Storage bucket `evidence` at `file_path`.

### progress_updates

```sql
CREATE TABLE progress_updates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  work_item_id UUID NOT NULL REFERENCES work_items(id) ON DELETE CASCADE,
  progress INTEGER NOT NULL CHECK (progress >= 0 AND progress <= 100),
  note TEXT,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### completion_requests

```sql
CREATE TABLE completion_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  work_item_id UUID NOT NULL REFERENCES work_items(id) ON DELETE CASCADE,
  submitted_by UUID NOT NULL REFERENCES profiles(id),
  status TEXT NOT NULL CHECK (status IN ('submitted', 'approved', 'rejected')),
  note TEXT,
  reviewed_by UUID REFERENCES profiles(id),
  review_note TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  reviewed_at TIMESTAMP WITH TIME ZONE
);
```

**Workflow:**
1. Employee submits → status `submitted`
2. Manager/dept admin reviews → status `approved` or `rejected`
3. If approved → work item status → `completed`
4. If rejected → work item status → `in_progress`

### milestones

```sql
CREATE TABLE milestones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  date DATE NOT NULL,
  description TEXT,
  linked_work_item_ids UUID[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### personal_notifications

```sql
CREATE TABLE personal_notifications (
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  work_item_id UUID REFERENCES work_items(id) ON DELETE CASCADE,
  seen_at TIMESTAMP WITH TIME ZONE,
  PRIMARY KEY (user_id, work_item_id)
);
```

**Purpose:** Track which work items user has seen (for unread indicators).

### work_item_reads

```sql
CREATE TABLE work_item_reads (
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  work_item_id UUID REFERENCES work_items(id) ON DELETE CASCADE,
  seen_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (user_id, work_item_id)
);
```

**Purpose:** Track last seen time per work item for activity feed.

## Common Queries

### Get work items with hierarchy

```typescript
const { data } = await supabase
  .from('work_items')
  .select(`
    *,
    lead_department:departments!lead_department_id(id, name, code),
    coordinating_departments:departments!coordinating_department_ids(id, name, code)
  `)
  .eq('project_id', projectId)
  .order('wbs_number', { ascending: true })
```

### Get work items with children

```typescript
const { data } = await supabase
  .from('work_items')
  .select(`
    *,
    children:work_items!parent_id(*)
  `)
  .eq('project_id', projectId)
  .is('parent_id', null)  // root items
```

### Get completion requests pending review

```typescript
const { data } = await supabase
  .from('completion_requests')
  .select(`
    *,
    work_item:work_items(
      id,
      title,
      project_id,
      lead_department_id
    ),
    submitter:profiles!submitted_by(id, full_name)
  `)
  .eq('status', 'submitted')
```

### Get projects user can manage

```typescript
const { data } = await supabase
  .from('projects')
  .select(`
    *,
    can_manage:project_managers!inner(user_id)
  `)
  .is('deleted_at', null)
  .or(`can_manage.user_id.eq.${userId},projects.created_by.eq.${userId}`)
```

### Count unread work items

```typescript
const { data } = await supabase
  .rpc('get_unread_work_item_count', {
    p_project_id: projectId,
    p_user_id: userId
  })
```

## RPCs (Remote Procedure Calls)

### update_work_item_details

**Atomic update with optimistic locking:**

```typescript
const { data, error } = await supabase
  .rpc('update_work_item_details', {
    p_work_item_id: workItemId,
    p_version: currentVersion,
    p_updates: {
      title: 'New title',
      status: 'in_progress',
      progress: 50
    }
  })

// Returns: updated work item
// Throws error if version mismatch
```

### create_work_item

**Create with auto WBS numbering:**

```typescript
const { data } = await supabase
  .rpc('create_work_item', {
    p_project_id: projectId,
    p_parent_id: parentId || null,
    p_title: 'New task',
    p_lead_department_id: departmentId,
    p_coordinating_department_ids: [],
    p_participant_ids: [],
    p_start_date: '2026-01-01',
    p_end_date: '2026-01-31'
  })

// Auto-generates WBS number
// Inherits lead_department_id from parent if child
```

### submit_work_item_completion

**Submit completion request with validation:**

```typescript
const { data } = await supabase
  .rpc('submit_work_item_completion', {
    p_work_item_id: workItemId,
    p_submitted_by: userId,
    p_note: 'Completion note'
  })

// Validates:
// - Work item exists
// - User is participant
// - Evidence attached
// - Creates completion_request
// - Updates work_item status → pending_approval
```

### import_project_plan

**Bulk import from Excel:**

```typescript
const { data } = await supabase
  .rpc('import_project_plan', {
    p_project_id: projectId,
    p_work_items: [
      {
        wbs_number: '1',
        title: 'Task 1',
        lead_department_id: deptId,
        start_date: '2026-01-01',
        end_date: '2026-01-31'
      },
      // ...
    ]
  })

// Returns: { created: 10, updated: 5 }
```

### save_milestone_draft

**Save milestone with linked work items:**

```typescript
const { data } = await supabase
  .rpc('save_milestone_draft', {
    p_project_id: projectId,
    p_milestone_id: milestoneId || null,
    p_title: 'Milestone name',
    p_date: '2026-06-30',
    p_linked_work_item_ids: [workItemId1, workItemId2]
  })
```

### get_unread_work_item_count

**Count work items with new activity:**

```typescript
const { data } = await supabase
  .rpc('get_unread_work_item_count', {
    p_project_id: projectId,
    p_user_id: userId
  })

// Returns: number of unread work items
```

## Migrations

**Location:** `supabase/migrations/`

**Naming convention:** `YYYYMMDDHHMMSS_description.sql`

**Example:**
```sql
-- 20260101120000_add_work_item_fields.sql
ALTER TABLE work_items
ADD COLUMN actual_start_date DATE,
ADD COLUMN actual_end_date DATE;

CREATE INDEX idx_work_items_dates ON work_items(start_date, end_date);
```

**Run migrations:**
```bash
supabase db push
```

## Common Patterns

### Soft delete project

```typescript
await supabase
  .from('projects')
  .update({
    deleted_at: new Date().toISOString(),
    deleted_by: profile.id
  })
  .eq('id', projectId)
```

### Restore deleted project

```typescript
await supabase
  .from('projects')
  .update({
    deleted_at: null,
    deleted_by: null
  })
  .eq('id', projectId)
```

### Query with department info

```typescript
const { data } = await supabase
  .from('work_items')
  .select(`
    *,
    lead_department:departments!lead_department_id(id, name, code),
    coordinating_departments:departments!coordinating_department_ids(id, name, code)
  `)
  .eq('project_id', projectId)
```

### Optimistic lock check

```typescript
const { data, error } = await supabase
  .from('work_items')
  .update({ ...fields, version: workItem.version + 1 })
  .eq('id', workItem.id)
  .eq('version', workItem.version)
  .select()
  .single()

if (!data) {
  throw new Error('Version conflict - work item updated by another user')
}
```
