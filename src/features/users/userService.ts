import { supabase } from '../../lib/supabase'
import type { AppRole, UserProfile } from '../../types/domain'

export interface CreateUserInput {
  username: string
  fullName: string
  password: string
  role: AppRole
}

interface UserActionInput {
  action: 'update_profile' | 'set_active' | 'reset_password'
  targetUserId: string
  fullName?: string
  password?: string
  role?: AppRole
  active?: boolean
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
      action: 'create',
      username: input.username,
      fullName: input.fullName,
      password: input.password,
      role: input.role,
    },
  })

  if (error) throw error
}

async function invokeUserAction(input: UserActionInput): Promise<void> {
  if (!supabase) throw new Error('Chưa cấu hình kết nối Supabase.')
  const { error } = await supabase.functions.invoke('admin-create-user', { body: input })
  if (error) throw error
}

export async function updateUserProfile(userId: string, fullName: string, role: AppRole): Promise<void> {
  await invokeUserAction({ action: 'update_profile', targetUserId: userId, fullName, role })
}

export async function setUserActive(userId: string, active: boolean): Promise<void> {
  await invokeUserAction({ action: 'set_active', targetUserId: userId, active })
}

export async function resetUserPassword(userId: string, password: string): Promise<void> {
  await invokeUserAction({ action: 'reset_password', targetUserId: userId, password })
}
