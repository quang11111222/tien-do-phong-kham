import { supabase } from '../../lib/supabase'
import type { Project } from '../../types/domain'

export async function listProjects(): Promise<Project[]> {
  if (!supabase) return []
  const { data, error } = await supabase
    .from('projects')
    .select('id, code, name, site, start_date, end_date, status, created_at, updated_at')
    .order('updated_at', { ascending: false })

  if (error) throw error
  return (data ?? []) as Project[]
}
