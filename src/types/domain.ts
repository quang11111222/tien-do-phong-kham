export type AppRole = 'manager' | 'employee'

export type ProjectStatus = 'draft' | 'active' | 'completed' | 'archived'

export type WorkItemStatus =
  | 'not_started'
  | 'in_progress'
  | 'pending_approval'
  | 'completed'

export interface Profile {
  id: string
  full_name: string
  role: AppRole
  department_id: string | null
  active: boolean
}

export interface Project {
  id: string
  code: string
  name: string
  site: string | null
  start_date: string | null
  end_date: string | null
  status: ProjectStatus
  created_at: string
  updated_at: string
}
