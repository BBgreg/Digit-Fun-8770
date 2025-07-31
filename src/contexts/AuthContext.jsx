import React, { createContext, useContext, useState, useEffect } from 'react';
import supabase from '../lib/supabase';

const AuthContext = createContext({});

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [error, setError] = useState(null);
  const [navigateToScreen, setNavigateToScreen] = useState(null);

  /**
   * This useEffect hook runs only once when the component mounts.
   * It's responsible for two things:
   * 1. Checking if there's an existing user session.
   * 2. Setting up a listener for any future authentication changes (sign in, sign out).
   */
  useEffect(() => {
    // 1. Check for an active session when the app loads.
    const getSession = async () => {
      try {
        console.log('🔍 AuthContext: Checking for active session...');
        const { data: { session }, error } = await supabase.auth.getSession();
        
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
        // CRITICAL: Mark auth as ready after the initial check is complete.
        // This tells the rest of the app it can now render based on the auth state.
        console.log('✅ AuthContext: Initial auth check complete - marking as ready');
        setIsAuthReady(true);
      }
    };

    getSession();

    // 2. Listen for future changes in authentication state.
    const { data: { subscription } } = supabase.auth.onAuthStateChanged(
      async (event, session) => {
        console.log(`🔥 AuthContext: Auth state changed: ${event}`, session?.user?.id || 'no user');
        
        setUser(session?.user ?? null);
        setLoading(false);

        // If a user signs in, set the navigation target to the dashboard.
        if (event === 'SIGNED_IN') {
          console.log('🚀 AuthContext: SIGNED_IN event detected - setting navigation to dashboard');
          setNavigateToScreen('dashboard');
        }
      }
    );

    // Cleanup function: Unsubscribe from the listener when the component unmounts.
    return () => {
      subscription.unsubscribe();
    };
  }, []); // <-- THE FIX: The dependency array is now empty, so this runs only once.

  const signUp = async (email, password) => {
    try {
      setError(null);
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: window.location.origin,
        },
      });

      if (error) throw error;
      console.log('✅ AuthContext: Sign up successful:', data?.user?.id);
      return { success: true, data };
    } catch (err) {
      console.error('❌ AuthContext: Sign up error:', err);
      setError(err.message);
      return { success: false, error: err };
    }
  };

  const signIn = async (email, password) => {
    try {
      setError(null);
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;
      // The onAuthStateChanged listener will handle setting the user and navigation.
      return { success: true, data };
    } catch (err) {
      console.error('🚨 AuthContext: Sign-in error:', err);
      setError(err.message);
      return { success: false, error: err };
    }
  };

  const signOut = async () => {
    try {
      setError(null);
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      // The onAuthStateChanged listener will handle clearing the user.
      return { success: true };
    } catch (err) {
      console.error('❌ AuthContext: Sign out error:', err);
      setError(err.message);
      return { success: false, error: err.message };
    }
  };

  // Function for App.jsx to call after it has navigated.
  const clearNavigationTarget = () => {
    setNavigateToScreen(null);
  };

  const value = {
    user,
    loading,
    isAuthReady,
    error,
    signUp,
    signIn,
    signOut,
    navigateToScreen,
    clearNavigationTarget,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
