import React, { createContext, useContext, useEffect, useState } from 'react'
import { User, Session, AuthError, PostgrestError } from '@supabase/supabase-js'
import { supabase, Tables } from '@/lib/supabase'

type UserProfile = Tables<'profiles'>

interface AuthContextType {
  user: User | null
  profile: UserProfile | null
  session: Session | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<{ error: AuthError | null }>
  signUp: (email: string, password: string, userData: Partial<UserProfile>) => Promise<{ error: AuthError | PostgrestError | null }>
  signOut: () => Promise<{ error: AuthError | null }>
  updateProfile: (updates: Partial<UserProfile>) => Promise<{ error: AuthError | PostgrestError | null }>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setUser(session?.user ?? null)
      if (session?.user) {
        fetchProfile(session.user.id)
      } else {
        setLoading(false)
      }
    })

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      setSession(session)
      setUser(session?.user ?? null)
      
      if (session?.user) {
        await fetchProfile(session.user.id)
      } else {
        setProfile(null)
        setLoading(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const fetchProfile = async (userId: string) => {
    try {
      // First try to query with only the columns that exist in the current schema
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, role, created_at, avatar_url')
        .eq('id', userId)
        .single()

      if (error) {
        console.error('Error fetching profile:', error)
        if (error.code === '42P01') {
          console.warn('Profiles table does not exist. Please run the SQL schema in Supabase.')
        } else if (error.code === '42703') {
          console.warn('Profiles table has different schema. Please run the migration script.')
        }
        
        // Create a basic profile from user data
        setProfile({
          id: userId,
          email: user?.email || '',
          full_name: null,
          department: null,
          role: 'user',
          company: null,
          is_approved: false, // New users need approval
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
      } else {
        // Map the existing data to our expected format
        setProfile({
          id: data.id,
          email: user?.email || '', // Get email from auth user
          full_name: data.full_name,
          department: null, // Not available in current schema
          role: data.role || 'user',
          company: null, // Not available in current schema
          is_approved: false, // Not available in current schema, default to false
          created_at: data.created_at,
          updated_at: new Date().toISOString(), // Not available in current schema
        })
      }
    } catch (error) {
      console.error('Error fetching profile:', error)
      // Create a basic profile from user data
      setProfile({
        id: userId,
        email: user?.email || '',
        full_name: null,
        department: null,
        role: 'user',
        company: null,
        is_approved: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
    } finally {
      setLoading(false)
    }
  }

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
      // Create user profile with only the columns that exist in current schema
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: data.user.id,
          full_name: userData.full_name || null,
          role: userData.role || 'user',
        })

      if (profileError) {
        console.error('Error creating profile:', profileError)
        if (profileError.code === '42703') {
          console.warn('Profiles table has different schema. Some fields may not be saved.')
          // Don't fail signup if schema is different, just log the warning
        } else {
          return { error: profileError }
        }
      }
    }

    return { error: null }
  }

  const signOut = async () => {
    const { error } = await supabase.auth.signOut()
    if (!error) {
      // Clear local state immediately
      setUser(null)
      setProfile(null)
      setSession(null)
      setLoading(false)
    }
    return { error }
  }

  const updateProfile = async (updates: Partial<UserProfile>) => {
    if (!user) {
      return { error: { message: 'No user logged in' } as AuthError }
    }

    // Only update fields that exist in the current schema
    const allowedUpdates = {
      full_name: updates.full_name,
      role: updates.role,
    }

    const { error } = await supabase
      .from('profiles')
      .update(allowedUpdates)
      .eq('id', user.id)

    if (error) {
      console.error('Error updating profile:', error)
      if (error.code === '42703') {
        console.warn('Profiles table has different schema. Some fields may not be updated.')
      }
    } else {
      setProfile(prev => prev ? { ...prev, ...updates } : null)
    }

    return { error }
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

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
