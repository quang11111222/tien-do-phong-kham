import { describe, expect, it } from 'vitest'
import { parseRouteHash, routeHash } from './routes'

describe('application routes', () => {
  it('builds shareable project URLs', () => {
    expect(routeHash('gantt', 'PK-KHETRE')).toBe('#/projects/PK-KHETRE/gantt')
    expect(routeHash('milestones', 'PK KHE TRE')).toBe('#/projects/PK%20KHE%20TRE/milestones')
  })

  it('parses project and administration URLs', () => {
    expect(parseRouteHash('#/projects/PK-KHETRE/activity')).toEqual({ page: 'activity', projectKey: 'PK-KHETRE' })
    expect(parseRouteHash('#/users')).toEqual({ page: 'users', projectKey: null })
  })

  it('falls back to the project portfolio for invalid URLs', () => {
    expect(parseRouteHash('#/unknown')).toEqual({ page: 'projects', projectKey: null })
  })
})
