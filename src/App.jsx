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

  // 🚀🚀🚀 CRITICAL: PRECISE NAVIGATION LOGIC TO FIX SIGN-IN ISSUE
  useEffect(() => {
    console.log('🔥 App: Navigation effect triggered', {
      currentScreen,
      user: user?.id || 'none',
      navigateToScreen,
      loading
    });

    // Condition 1: If an explicit navigation target is set (e.g., from AuthContext after signup confirmation)
    if (navigateToScreen) {
      setCurrentScreen(navigateToScreen);
      clearNavigationTarget(); // Clear the target after processing
      return; // Exit useEffect after handling explicit navigation
    }

    // Condition 2: If user is authenticated AND current screen is 'auth' (meaning they just logged in)
    if (user && currentScreen === 'auth') {
      setCurrentScreen('dashboard'); // Navigate directly to dashboard
      return; // Exit useEffect after handling dashboard navigation
    }

    // Condition 3: If user is NOT authenticated AND current screen is NOT 'auth' (e.g., tried to access dashboard directly)
    if (!user && currentScreen !== 'auth') {
      setCurrentScreen('auth'); // Force back to authentication screen
      return; // Exit useEffect after handling unauthenticated state
    }

    // Condition 4: Default case - if user is authenticated and already on a non-auth screen, or if no user and already on auth screen
    // No action needed for these states, simply let currentScreen remain as is.

  }, [user, navigateToScreen, currentScreen, clearNavigationTarget]);

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