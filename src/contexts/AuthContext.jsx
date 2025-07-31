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

  useEffect(() => {
    // 1. Check for an active session when the app loads.
    const getSession = async () => {
      try {
        console.log('🔍 AuthContext: Checking for active session...');
        const { data: { session } } = await supabase.auth.getSession();
        
        console.log('📊 AuthContext: Session data:', session ? 'Session found' : 'No active session');
        if (session?.user) {
          setUser(session.user);
        }
      } catch (err) {
        console.error('❌ AuthContext: Error getting session:', err);
        setError(err.message);
      } finally {
        // CRITICAL: Mark auth as ready after the initial check is complete.
        console.log('✅ AuthContext: Initial auth check complete - marking as ready');
        setIsAuthReady(true);
      }
    };

    getSession();

    // 2. Listen for future changes in authentication state.
    // THE FIX IS ON THE NEXT LINE: onAuthStateChanged -> onAuthStateChange
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log(`🔥 AuthContext: Auth state changed: ${event}`, session?.user?.id || 'no user');
        
        setUser(session?.user ?? null);
        setLoading(false);

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
  }, []); // Runs only once on mount

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
      return { success: true, data };
    } catch (err) {
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
      return { success: true, data };
    } catch (err) {
      setError(err.message);
      return { success: false, error: err };
    }
  };

  const signOut = async () => {
    try {
      setError(null);
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      return { success: true };
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    }
  };

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
