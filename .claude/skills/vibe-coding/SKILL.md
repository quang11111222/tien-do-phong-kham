---
name: vibe-coding
description: "Use when working with AI assistant to build features efficiently. Covers prompt strategies, iterative refinement, code review, and best practices for AI-assisted development."
---

# Vibe Coding Best Practices

## Core Philosophy

**Vibe coding** = natural conversation + iterative refinement + continuous validation

Not about perfect prompts. About flowing dialogue with AI to build software together.

## Effective Prompting Patterns

### 1. Context-Rich Initial Prompts

**Good:**
```
Tôi cần thêm tính năng "Nhật ký hoạt động" cho dự án.
- Hiển thị timeline các sự kiện (progress updates, completion requests)
- Filter theo work item hoặc thời gian
- Đánh dấu đã đọc khi user mở work item
- Dùng bảng progress_updates và completion_requests
- Style giống ActivityFeed component hiện tại
```

**Bad:**
```
Tạo trang nhật ký
```

### 2. Reference Existing Patterns

```
Tạo component MilestoneCard theo pattern giống WorkItemCard trong GanttView.tsx:
- Props: milestone, onEdit, onDelete
- Hiển thị date, linked work items
- Edit/Delete buttons với permission check
- CSS module riêng
```

### 3. Incremental Refinement

**Round 1:** "Tạo API function getProjectActivity"
**Round 2:** "Thêm filter theo date range"
**Round 3:** "Thêm pagination, 20 items per page"
**Round 4:** "Thêm loading skeleton khi fetch"

### 4. Show Examples

```
Tạo StatusBadge component:

Example usage:
<StatusBadge status="completed" />
<StatusBadge status="pending_approval" />

Should render:
<span className="status-badge status-completed">Hoàn thành</span>
```

## Iterative Development Workflow

### Phase 1: Skeleton

**Prompt:** "Tạo component cơ bản với props interface, chưa cần logic"

**Result:** Component với TypeScript types, empty render

### Phase 2: Data Layer

**Prompt:** "Thêm API calls và state management"

**Result:** useEffect fetch, loading states, error handling

### Phase 3: UI/UX

**Prompt:** "Hoàn thiện UI với styling và interactions"

**Result:** CSS, event handlers, animations

### Phase 4: Polish

**Prompt:** "Thêm edge cases, empty states, accessibility"

**Result:** Error boundaries, ARIA labels, keyboard navigation

## Code Review Checklist

When AI generates code, verify:

- [ ] **Permissions:** Kiểm tra `canEditWorkItem`, `canReviewCompletion` trước actions
- [ ] **Dirty tracking:** Gọi `onDirtyChange(true/false)` khi có thay đổi
- [ ] **Optimistic locking:** Dùng `version` field khi update work items
- [ ] **Auto-refresh:** Disable khi `hasUnsavedChanges`
- [ ] **Error handling:** Try/catch với user-friendly messages
- [ ] **Loading states:** Skeleton/spinner khi fetch
- [ ] **TypeScript types:** Không dùng `any`
- [ ] **Accessibility:** ARIA labels, keyboard navigation

## Common Anti-Patterns

### ❌ Over-Engineering

**Bad:** "Tạo abstract BaseService class với generic CRUD methods"

**Good:** "Tạo function getWorkItems cụ thể, copy pattern từ getProjects"

### ❌ Premature Optimization

**Bad:** "Tối ưu performance với memo và virtualization ngay từ đầu"

**Good:** "Viết code đơn giản trước, optimize sau nếu cần"

### ❌ Copy-Paste Without Understanding

**Bad:** Blindly accepting AI suggestions

**Good:** Read generated code, ask "tại sao dùng pattern này?", verify logic

## Feedback Loop

### When AI Gets It Right

```
Perfect! Giữ pattern này làm template cho các component khác.
```

Save to memory: "User likes this pattern for feature components"

### When AI Gets It Wrong

```
Không đúng. Cần check permission trước khi show nút Edit.
Xem canEditWorkItem trong permissions.ts và áp dụng.
```

Explain **why** it's wrong, not just **what** is wrong.

### When You're Unsure

```
Pattern này có vẻ over-engineered. Có cách đơn giản hơn không?
```

Ask for alternatives before committing.

## Project-Specific Guidelines

### Hash-Based Routing

```typescript
// Navigate
window.history.pushState(null, '', routeHash('gantt', project.code, workItemId))

// Listen
window.addEventListener('hashchange', onHashChange)
```

**Why:** Không dùng React Router để avoid extra dependency.

### Dirty Tracking Pattern

```typescript
const [hasChanges, setHasChanges] = useState(false)

useEffect(() => {
  onDirtyChange(hasChanges)
}, [hasChanges, onDirtyChange])

// On change
setHasChanges(true)

// On save
setHasChanges(false)
```

**Why:** TrackerShell shows confirm dialog khi navigate với unsaved changes.

### Permission Checks

```typescript
const canEdit = canEditWorkItem({
  role: profile.role,
  canManageProject: project.can_manage,
  userId: profile.id,
  participantIds: workItem.participant_ids
})

{canEdit && <EditButton />}
```

**Why:** Centralized permission logic in `lib/permissions.ts`.

## Debugging with AI

### Share Context

```
Lỗi "Cannot read property 'map' of undefined" ở dòng 42.
Data trả về từ API có shape khác expected.
Đây là response log: {...}
```

### Ask for Explanations

```
Tại sao dùng useEffect với dependency array [project.id] mà không phải [project]?
Giải thích stale closure là gì.
```

### Request Alternatives

```
Cách này quá phức tạp. Có approach đơn giản hơn không?
Show 2-3 options với pros/cons.
```

## Testing Strategy

### Test Critical Paths

```typescript
// permissions.ts - business logic
describe('canReviewCompletion', () => {
  it('prevents self-review', () => { ... })
})

// trackerService.ts - API calls
describe('saveWorkItem', () => {
  it('detects version conflict', () => { ... })
})
```

### Skip Low-Value Tests

- CSS styling
- Simple getters/setters
- Third-party library wrappers

## When to Ask for Help

### ✅ Good Questions

- "Permission logic này có đúng không?"
- "Tại sao optimistic lock không hoạt động?"
- "Pattern này có scalable không?"

### ❌ Unnecessary Questions

- "Nên dùng TypeScript hay JavaScript?" (obviously TS)
- "Nên viết test không?" (obviously yes)
- "Nên handle errors không?" (obviously yes)

## Iteration Speed

### Fast Iterations

- Small, focused changes
- Clear acceptance criteria
- Immediate feedback

### Slow Iterations

- Large, ambiguousous tasks
- Vague requirements
- Delayed feedback

**Rule:** Mỗi prompt nên giải quyết **một** vấn đề cụ thể.

## Code Ownership

### AI Generates → You Own

- Review every line
- Understand the logic
- Test edge cases
- Maintain the code

### You're the Architect

AI là assistant, không phải author. You make design decisions, AI executes.

## Common Workflows

### Add New Feature

1. **Describe:** "Thêm tính năng X với requirements..."
2. **Skeleton:** "Tạo component structure"
3. **Data:** "Thêm API calls"
4. **UI:** "Hoàn thiện giao diện"
5. **Polish:** "Thêm error handling, loading states"
6. **Test:** "Viết test cho critical paths"

### Fix Bug

1. **Reproduce:** "Lỗi xảy ra khi..."
2. **Diagnose:** "Nguyên nhân có thể là..."
3. **Fix:** "Sửa bằng cách..."
4. **Verify:** "Test lại scenario..."

### Refactor

1. **Identify:** "Code này duplicated ở..."
2. **Extract:** "Tạo helper function..."
3. **Replace:** "Update tất cả call sites..."
4. **Test:** "Đảm bảo không break..."

## Quality Gates

Before marking task complete:

- [ ] Code runs without errors
- [ ] Edge cases handled
- [ ] Permissions checked
- [ ] Loading states present
- [ ] Error messages user-friendly
- [ ] TypeScript types correct
- [ ] No console warnings
- [ ] Tested in browser (if UI)

## Anti-Patterns to Avoid

### ❌ Prompt Injection

Never trust external input in prompts. Validate all user input.

### ❌ Cargo Cult Programming

Don't copy patterns without understanding **why** they work.

### ❌ Premature Abstraction

Three similar lines > premature abstraction.

### ❌ Silent Failures

Always surface errors to user. Never swallow exceptions.

## Continuous Learning

### After Each Feature

Ask yourself:
- What worked well?
- What was confusing?
- What would I do differently?

Save insights to memory for future sessions.

### Build Pattern Library

Document reusable patterns:
- Component structure
- API call patterns
- Permission checks
- Error handling

Reference in future prompts: "Giống pattern trong WorkItemCard"

## Summary

**Vibe coding = conversation + iteration + validation**

1. Start with clear context
2. Build incrementally
3. Review everything
4. Test critical paths
5. Learn from feedback

The goal: Ship quality software efficiently through natural dialogue with AI.
