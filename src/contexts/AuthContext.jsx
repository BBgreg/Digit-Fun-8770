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
  const [error, setError] = useState(null)
  const [navigateToScreen, setNavigateToScreen] = useState(null)

  useEffect(() => {
    // Check active sessions and sets the user
    const getSession = async () => {
      try {
        console.log('Checking for active session...');
        const { data: { session }, error } = await supabase.auth.getSession()
        
        if (error) {
          console.error('Session error:', error);
          throw error;
        }
        
        console.log('Session data:', session ? 'Session found' : 'No active session');
        if (session?.user) {
          setUser(session.user);
        }
      } catch (err) {
        console.error('Error getting session:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    getSession()

    // Listen for changes on auth state (logged in, signed out, etc.)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', event, session?.user?.id || 'no user');
        
        if (session?.user) {
          setUser(session.user);
          
          // Auto-navigate to dashboard on successful sign-in
          if (event === 'SIGNED_IN') {
            console.log('SIGNED_IN event detected, navigating to dashboard');
            setNavigateToScreen('dashboard');
          }
        } else {
          setUser(null);
          // Clear navigation target when user signs out
          setNavigateToScreen(null);
        }
        setLoading(false);
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  const signUp = async (email, password) => {
    try {
      setError(null)
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: window.location.origin,
          data: { confirmed_at: null }
        }
      })
      
      if (error) throw error
      console.log('Sign up successful:', data?.user?.id);
      return { success: true, data }
    } catch (err) {
      console.error('Sign up error:', err);
      setError(err.message)
      return { success: false, error: err }
    }
  }

  const signIn = async (email, password) => {
    try {
      setError(null)
      console.log('AuthContext: Attempting sign-in...');
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      
      if (error) {
        console.error('AuthContext: Sign-in error:', error);
        return { success: false, error }
      }
      
      if (data?.user) {
        console.log('AuthContext: Sign-in successful for user:', data.user.id);
        setUser(data.user);
        
        // Set navigation target immediately on successful sign-in
        console.log('AuthContext: Setting navigation target to dashboard');
        setNavigateToScreen('dashboard');
        
        return { success: true, data, user: data.user }
      } else {
        console.error('AuthContext: No user data returned from sign-in');
        return { success: false, error: { message: 'No user data received' } }
      }
      
    } catch (err) {
      console.error('AuthContext: Unexpected sign-in error:', err);
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
      console.log('Sign out successful');
      return { success: true }
    } catch (err) {
      console.error('Sign out error:', err);
      setError(err.message)
      return { success: false, error: err.message }
    }
  }
  
  // Explicit function to navigate to dashboard with high priority
  const navigateToDashboard = () => {
    console.log('AuthContext: Explicit navigation to dashboard requested');
    setNavigateToScreen('dashboard');
  }
  
  // Clear navigation target after it's been processed
  const clearNavigationTarget = () => {
    console.log('AuthContext: Clearing navigation target');
    setNavigateToScreen(null);
  }

  const value = {
    user,
    loading,
    error,
    signUp,
    signIn,
    signOut,
    navigateToDashboard,
    navigateToScreen,
    clearNavigationTarget
  }

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  )
}