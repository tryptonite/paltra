import React, { createContext, useContext, useEffect, useState } from 'react'
import { User, Session, AuthError } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'

// Simple profile type for testing
type UserProfile = {
  id: string
  email: string
  full_name: string | null
  department: string | null
  role: string | null
  company: string | null
  is_approved: boolean | null
  created_at: string
  updated_at: string
}

interface AuthContextType {
  user: User | null
  profile: UserProfile | null
  session: Session | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<{ error: AuthError | null }>
  signUp: (email: string, password: string, userData: Partial<UserProfile>) => Promise<{ error: AuthError | null }>
  signOut: () => Promise<{ error: AuthError | null }>
  updateProfile: (updates: Partial<UserProfile>) => Promise<{ error: AuthError | null }>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    console.log('AuthProvider: Initializing...')
    
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log('AuthProvider: Initial session:', session?.user?.email || 'No user')
      setSession(session)
      setUser(session?.user ?? null)
      if (session?.user) {
        // Create a simple profile for testing
        setProfile({
          id: session.user.id,
          email: session.user.email || '',
          full_name: null,
          department: null,
          role: 'user',
          company: null,
          is_approved: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
      }
      setLoading(false)
    })

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('AuthProvider: Auth state change:', event, session?.user?.email || 'No user')
      setSession(session)
      setUser(session?.user ?? null)
      
      if (session?.user) {
        // Create a simple profile for testing
        setProfile({
          id: session.user.id,
          email: session.user.email || '',
          full_name: null,
          department: null,
          role: 'user',
          company: null,
          is_approved: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
      } else {
        setProfile(null)
      }
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    return { error }
  }

  const signUp = async (email: string, password: string, userData: Partial<UserProfile>) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    })

    if (error) {
      return { error }
    }

    if (data.user) {
      // Create a simple profile for testing
      setProfile({
        id: data.user.id,
        email: data.user.email || '',
        full_name: userData.full_name || null,
        department: userData.department || null,
        role: userData.role || 'user',
        company: userData.company || null,
        is_approved: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
    }

    return { error: null }
  }

  const signOut = async () => {
    const { error } = await supabase.auth.signOut()
    if (!error) {
      setUser(null)
      setProfile(null)
      setSession(null)
    }
    return { error }
  }

  const updateProfile = async (updates: Partial<UserProfile>) => {
    if (!user) {
      return { error: { message: 'No user logged in' } as AuthError }
    }

    setProfile(prev => prev ? { ...prev, ...updates } : null)
    return { error: null }
  }

  const value = {
    user,
    profile,
    session,
    loading,
    signIn,
    signUp,
    signOut,
    updateProfile,
  }

  console.log('AuthProvider: Rendering with state:', { user: !!user, profile: !!profile, loading })
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
