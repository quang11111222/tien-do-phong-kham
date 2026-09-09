import { supabase } from '../../lib/supabase'
import type { AppRole, Department, UserProfile } from '../../types/domain'

export interface CreateUserInput {
  username: string
  password: string
  role: AppRole
  departmentId: string | null
}

export async function listDepartments(): Promise<Department[]> {
  if (!supabase) return []
  const { data, error } = await supabase
    .from('departments')
    .select('id, code, name, active')
    .eq('active', true)
    .order('code')

  if (error) throw error
  return (data ?? []) as Department[]
}

export async function listUsers(): Promise<UserProfile[]> {
  if (!supabase) return []
  const { data, error } = await supabase
    .from('profiles')
    .select('id, username, full_name, role, department_id, active, department:departments(code, name)')
    .order('full_name')

  if (error) throw error
  return (data ?? []) as unknown as UserProfile[]
}

export async function createUser(input: CreateUserInput): Promise<void> {
  if (!supabase) throw new Error('Chưa cấu hình kết nối Supabase.')

  const { error } = await supabase.functions.invoke('admin-create-user', {
    body: {
      username: input.username,
      password: input.password,
      role: input.role,
      department_id: input.departmentId,
    },
  })

  if (error) throw error
}
