export type Page = 'projects' | 'overview' | 'gantt' | 'milestones' | 'activity' | 'approvals' | 'users'

export interface AppRoute {
  page: Page
  projectKey: string | null
  workItemId: string | null
}

const projectPages = new Set<Page>(['overview', 'gantt', 'milestones', 'activity'])

export function routeHash(page: Page, projectKey: string | null = null, workItemId: string | null = null) {
  if (projectPages.has(page) && projectKey) {
    const base = `#/projects/${encodeURIComponent(projectKey)}/${page}`
    return page === 'gantt' && workItemId ? `${base}/work/${encodeURIComponent(workItemId)}` : base
  }
  if (page === 'approvals' || page === 'users') return `#/${page}`
  return '#/projects'
}

export function parseRouteHash(hash: string): AppRoute {
  const parts = hash.replace(/^#\/?/, '').split('/').filter(Boolean).map((part) => decodeURIComponent(part))
  if (parts[0] === 'approvals' || parts[0] === 'users') return { page: parts[0], projectKey: null, workItemId: null }
  if (parts[0] === 'projects' && parts[1] && projectPages.has(parts[2] as Page)) {
    const page = parts[2] as Page
    return { page, projectKey: parts[1], workItemId: page === 'gantt' && parts[3] === 'work' && parts[4] ? parts[4] : null }
  }
  return { page: 'projects', projectKey: null, workItemId: null }
}
