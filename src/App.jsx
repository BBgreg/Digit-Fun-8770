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
  const { user, navigateToScreen, clearNavigationTarget } = useAuth();

  // 🚀 CRITICAL: Enhanced navigation effect for immediate dashboard redirect
  useEffect(() => {
    console.log('App: Navigation effect triggered', {
      user: user?.id || 'none',
      navigateToScreen,
      currentScreen
    });

    if (user) {
      // User is authenticated
      if (navigateToScreen) {
        // 🚀 IMMEDIATE NAVIGATION: Explicit navigation target from AuthContext
        console.log(`🚀 App: Navigating to explicit target: ${navigateToScreen}`);
        setCurrentScreen(navigateToScreen);
        clearNavigationTarget(); // Clear after processing
      } else if (currentScreen === 'auth') {
        // 🚀 FALLBACK NAVIGATION: Default navigation if still on auth screen
        console.log('🚀 App: User authenticated, defaulting to dashboard');
        setCurrentScreen('dashboard');
      }
    } else {
      // User is not authenticated
      console.log('App: No user, ensuring auth screen is shown');
      if (currentScreen !== 'auth') {
        setCurrentScreen('auth');
      }
    }
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

  // Debug logging for state changes
  useEffect(() => {
    console.log('App: State update -', {
      currentScreen,
      userAuthenticated: !!user,
      userId: user?.id || 'none'
    });
  }, [currentScreen, user]);

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

        {currentScreen === 'dashboard' && user && (
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