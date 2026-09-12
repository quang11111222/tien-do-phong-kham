import type { Session } from '@supabase/supabase-js'
import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { isSupabaseConfigured, supabase } from '../../lib/supabase'
import type { Profile } from '../../types/domain'
import { usernameToInternalEmail } from '../../lib/username'
import { AuthContext, type AuthContextValue } from './authContext'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(isSupabaseConfigured)

  useEffect(() => {
    const client = supabase
    if (!client) return
    let profileRequest = 0
    let disposed = false

    const loadProfile = async (userId: string) => {
      const request = ++profileRequest
      const { data } = await client.from('profiles').select('*, department:departments(id, code, name, active)').eq('id', userId).maybeSingle()
      if (disposed || request !== profileRequest) return
      if (!data) { setProfile(null); return }
      setProfile({ ...data, department: Array.isArray(data.department) ? data.department[0] ?? null : data.department } as Profile)
    }

    void client.auth.getSession().then(async ({ data }) => {
      setSession(data.session)
      if (data.session) await loadProfile(data.session.user.id)
      setLoading(false)
    })

    const { data: listener } = client.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession)
      if (nextSession) {
        // Không gọi request dùng Auth ngay trong callback sự kiện Auth.
        setTimeout(() => { if (!disposed) void loadProfile(nextSession.user.id) }, 0)
      } else {
        profileRequest += 1
        setProfile(null)
      }
    })

    return () => { disposed = true; profileRequest += 1; listener.subscription.unsubscribe() }
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      profile,
      loading,
      async signIn(username, password) {
        if (!supabase) return 'Chưa cấu hình kết nối Supabase.'
        const { error } = await supabase.auth.signInWithPassword({
          email: usernameToInternalEmail(username),
          password,
        })
        return error ? 'Tài khoản hoặc mật khẩu không đúng.' : null
      },
      async signOut() {
        if (supabase) {
          await supabase.auth.signOut({ scope: 'local' })
          setSession(null)
          setProfile(null)
        }
      },
      async changePassword(currentPassword, newPassword) {
        if (!supabase || !profile) return 'Không xác định được tài khoản đang đăng nhập.'
        if (profile.username === 'admin') return 'Tài khoản admin gốc không được đổi mật khẩu.'
        if (newPassword.length < 8) return 'Mật khẩu mới phải có ít nhất 8 ký tự.'
        if (currentPassword === newPassword) return 'Mật khẩu mới phải khác mật khẩu hiện tại.'
        const { error: verifyError } = await supabase.auth.signInWithPassword({
          email: usernameToInternalEmail(profile.username),
          password: currentPassword,
        })
        if (verifyError) return 'Mật khẩu hiện tại không đúng.'
        const { error } = await supabase.auth.updateUser({ password: newPassword })
        return error ? 'Không đổi được mật khẩu. Vui lòng thử lại.' : null
      },
    }),
    [loading, profile, session],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
