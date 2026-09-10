import { describe, expect, it } from 'vitest'
import { parseRouteHash, routeHash } from './routes'

describe('application routes', () => {
  it('builds shareable project URLs', () => {
    expect(routeHash('gantt', 'PK-KHETRE')).toBe('#/projects/PK-KHETRE/gantt')
    expect(routeHash('gantt', 'PK-KHETRE', 'work item/01')).toBe('#/projects/PK-KHETRE/gantt/work/work%20item%2F01')
    expect(routeHash('milestones', 'PK KHE TRE')).toBe('#/projects/PK%20KHE%20TRE/milestones')
  })

  it('parses project and administration URLs', () => {
    expect(parseRouteHash('#/projects/PK-KHETRE/activity')).toEqual({ page: 'activity', projectKey: 'PK-KHETRE', workItemId: null })
    expect(parseRouteHash('#/projects/PK-KHETRE/gantt/work/abc-123')).toEqual({ page: 'gantt', projectKey: 'PK-KHETRE', workItemId: 'abc-123' })
    expect(parseRouteHash('#/users')).toEqual({ page: 'users', projectKey: null, workItemId: null })
  })

  it('falls back to the project portfolio for invalid URLs', () => {
    expect(parseRouteHash('#/unknown')).toEqual({ page: 'projects', projectKey: null, workItemId: null })
  })
})
