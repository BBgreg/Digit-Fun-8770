import React, { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import AuthScreen from './components/auth/AuthScreen.jsx';
import LoadingScreen from './components/LoadingScreen.jsx';
import Dashboard from './components/dashboard/Dashboard';
import NumbersList from './components/dashboard/NumbersList';
import NumberForm from './components/forms/NumberForm';
import GameSelection from './components/games/GameSelection';
import NumberSelection from './components/games/NumberSelection';
import GamePlay from './components/games/GamePlay';
import './App.css';

function App() {
  const [currentScreen, setCurrentScreen] = useState('global-loading'); // 🚀 Start with global loading
  const [isAuthReady, setIsAuthReady] = useState(false); // 🚀 Track when auth is ready
  const [gameParams, setGameParams] = useState({});
  const [editingNumber, setEditingNumber] = useState(null);
  const { user, navigateToScreen, clearNavigationTarget, loading, isAuthReady: authContextReady } = useAuth();

  // 🚀 CRITICAL: Sync isAuthReady from AuthContext
  useEffect(() => {
    if (authContextReady && !isAuthReady) {
      console.log('✅ App: Auth context is ready, updating local state');
      setIsAuthReady(true);
    }
  }, [authContextReady, isAuthReady]);

  // 🚀🚀🚀 CRITICAL: REFINED NAVIGATION LOGIC WITH PROPER SCREEN TRANSITIONS
  useEffect(() => {
    console.log('🔥 App: Navigation effect triggered (Final Attempt)', {
      currentScreen,
      user: user?.id || 'none',
      navigateToScreen,
      isAuthReady
    });

    // 1. If authentication state is NOT yet ready, ensure global loading screen is shown.
    if (!isAuthReady) {
      if (currentScreen !== 'global-loading') {
        console.log('⏳ App: Auth not ready yet, showing global loading screen');
        setCurrentScreen('global-loading');
      }
      return; // Exit early, wait for auth to be ready
    }

    // 2. If authentication state IS ready:
    //    a. Handle explicit navigation targets (e.g., after email confirmation redirect)
    if (navigateToScreen) {
      console.log('🚀🚀🚀 App: IMMEDIATE NAVIGATION: Explicit target from AuthContext to:', navigateToScreen);
      setCurrentScreen(navigateToScreen);
      clearNavigationTarget();
      return; // Exit after handling explicit navigation
    }

    //    b. Determine default screen based on user authentication status
    if (user) { // User is authenticated AND isAuthReady is true
      if (currentScreen === 'auth' || currentScreen === 'global-loading') {
        // If user just authenticated OR was on global loading screen, default to dashboard
        console.log('🚀 App: User authenticated, defaulting to dashboard');
        setCurrentScreen('dashboard');
      }
      // If user is authenticated and already on a non-auth/non-loading screen, do nothing (stay on current screen)
    } else { // User is NOT authenticated AND isAuthReady is true
      console.log('🔒 App: User not authenticated, ensuring auth screen is shown');
      if (currentScreen !== 'auth') { // Only set to 'auth' if not already there
        setCurrentScreen('auth');
      }
    }

  }, [user, navigateToScreen, currentScreen, clearNavigationTarget, isAuthReady]);

  const handleNavigation = (screen, params = {}) => {
    console.log('🧭 App: Manual navigation to:', screen, params);
    setGameParams(params);
    
    if (screen === 'edit-number') {
      setEditingNumber(params);
      setCurrentScreen('number-form');
    } else if (screen === 'add-number') {
      setEditingNumber(null);
      setCurrentScreen('number-form');
    } else {
      setEditingNumber(null);
      setCurrentScreen(screen);
    }
  };

  // Enhanced debug logging for state changes
  useEffect(() => {
    console.log('🔥 App: State update -', {
      currentScreen,
      userAuthenticated: !!user,
      userId: user?.id || 'none',
      navigateToScreen,
      isAuthReady,
      authContextReady,
      authLoading: loading
    });
  }, [currentScreen, user, navigateToScreen, isAuthReady, authContextReady, loading]);

  return (
    <div className="app">
      <AnimatePresence mode="wait">
        {/* Global Loading Screen - displayed while authentication state is being determined */}
        {currentScreen === 'global-loading' && (
          <motion.div
            key="global-loading-screen"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <LoadingScreen />
          </motion.div>
        )}

        {/* Auth Screen - only shown if currentScreen is 'auth' AND auth is ready AND no user */}
        {currentScreen === 'auth' && isAuthReady && !user && (
          <motion.div
            key="auth"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <AuthScreen />
          </motion.div>
        )}

        {/* Dashboard Screen - only shown if currentScreen is 'dashboard' AND auth is ready AND user exists */}
        {currentScreen === 'dashboard' && isAuthReady && user && (
          <motion.div
            key="dashboard"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <Dashboard onNavigate={handleNavigation} />
          </motion.div>
        )}

        {/* Number List Screen */}
        {currentScreen === 'number-list' && isAuthReady && user && (
          <motion.div
            key="number-list"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <NumbersList onNavigate={handleNavigation} />
          </motion.div>
        )}

        {/* Number Form Screen */}
        {currentScreen === 'number-form' && isAuthReady && user && (
          <motion.div
            key="number-form"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <NumberForm onNavigate={handleNavigation} editingNumber={editingNumber} />
          </motion.div>
        )}

        {/* Game Selection Screen */}
        {currentScreen === 'game-selection' && isAuthReady && user && (
          <motion.div
            key="game-selection"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <GameSelection onNavigate={handleNavigation} />
          </motion.div>
        )}

        {/* Number Selection Screen */}
        {currentScreen === 'number-selection' && isAuthReady && user && (
          <motion.div
            key="number-selection"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <NumberSelection onNavigate={handleNavigation} gameMode={gameParams.gameMode} />
          </motion.div>
        )}

        {/* Game Play Screen */}
        {currentScreen === 'game-play' && isAuthReady && user && (
          <motion.div
            key="game-play"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <GamePlay
              onNavigate={handleNavigation}
              gameMode={gameParams.gameMode}
              targetNumber={gameParams.targetNumber}
              contactName={gameParams.contactName}
              phoneNumberId={gameParams.phoneNumberId}
              phoneNumbers={gameParams.phoneNumbers}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Wrap the App component with AuthProvider
const AppWithAuth = () => {
  return (
    <AuthProvider>
      <App />
    </AuthProvider>
  );
};

export default AppWithAuth;