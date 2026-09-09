export type AppRole = 'manager' | 'employee'

export type ProjectStatus = 'draft' | 'active' | 'completed' | 'archived'

export type WorkItemStatus =
  | 'not_started'
  | 'in_progress'
  | 'pending_approval'
  | 'completed'

export interface Profile {
  id: string
  username: string
  full_name: string
  role: AppRole
  department_id: string | null
  active: boolean
}

export interface Department {
  id: string
  code: string
  name: string
  active: boolean
}

export interface UserProfile extends Profile {
  department: Pick<Department, 'code' | 'name'> | null
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

export interface WorkItem {
  id: string
  project_id: string
  parent_id: string | null
  wbs: string
  name: string
  source_responsibility_text: string | null
  start_date: string | null
  end_date: string | null
  status: WorkItemStatus
  sort_order: number
  version: number
  created_at: string
  updated_at: string
  participant_ids: string[]
  attachment: Attachment | null
}

export interface Attachment {
  id: string
  work_item_id: string
  storage_path: string
  file_name: string
  mime_type: string | null
  size_bytes: number
  uploaded_by: string
  uploaded_at: string
}

export interface ProgressUpdate {
  id: string
  work_item_id: string
  content: string
  created_by: string
  created_at: string
  author?: Pick<Profile, 'username' | 'full_name'> | null
}

export interface Milestone {
  id: string
  project_id: string
  name: string
  due_date: string
  condition_text: string | null
  owner_text: string | null
  achieved: boolean
  achieved_at: string | null
  sort_order: number
}

export interface CompletionRequest {
  id: string
  work_item_id: string
  attempt_no: number
  note: string | null
  status: 'pending' | 'approved' | 'rejected'
  submitted_by: string
  submitted_at: string
  work_item?: Pick<WorkItem, 'id' | 'project_id' | 'wbs' | 'name'> | null
  submitter?: Pick<Profile, 'username' | 'full_name'> | null
  project?: Pick<Project, 'id' | 'code' | 'name'> | null
}
