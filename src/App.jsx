import React, { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import AuthScreen from './components/auth/AuthScreen.jsx';
import Dashboard from './components/dashboard/Dashboard';
import NumbersList from './components/dashboard/NumbersList';
import NumberForm from './components/forms/NumberForm';
import GameSelection from './components/games/GameSelection';
import NumberSelection from './components/games/NumberSelection';
import GamePlay from './components/games/GamePlay';
import './App.css';

function App() {
  const [currentScreen, setCurrentScreen] = useState('auth');
  const [gameParams, setGameParams] = useState({});
  const [editingNumber, setEditingNumber] = useState(null);
  const { user, navigateToScreen, clearNavigationTarget, loading } = useAuth();

  // 🚀🚀🚀 CRITICAL: MODIFIED NAVIGATION LOGIC TO PREVENT BLANK SCREEN
  useEffect(() => {
    console.log('🔥 App: Navigation effect triggered', {
      currentScreen,
      user: user?.id || 'none',
      navigateToScreen,
      loading
    });

    // Check if authentication is still in progress or user is not yet resolved
    // If user is null and not explicitly navigating, stay on 'auth' screen
    if (!user && currentScreen !== 'auth') {
      console.log('🔒 App: No authenticated user, redirecting to auth screen');
      setCurrentScreen('auth'); // Force back to auth if no user and not already there
      return; // Exit early if not authenticated
    }

    // If user is authenticated
    if (user) {
      if (navigateToScreen) {
        console.log('🚀🚀🚀 App: IMMEDIATE NAVIGATION: Explicit navigation target from AuthContext to:', navigateToScreen);
        setCurrentScreen(navigateToScreen);
        clearNavigationTarget();
      } else if (currentScreen === 'auth') {
        // User is authenticated AND was just on the auth screen, so navigate to dashboard
        console.log('🚀 App: User authenticated, defaulting to dashboard');
        setCurrentScreen('dashboard');
      }
      // If user is authenticated and already on a non-auth screen, do nothing (stay on current screen)
    }
    // If user is null and currentScreen is 'auth', do nothing (stay on auth screen)
  }, [user, navigateToScreen, currentScreen, clearNavigationTarget, loading]);

  const handleNavigation = (screen, params = {}) => {
    console.log('App: Manual navigation to:', screen, params);
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
      authLoading: loading
    });
  }, [currentScreen, user, navigateToScreen, loading]);

  return (
    <div className="app">
      <AnimatePresence mode="wait">
        {currentScreen === 'auth' && !user && (
          <motion.div
            key="auth"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <AuthScreen />
          </motion.div>
        )}

        {/* CRITICAL: Only render Dashboard when user is FULLY available */}
        {currentScreen === 'dashboard' && user && !loading && (
          <motion.div
            key="dashboard"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <Dashboard onNavigate={handleNavigation} />
          </motion.div>
        )}

        {currentScreen === 'number-list' && user && (
          <motion.div
            key="number-list"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <NumbersList onNavigate={handleNavigation} />
          </motion.div>
        )}

        {currentScreen === 'number-form' && user && (
          <motion.div
            key="number-form"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <NumberForm onNavigate={handleNavigation} editingNumber={editingNumber} />
          </motion.div>
        )}

        {currentScreen === 'game-selection' && user && (
          <motion.div
            key="game-selection"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <GameSelection onNavigate={handleNavigation} />
          </motion.div>
        )}

        {currentScreen === 'number-selection' && user && (
          <motion.div
            key="number-selection"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <NumberSelection onNavigate={handleNavigation} gameMode={gameParams.gameMode} />
          </motion.div>
        )}

        {currentScreen === 'game-play' && user && (
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

        {/* Loading indicator when transitioning to Dashboard */}
        {currentScreen === 'dashboard' && user && loading && (
          <motion.div
            key="loading-dashboard"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="min-h-screen flex items-center justify-center"
          >
            <div className="text-center">
              <div className="animate-spin h-12 w-12 border-4 border-indigo-200 border-t-indigo-500 rounded-full mx-auto mb-4"></div>
              <p className="text-indigo-600">Loading your dashboard...</p>
            </div>
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