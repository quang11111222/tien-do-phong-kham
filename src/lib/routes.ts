export type Page = 'projects' | 'overview' | 'gantt' | 'milestones' | 'activity' | 'approvals' | 'users'

export interface AppRoute {
  page: Page
  projectKey: string | null
}

const projectPages = new Set<Page>(['overview', 'gantt', 'milestones', 'activity'])

export function routeHash(page: Page, projectKey: string | null = null) {
  if (projectPages.has(page) && projectKey) return `#/projects/${encodeURIComponent(projectKey)}/${page}`
  if (page === 'approvals' || page === 'users') return `#/${page}`
  return '#/projects'
}

export function parseRouteHash(hash: string): AppRoute {
  const parts = hash.replace(/^#\/?/, '').split('/').filter(Boolean).map((part) => decodeURIComponent(part))
  if (parts[0] === 'approvals' || parts[0] === 'users') return { page: parts[0], projectKey: null }
  if (parts[0] === 'projects' && parts[1] && projectPages.has(parts[2] as Page)) return { page: parts[2] as Page, projectKey: parts[1] }
  return { page: 'projects', projectKey: null }
}
