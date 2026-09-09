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

    const loadProfile = async (userId: string) => {
      const { data } = await client.from('profiles').select('*').eq('id', userId).maybeSingle()
      setProfile((data as Profile | null) ?? null)
    }

    void client.auth.getSession().then(async ({ data }) => {
      setSession(data.session)
      if (data.session) await loadProfile(data.session.user.id)
      setLoading(false)
    })

    const { data: listener } = client.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession)
      if (nextSession) {
        void loadProfile(nextSession.user.id)
      } else {
        setProfile(null)
      }
    })

    return () => listener.subscription.unsubscribe()
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
        if (supabase) await supabase.auth.signOut()
      },
      async changePassword(currentPassword, newPassword) {
        if (!supabase || !profile) return 'Không xác định được tài khoản đang đăng nhập.'
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
