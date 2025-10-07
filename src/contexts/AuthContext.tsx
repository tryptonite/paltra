import React, { createContext, useContext, useEffect, useState } from 'react'
import { User as SupabaseUser, Session, AuthError, PostgrestError } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { User as UserApi, isSupabaseConfigured } from '@/api/entities'

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

const AUTH_CHECK_INTERVAL_MS = 60 * 60 * 1000
const SUPABASE_REQUEST_TIMEOUT_MS = Number((import.meta as any).env?.VITE_PROFILE_FETCH_TIMEOUT_MS) || 8000
// Disable visibility-based auth refresh by default to avoid noisy tab-switch fetches
const VISIBILITY_REFRESH_ENABLED = (import.meta as any).env?.VITE_VISIBILITY_AUTH_REFRESH === 'true'

interface AuthContextType {
  user: SupabaseUser | null
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
  const [user, setUser] = useState<SupabaseUser | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const lastAuthCheckRef = React.useRef(0)

  const runWithTimeout = React.useCallback(async <T,>(promise: Promise<T>, label: string, ms = SUPABASE_REQUEST_TIMEOUT_MS): Promise<T> => {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) =>
        setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms)
      ),
    ])
  }, [])

  const markAuthChecked = React.useCallback(() => {
    lastAuthCheckRef.current = Date.now()
  }, [])

  const clearSessionState = React.useCallback((reason?: string) => {
    if (reason) {
      console.warn(`AuthContext: Clearing session state (${reason})`)
    }
    setUser(null)
    setProfile(null)
    setSession(null)
    setLoading(false)
    UserApi.clearCache()
    lastAuthCheckRef.current = 0
  }, [])

  const signOut = React.useCallback(async () => {
    console.log('AuthContext: Signing out (optimistic)...')
    // Optimistically clear UI immediately so logout feels instant
    clearSessionState('optimistic-signout')

    // Fire the Supabase sign out in the background
    runWithTimeout(supabase.auth.signOut(), 'signOut')
      .then(({ error }) => {
        if (error) {
          console.error('AuthContext: Sign out error (background):', error)
        }
      })
      .catch((error: any) => {
        console.error('AuthContext: Sign out request failed (background):', error)
      })

    // Return immediately; UI is already logged out
    return { error: null as AuthError | null }
  }, [runWithTimeout, clearSessionState])

  const fetchProfile = React.useCallback(async (authUser: SupabaseUser) => {
    const userId = authUser.id
    const userEmail = authUser.email || ''
    console.log('AuthProvider: Fetching profile for user:', userId)

    const fallbackProfile: UserProfile = {
      id: userId,
      email: userEmail,
      full_name: (authUser.user_metadata?.full_name as string) || userEmail || null,
      department: (authUser.user_metadata?.department as string) || null,
      role: (authUser.user_metadata?.role as string) || 'user',
      company: (authUser.user_metadata?.company as string) || null,
      is_approved: typeof authUser.user_metadata?.is_approved === 'boolean'
        ? (authUser.user_metadata?.is_approved as boolean)
        : null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    try {
      // If Supabase env is not configured, immediately fall back to auth metadata
      if (!isSupabaseConfigured()) {
        console.warn('AuthProvider: Supabase not configured. Using auth metadata for profile.')
        setProfile(fallbackProfile)
        return
      }

      // Avoid aggressive fetch when offline
      if (typeof navigator !== 'undefined' && navigator.onLine === false) {
        console.warn('AuthProvider: Offline. Using fallback profile until online.')
        setProfile(prev => prev ?? fallbackProfile)
        return
      }

      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Profile fetch timeout')), SUPABASE_REQUEST_TIMEOUT_MS)
      )

      const profilePromise = supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle()

      const { data, error } = await Promise.race([profilePromise, timeoutPromise]) as any

      if (error) {
        console.error('AuthProvider: Error fetching profile from database:', error)
        if (error.code === '42P01') {
          console.warn('AuthProvider: Profiles table missing. Using auth metadata fallback profile.')
          setProfile({
            ...fallbackProfile,
            role: fallbackProfile.role || 'user',
            is_approved: fallbackProfile.is_approved ?? false,
          })
        } else {
          setProfile((prev) => prev ?? fallbackProfile)
        }
        return
      }

      if (!data) {
        console.warn('AuthProvider: No profile row found. Using auth metadata fallback profile.')
        setProfile(fallbackProfile)
      } else {
        setProfile(data)
        console.log('AuthProvider: Profile loaded successfully')
      }
    } catch (error) {
      // Downgrade to warning if it's specifically a timeout; set fallback immediately
      const isTimeout = (error as any)?.message?.includes('timeout')
      if (isTimeout) {
        console.warn('AuthProvider: Profile fetch timed out. Using fallback profile and retrying in background...')
      } else {
        console.error('AuthProvider: Failed to fetch profile:', error)
      }
      setProfile((prev) => prev ?? fallbackProfile)

      // Background retry once after a short delay to hydrate profile when available
      setTimeout(() => {
        supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .maybeSingle()
          .then(({ data, error }) => {
            if (error) return
            if (data) {
              setProfile(data as any)
              console.log('AuthProvider: Profile hydrated after background retry')
            }
          })
          .catch(() => {})
      }, 2000)
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
              setTimeout(() => {
                signOut()
              }, 2000) // Delay to show notification
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
    runWithTimeout(supabase.auth.getSession(), 'getSession').then(({ data: { session }, error }) => {
      if (!mounted) return
      
      console.log('AuthProvider: Initial session:', session?.user?.email || 'No user')
      setSession(session)
      setUser(session?.user ?? null)

      if (error) {
        console.error('AuthProvider: getSession returned error:', error)
      }
      
      if (session?.user) {
        markAuthChecked()
        setupProfileSubscription(session.user.id)
        fetchProfile(session.user)
          .catch((error) => {
            console.error('AuthProvider: Profile load failed on initial session:', error)
          })
          .finally(() => {
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
      
      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT' || event === 'USER_UPDATED') {
        UserApi.clearCache()
      }

      console.log('AuthProvider: Auth state change:', event, session?.user?.email || 'No user')
      setSession(session)
      setUser(session?.user ?? null)
      
      if (session?.user) {
        markAuthChecked()
        setupProfileSubscription(session.user.id)
        try {
          await fetchProfile(session.user)
        } catch (error) {
          console.error('AuthProvider: Error fetching profile on auth change:', error)
          setLoading(false)
          return
        }
      } else {
        setProfile(null)
        setLoading(false)
        // Clean up profile subscription when user signs out
        if (profileSubscription) {
          supabase.removeChannel(profileSubscription)
          profileSubscription = null
        }
        lastAuthCheckRef.current = 0
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
  }, [fetchProfile, signOut])

  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await runWithTimeout(
        supabase.auth.signInWithPassword({
          email,
          password,
        }),
        'signIn'
      )
      return { error }
    } catch (error: any) {
      console.error('AuthContext: Sign in request failed:', error)
      return { error: { message: error?.message || 'Sign in request timed out.' } as AuthError }
    }
  }

  const signUp = async (email: string, password: string, userData: Partial<UserProfile>) => {
    let data, error
    try {
      const response = await runWithTimeout(
        supabase.auth.signUp({
          email,
          password,
        }),
        'signUp'
      )
      data = response.data
      error = response.error
    } catch (err: any) {
      console.error('AuthContext: Sign up request failed:', err)
      return { error: { message: err?.message || 'Sign up request timed out.' } as AuthError }
    }

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
        markAuthChecked()
        await fetchProfile(data.user as SupabaseUser)
      } catch (error: any) {
        console.error('Unexpected error creating profile:', error)
        return { error: { message: 'Failed to create user profile. Please try again.' } as AuthError }
      }
    }

    return { error: null }
  }

  const sessionUser = session?.user || null

  const refreshAuthIfNeeded = React.useCallback(async (force = false) => {
    if (!VISIBILITY_REFRESH_ENABLED) return
    if (!sessionUser) {
      return
    }

    const now = Date.now()
    const needsRefresh = force || now - lastAuthCheckRef.current >= AUTH_CHECK_INTERVAL_MS
    if (!needsRefresh) {
      return
    }

    // Skip if offline; we'll try again when online or on next manual auth event
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      return
    }

    markAuthChecked()

    try {
      await UserApi.me({ forceRefresh: true })
      await fetchProfile(sessionUser)
    } catch (error) {
      console.error('AuthProvider: Visibility-triggered auth refresh failed:', error)
    }
  }, [sessionUser, fetchProfile, markAuthChecked])

  useEffect(() => {
    if (typeof document === 'undefined') {
      return
    }

    if (!VISIBILITY_REFRESH_ENABLED) {
      return
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        refreshAuthIfNeeded()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [refreshAuthIfNeeded])

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
