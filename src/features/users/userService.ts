import { supabase } from '../../lib/supabase'
import type { AppRole, UserProfile } from '../../types/domain'

export interface CreateUserInput {
  username: string
  password: string
  role: AppRole
}

export async function listUsers(): Promise<UserProfile[]> {
  if (!supabase) return []
  const { data, error } = await supabase
    .from('profiles')
    .select('id, username, full_name, role, active')
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
    },
  })

  if (error) throw error
}
