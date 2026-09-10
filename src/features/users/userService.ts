import { supabase } from '../../lib/supabase'
import type { AppRole, Department, UserProfile } from '../../types/domain'

export interface CreateUserInput {
  username: string
  fullName: string
  password: string
  role: AppRole
  departmentId: string | null
  isDepartmentAdmin: boolean
}

interface UserActionInput {
  action: 'update_profile' | 'set_active' | 'reset_password'
  targetUserId: string
  fullName?: string
  password?: string
  role?: AppRole
  active?: boolean
  departmentId?: string | null
  isDepartmentAdmin?: boolean
}

export async function listUsers(): Promise<UserProfile[]> {
  if (!supabase) return []
  const { data, error } = await supabase
    .from('profiles')
    .select('id, username, full_name, role, department_id, is_department_admin, active, department:departments(id, code, name, active)')
    .order('full_name')

  if (error) throw error
  return (data ?? []).map((row) => ({ ...row, department: Array.isArray(row.department) ? row.department[0] ?? null : row.department })) as unknown as UserProfile[]
}

export async function listDepartments(): Promise<Department[]> {
  if (!supabase) return []
  const { data, error } = await supabase.from('departments').select('id, code, name, active').eq('active', true).order('sort_order')
  if (error) throw error
  return (data ?? []) as Department[]
}

export async function createUser(input: CreateUserInput): Promise<void> {
  if (!supabase) throw new Error('Chưa cấu hình kết nối Supabase.')

  const { error } = await supabase.functions.invoke('admin-create-user', {
    body: {
      action: 'create',
      username: input.username,
      fullName: input.fullName,
      password: input.password,
      role: input.role,
      departmentId: input.departmentId,
      isDepartmentAdmin: input.isDepartmentAdmin,
    },
  })

  if (error) throw error
}

async function invokeUserAction(input: UserActionInput): Promise<void> {
  if (!supabase) throw new Error('Chưa cấu hình kết nối Supabase.')
  const { error } = await supabase.functions.invoke('admin-create-user', { body: input })
  if (error) throw error
}

export async function updateUserProfile(userId: string, fullName: string, role: AppRole, departmentId: string | null, isDepartmentAdmin: boolean): Promise<void> {
  await invokeUserAction({ action: 'update_profile', targetUserId: userId, fullName, role, departmentId, isDepartmentAdmin })
}

export async function setUserActive(userId: string, active: boolean): Promise<void> {
  await invokeUserAction({ action: 'set_active', targetUserId: userId, active })
}

export async function resetUserPassword(userId: string, password: string): Promise<void> {
  await invokeUserAction({ action: 'reset_password', targetUserId: userId, password })
}
