import React, { createContext, useContext, useEffect, useState } from 'react'
import { User, Session, AuthError, PostgrestError } from '@supabase/supabase-js'
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
  signUp: (email: string, password: string, userData: Partial<UserProfile>) => Promise<{ error: AuthError | PostgrestError | null }>
  signOut: () => Promise<{ error: AuthError | null }>
  updateProfile: (updates: Partial<UserProfile>) => Promise<{ error: AuthError | PostgrestError | null }>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  console.log('AuthProvider: Initializing...')
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchProfile = React.useCallback(async (userId: string, userEmail?: string) => {
    console.log('AuthProvider: Fetching profile for user:', userId)
    
    try {
      // Add timeout for profile fetch
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Profile fetch timeout')), 8000)
      )
      
      const profilePromise = supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()

      const { data, error } = await Promise.race([profilePromise, timeoutPromise]) as any

      if (error) {
        console.error('Error fetching profile:', error)
        if (error.code === '42P01') {
          console.warn('Profiles table does not exist. Please run the SQL schema in Supabase.')
          // Create a basic profile from user data if table doesn't exist
          setProfile({
            id: userId,
            email: userEmail || '',
            full_name: null,
            department: null,
            role: 'user',
            company: null,
            is_approved: false, // New users need approval
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
        } else {
          setProfile(null)
        }
      } else {
        setProfile(data)
        console.log('AuthProvider: Profile loaded successfully')
      }
    } catch (error) {
      console.error('Error fetching profile:', error)
      setProfile(null)
    } finally {
      console.log('AuthProvider: Setting loading to false')
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    console.log('AuthProvider: Initializing...')
    let mounted = true
    let profileSubscription: any = null
    
    // Set timeout to prevent infinite loading
    const loadingTimeout = setTimeout(() => {
      if (mounted) {
        console.warn('AuthProvider: Loading timeout - forcing loading to false')
        setLoading(false)
      }
    }, 10000) // 10 second timeout

    const setupProfileSubscription = (userId: string) => {
      if (profileSubscription) {
        supabase.removeChannel(profileSubscription)
      }
      
      profileSubscription = supabase
        .channel(`profile-changes-${userId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'profiles',
            filter: `id=eq.${userId}`
          },
          (payload) => {
            if (!mounted) return
            
            console.log('AuthProvider: Profile change detected:', payload)
            
            // If profile is deleted, sign out immediately
            if (payload.eventType === 'DELETE') {
              console.warn('AuthProvider: Profile deleted, signing out user')
              // Show notification before signing out
              if (typeof window !== 'undefined' && window.dispatchEvent) {
                window.dispatchEvent(new CustomEvent('user-removed', {
                  detail: { message: 'Your account has been removed by an administrator. You will be signed out.' }
                }))
              }
              setTimeout(() => signOut(), 2000) // Delay to show notification
            } else if (payload.eventType === 'UPDATE' && payload.new) {
              // Update local profile state with new data
              const newProfile = payload.new as UserProfile
              console.log('AuthProvider: Profile updated, refreshing local state')
              setProfile(newProfile)
              
              // Optional: Sign out if approval is revoked (uncomment if needed)
              // if (newProfile.is_approved === false && profile?.is_approved === true) {
              //   console.warn('AuthProvider: User approval revoked, signing out')
              //   signOut()
              // }
            }
          }
        )
        .subscribe((status) => {
          console.log('AuthProvider: Profile subscription status:', status)
        })
    }
    
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return
      
      console.log('AuthProvider: Initial session:', session?.user?.email || 'No user')
      setSession(session)
      setUser(session?.user ?? null)
      
      if (session?.user) {
        setupProfileSubscription(session.user.id)
        fetchProfile(session.user.id, session.user.email || '').finally(() => {
          if (mounted) clearTimeout(loadingTimeout)
        })
      } else {
        setLoading(false)
        clearTimeout(loadingTimeout)
      }
    }).catch((error) => {
      console.error('AuthProvider: Error getting session:', error)
      if (mounted) {
        setLoading(false)
        clearTimeout(loadingTimeout)
      }
    })

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return
      
      console.log('AuthProvider: Auth state change:', event, session?.user?.email || 'No user')
      setSession(session)
      setUser(session?.user ?? null)
      
      if (session?.user) {
        setupProfileSubscription(session.user.id)
        try {
          await fetchProfile(session.user.id, session.user.email || '')
        } catch (error) {
          console.error('AuthProvider: Error fetching profile on auth change:', error)
          setLoading(false)
        }
      } else {
        setProfile(null)
        setLoading(false)
        // Clean up profile subscription when user signs out
        if (profileSubscription) {
          supabase.removeChannel(profileSubscription)
          profileSubscription = null
        }
      }
    })

    return () => {
      mounted = false
      clearTimeout(loadingTimeout)
      subscription.unsubscribe()
      if (profileSubscription) {
        supabase.removeChannel(profileSubscription)
      }
    }
  }, []) // Remove fetchProfile dependency to prevent infinite loops

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
      try {
        // Create user profile in database
        const { error: profileError } = await supabase
          .from('profiles')
          .insert({
            id: data.user.id,
            email: data.user.email!,
            full_name: userData.full_name || null,
            department: userData.department || null,
            role: userData.role || 'user',
            company: userData.company || null,
            is_approved: false, // New users need approval
          })

        if (profileError) {
          console.error('Error creating profile:', profileError)
          if (profileError.code === '42P01') {
            console.warn('Profiles table does not exist. Please run the SQL schema in Supabase.')
            return { error: { message: 'Database setup incomplete. Please contact administrator.' } as AuthError }
          }
          return { error: profileError }
        }

        // Fetch the newly created profile
        await fetchProfile(data.user.id)
      } catch (error: any) {
        console.error('Unexpected error creating profile:', error)
        return { error: { message: 'Failed to create user profile. Please try again.' } as AuthError }
      }
    }

    return { error: null }
  }

  const signOut = async () => {
    console.log('AuthContext: Signing out...')
    const { error } = await supabase.auth.signOut()
    if (!error) {
      console.log('AuthContext: Sign out successful, clearing state...')
      // Clear local state immediately
      setUser(null)
      setProfile(null)
      setSession(null)
      setLoading(false)
      console.log('AuthContext: State cleared')
    } else {
      console.error('AuthContext: Sign out error:', error)
    }
    return { error }
  }

  const updateProfile = async (updates: Partial<UserProfile>) => {
    if (!user) {
      return { error: { message: 'No user logged in' } as AuthError }
    }

    const { error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', user.id)

    if (error) {
      console.error('Error updating profile:', error)
      return { error }
    }

    // Update local state
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

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
