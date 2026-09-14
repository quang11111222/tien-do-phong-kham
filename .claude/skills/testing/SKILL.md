---
name: testing
description: "Use when writing tests, debugging test failures, or setting up test infrastructure. Covers Vitest patterns, mocking Supabase, testing permissions, and common test scenarios."
---

# Testing Guide

## Test Setup

### Vitest Configuration

Tests run with Vitest (configured in `vite.config.ts`):

```typescript
// vite.config.ts
export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts']
  }
})
```

### Run Tests

```bash
# Run all tests
npm test

# Run specific test file
npm test src/lib/permissions.test.ts

# Run with coverage
npm run test:coverage

# Watch mode
npm run test:watch
```

## Permission Testing

### Example: permissions.test.ts

```typescript
import { describe, it, expect } from 'vitest'
import { canEditWorkItem, canReviewCompletion } from './permissions'

describe('canEditWorkItem', () => {
  it('allows manager to edit any work item', () => {
    const result = canEditWorkItem({
      role: 'manager',
      canManageProject: false,
      userId: 'user-1',
      participantIds: []
    })
    expect(result).toBe(true)
  })

  it('allows participant to edit assigned work item', () => {
    const result = canEditWorkItem({
      role: 'employee',
      canManageProject: false,
      userId: 'user-1',
      participantIds: ['user-1', 'user-2']
    })
    expect(result).toBe(true)
  })

  it('denies non-participant employee', () => {
    const result = canEditWorkItem({
      role: 'employee',
      canManageProject: false,
      userId: 'user-1',
      participantIds: ['user-2']
    })
    expect(result).toBe(false)
  })
})

describe('canReviewCompletion', () => {
  it('prevents self-review', () => {
    const result = canReviewCompletion({
      profile: { id: 'user-1', role: 'manager', department_id: null, is_department_admin: false },
      projectCanManage: true,
      leadDepartmentId: 'dept-1',
      submittedBy: 'user-1'  // same user
    })
    expect(result).toBe(false)
  })

  it('allows manager to review others', () => {
    const result = canReviewCompletion({
      profile: { id: 'user-1', role: 'manager', department_id: null, is_department_admin: false },
      projectCanManage: true,
      leadDepartmentId: 'dept-1',
      submittedBy: 'user-2'
    })
    expect(result).toBe(true)
  })
})
```

## Mocking Supabase

### Mock Supabase Client

```typescript
// src/test/mocks/supabase.ts
import { vi } from 'vitest'

export const mockSupabase = {
  from: vi.fn().mockReturnThis(),
  select: vi.fn().mockReturnThis(),
  insert: vi.fn().mockReturnThis(),
  update: vi.fn().mockReturnThis(),
  delete: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  single: vi.fn().mockResolvedValue({ data: null, error: null }),
  rpc: vi.fn().mockResolvedValue({ data: null, error: null })
}

vi.mock('@supabase/supabase-js', () => ({
  createClient: () => mockSupabase
}))
```

### Usage in Tests

```typescript
import { mockSupabase } from '../test/mocks/supabase'
import { getWorkItems } from './trackerService'

describe('getWorkItems', () => {
  it('fetches work items for project', async () => {
    const mockItems = [
      { id: '1', title: 'Task 1', status: 'not_started' },
      { id: '2', title: 'Task 2', status: 'in_progress' }
    ]
    
    mockSupabase.single.mockResolvedValue({ 
      data: mockItems, 
      error: null 
    })
    
    const items = await getWorkItems('project-1')
    
    expect(mockSupabase.from).toHaveBeenCalledWith('work_items')
    expect(mockSupabase.select).toHaveBeenCalled()
    expect(mockSupabase.eq).toHaveBeenCalledWith('project_id', 'project-1')
    expect(items).toEqual(mockItems)
  })
})
```

## Component Testing

### Testing React Components

```typescript
import { render, screen, fireEvent } from '@testing-library/react'
import { StatusBadge } from './StatusBadge'

describe('StatusBadge', () => {
  it('renders correct label for status', () => {
    render(<StatusBadge status="completed" />)
    expect(screen.getByText('Hoàn thành')).toBeInTheDocument()
  })

  it('applies correct CSS class', () => {
    const { container } = render(<StatusBadge status="in_progress" />)
    const badge = container.firstChild
    expect(badge).toHaveClass('status-badge', 'status-in_progress')
  })
})
```

## Integration Tests

### Testing Full Workflow

```typescript
describe('Work item completion workflow', () => {
  it('employee submits completion request', async () => {
    const employee = { id: 'emp-1', role: 'employee' }
    const workItem = { id: 'wi-1', status: 'in_progress' }
    
    // Submit request
    await submitCompletionRequest({
      work_item_id: workItem.id,
      submitted_by: employee.id,
      note: 'Done'
    })
    
    // Verify request created
    const request = await getCompletionRequest(workItem.id)
    expect(request.status).toBe('submitted')
    
    // Verify work item status updated
    const updated = await getWorkItem(workItem.id)
    expect(updated.status).toBe('pending_approval')
  })

  it('manager approves request', async () => {
    const manager = { id: 'mgr-1', role: 'manager' }
    const request = { id: 'req-1', status: 'submitted' }
    
    await reviewCompletionRequest(request.id, {
      status: 'approved',
      reviewed_by: manager.id
    })
    
    const updated = await getCompletionRequest(request.id)
    expect(updated.status).toBe('approved')
  })
})
```

## Common Test Patterns

### Test Fixtures

```typescript
// src/test/fixtures.ts
export const mockProfile: Profile = {
  id: 'user-1',
  username: 'testuser',
  full_name: 'Test User',
  role: 'employee',
  department_id: 'dept-1',
  is_department_admin: false
}

export const mockProject: Project = {
  id: 'proj-1',
  code: 'PRJ001',
  name: 'Test Project',
  can_manage: false
}

export const mockWorkItem: WorkItem = {
  id: 'wi-1',
  project_id: 'proj-1',
  title: 'Test Task',
  status: 'not_started',
  version: 1,
  lead_department_id: 'dept-1',
  participant_ids: ['user-1']
}
```

### Async Test Helpers

```typescript
// Wait for async operations
export const waitForAsync = () => new Promise(resolve => setTimeout(resolve, 0))

// Flush promises
export const flushPromises = () => new Promise(resolve => setTimeout(resolve, 100))
```

## Test Organization

```
src/
  lib/
    permissions.ts
    permissions.test.ts
  features/
    tracker/
      trackerService.ts
      trackerService.test.ts
      GanttView.tsx
      GanttView.test.ts
```

## Coverage Goals

- **Permission functions:** 100% (critical business logic)
- **Service functions:** 80%+ (core API calls)
- **Components:** 60%+ (user interactions)

## Debugging Tests

### Run Single Test

```bash
npm test -- -t "allows manager to edit"
```

### Debug Output

```typescript
it('debug test', () => {
  console.log('Current state:', state)
  // Use debugger statement
  debugger
  expect(result).toBe(true)
})
```

Run with `--inspect-brk`:

```bash
node --inspect-brk node_modules/.bin/vitest run
```
