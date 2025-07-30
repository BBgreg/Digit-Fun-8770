import React, { createContext, useContext, useState, useEffect } from 'react'
import supabase from '../lib/supabase'

const AuthContext = createContext({})

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [isAuthReady, setIsAuthReady] = useState(false) // 🚀 NEW: Track when auth state is resolved
  const [error, setError] = useState(null)
  const [navigateToScreen, setNavigateToScreen] = useState(null)

  useEffect(() => {
    // Check active sessions and sets the user
    const getSession = async () => {
      try {
        console.log('🔍 AuthContext: Checking for active session...');
        const { data: { session }, error } = await supabase.auth.getSession()
        
        if (error) {
          console.error('❌ AuthContext: Session error:', error);
          throw error;
        }

        console.log('📊 AuthContext: Session data:', session ? 'Session found' : 'No active session');
        if (session?.user) {
          setUser(session.user);
        }
      } catch (err) {
        console.error('❌ AuthContext: Error getting session:', err);
        setError(err.message);
      } finally {
        setLoading(false);
        // 🚀 CRITICAL: Mark auth as ready after initial session check
        console.log('✅ AuthContext: Initial auth check complete - marking as ready');
        setIsAuthReady(true);
      }
    }

    getSession()

    // Listen for changes on auth state (logged in, signed out, etc.)
    const { data: { subscription } } = supabase.auth.onAuthStateChanged(
      async (event, session) => {
        console.log('🔥 AuthContext: Auth state changed:', event, session?.user?.id || 'no user');
        
        if (session?.user) {
          setUser(session.user);
          // 🚀 CRITICAL: IMMEDIATE DASHBOARD NAVIGATION ON SUCCESSFUL SIGN-IN
          if (event === 'SIGNED_IN') {
            console.log('🚀🚀🚀 AuthContext: SIGNED_IN event detected - IMMEDIATE navigation to dashboard');
            setNavigateToScreen('dashboard');
          }
        } else {
          setUser(null);
          // Clear navigation target when user signs out
          setNavigateToScreen(null);
        }
        
        setLoading(false);
        // 🚀 CRITICAL: Ensure auth is marked as ready on state changes
        if (!isAuthReady) {
          console.log('✅ AuthContext: Auth state change - marking as ready');
          setIsAuthReady(true);
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [isAuthReady])

  const signUp = async (email, password) => {
    try {
      setError(null)
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: window.location.origin,
          data: {
            confirmed_at: null
          }
        }
      })

      if (error) throw error

      console.log('✅ AuthContext: Sign up successful:', data?.user?.id);
      return { success: true, data }
    } catch (err) {
      console.error('❌ AuthContext: Sign up error:', err);
      setError(err.message)
      return { success: false, error: err }
    }
  }

  // 🚀 CRITICAL: ENHANCED SIGN-IN WITH GUARANTEED NAVIGATION
  const signIn = async (email, password) => {
    try {
      setError(null)
      console.log('🔥 AuthContext: Starting sign-in process...');

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        console.error('🚨 AuthContext: Sign-in error:', error);
        return { success: false, error }
      }

      if (data?.user) {
        console.log('🚀 AuthContext: Sign-in SUCCESS for user:', data.user.id);
        setUser(data.user);
        
        // 🚀🚀🚀 CRITICAL: IMMEDIATE NAVIGATION TARGET SET
        console.log('🚀🚀🚀 AuthContext: Setting IMMEDIATE navigation to dashboard');
        setNavigateToScreen('dashboard');
        
        return { success: true, data, user: data.user }
      } else {
        console.error('🚨 AuthContext: No user data returned from sign-in');
        return { success: false, error: { message: 'No user data received' } }
      }
    } catch (err) {
      console.error('🚨 AuthContext: Unexpected sign-in error:', err);
      setError(err.message)
      return { success: false, error: err }
    }
  }

  const signOut = async () => {
    try {
      setError(null)
      const { error } = await supabase.auth.signOut()
      if (error) throw error

      setUser(null);
      setNavigateToScreen(null);
      console.log('✅ AuthContext: Sign out successful');
      return { success: true }
    } catch (err) {
      console.error('❌ AuthContext: Sign out error:', err);
      setError(err.message)
      return { success: false, error: err.message }
    }
  }

  // Clear navigation target after it's been processed
  const clearNavigationTarget = () => {
    console.log('🔥 AuthContext: Clearing navigation target');
    setNavigateToScreen(null);
  }

  const value = {
    user,
    loading,
    isAuthReady, // 🚀 NEW: Export isAuthReady state
    error,
    signUp,
    signIn,
    signOut,
    navigateToScreen,
    clearNavigationTarget
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}