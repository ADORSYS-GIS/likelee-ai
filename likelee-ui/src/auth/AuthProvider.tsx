import React, { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { firebaseAuth } from '@/lib/firebase'
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  getIdToken,
  updateProfile,
  User,
} from 'firebase/auth'

interface AuthContextValue {
  initialized: boolean
  authenticated: boolean
  token?: string | undefined
  user?: User | null
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  register: (email: string, password: string, displayName?: string) => Promise<void>
  refreshToken: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [initialized, setInitialized] = useState(false)
  const [user, setUser] = useState<User | null>(null)

  useEffect(() => {
    const unsub = onAuthStateChanged(firebaseAuth, async (u) => {
      setUser(u)
      setInitialized(true)
    })
    return () => unsub()
  }, [])

  // Sync minimal profile to Supabase (id = uid)
  useEffect(() => {
    const sync = async () => {
      if (!user || !supabase) return
      try {
        await supabase.from('profiles').upsert({
          id: user.uid,
          email: user.email,
          first_name: user.displayName ?? null,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'id' })
      } catch {}
    }
    sync()
  }, [user])

  const value: AuthContextValue = useMemo(
    () => ({
      initialized,
      authenticated: !!user,
      user,
      token: undefined,
      login: async (email, password) => {
        await signInWithEmailAndPassword(firebaseAuth, email, password)
      },
      logout: async () => {
        await signOut(firebaseAuth)
      },
      register: async (email, password, displayName) => {
        const cred = await createUserWithEmailAndPassword(firebaseAuth, email, password)
        if (displayName) await updateProfile(cred.user, { displayName })
      },
      refreshToken: async () => {
        if (firebaseAuth.currentUser) await getIdToken(firebaseAuth.currentUser, true)
      },
    }),
    [initialized, user]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
