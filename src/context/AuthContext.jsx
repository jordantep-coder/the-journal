import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabaseClient'

const AuthContext = createContext(null)

// RLS on public.users only lets an ACTIVE user select rows (including their
// own), via is_active_user(). So "signed in but no profile row comes back"
// is exactly how a deactivated account is blocked — that's enforced by the
// database, not this check; this just turns it into a message + sign-out.
async function loadProfile(userId) {
  const { data, error } = await supabase.from('users').select('*').eq('id', userId).maybeSingle()
  if (error) throw error
  return data
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState(undefined) // undefined = not yet checked
  const [profile, setProfile] = useState(null)
  const [inactive, setInactive] = useState(false)
  const [loading, setLoading] = useState(true)

  const refreshProfile = useCallback(async (userId) => {
    const row = await loadProfile(userId)
    if (!row) {
      setInactive(true)
      setProfile(null)
      await supabase.auth.signOut()
      return
    }
    setInactive(false)
    setProfile(row)
  }, [])

  useEffect(() => {
    let cancelled = false

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (cancelled) return
      setSession(session)
      if (session) await refreshProfile(session.user.id)
      setLoading(false)
    })

    const { data: subscription } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (cancelled) return
      setSession(session)
      if (session) {
        await refreshProfile(session.user.id)
      } else {
        setProfile(null)
      }
    })

    return () => {
      cancelled = true
      subscription.subscription.unsubscribe()
    }
  }, [refreshProfile])

  const signIn = useCallback(async (email, password) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
  }, [])

  const signOut = useCallback(async () => {
    await supabase.auth.signOut()
  }, [])

  const value = {
    session,
    profile,
    inactive,
    loading,
    isAuthenticated: Boolean(session && profile),
    signIn,
    signOut,
    refreshProfile: () => session && refreshProfile(session.user.id),
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider')
  return ctx
}
