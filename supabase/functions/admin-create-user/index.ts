import { createClient } from 'jsr:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

type AppRole = 'manager' | 'employee'

interface RequestBody {
  username?: string
  password?: string
  role?: AppRole
  department_id?: string
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  const authorization = request.headers.get('Authorization')

  if (!supabaseUrl || !anonKey || !serviceRoleKey || !authorization) {
    return json({ error: 'Unauthorized' }, 401)
  }

  const callerClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const { data: callerData, error: callerError } = await callerClient.auth.getUser()
  if (callerError || !callerData.user) return json({ error: 'Unauthorized' }, 401)

  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const { data: callerProfile } = await adminClient
    .from('profiles')
    .select('role, active')
    .eq('id', callerData.user.id)
    .maybeSingle()

  if (callerProfile?.role !== 'manager' || !callerProfile.active) {
    return json({ error: 'Forbidden' }, 403)
  }

  let body: RequestBody
  try {
    body = await request.json()
  } catch {
    return json({ error: 'Dữ liệu không hợp lệ.' }, 400)
  }

  const username = body.username?.trim().toLowerCase()
  const password = body.password ?? ''
  const role = body.role === 'manager' ? 'manager' : 'employee'
  const departmentId = body.department_id?.trim() || null

  if (!username || !/^[a-z0-9._-]{3,32}$/.test(username) || password.length < 8) {
    return json({ error: 'Thiếu hoặc sai dữ liệu tài khoản.' }, 400)
  }

  if (role === 'employee' && !departmentId) {
    return json({ error: 'Nhân viên phải được gán phòng ban.' }, 400)
  }

  if (departmentId) {
    const { data: department } = await adminClient
      .from('departments')
      .select('id')
      .eq('id', departmentId)
      .eq('active', true)
      .maybeSingle()
    if (!department) return json({ error: 'Phòng ban không hợp lệ.' }, 400)
  }

  const { data: created, error: createError } = await adminClient.auth.admin.createUser({
    email: `${username}@ptpk.local`,
    password,
    email_confirm: true,
    user_metadata: { username, full_name: username },
  })
  if (createError || !created.user) {
    return json({ error: createError?.message ?? 'Không tạo được tài khoản.' }, 400)
  }

  const { error: profileError } = await adminClient
    .from('profiles')
    .update({ username, full_name: username, role, department_id: departmentId, active: true })
    .eq('id', created.user.id)

  if (profileError) {
    await adminClient.auth.admin.deleteUser(created.user.id)
    return json({ error: 'Không gán được hồ sơ người dùng.' }, 500)
  }

  return json({ id: created.user.id, username, role }, 201)
})
