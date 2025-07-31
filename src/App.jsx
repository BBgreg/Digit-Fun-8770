import React, { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

// Import your context and components
import { AuthProvider, useAuth } from './contexts/AuthContext';
import AuthScreen from './components/auth/AuthScreen.jsx';
import LoadingScreen from './components/LoadingScreen.jsx';
import Dashboard from './components/dashboard/Dashboard';
import NumbersList from './components/dashboard/NumbersList';
import NumberForm from './components/forms/NumberForm';
import GameSelection from './components/games/GameSelection';
import NumberSelection from './components/games/NumberSelection';
import GamePlay from './components/games/GamePlay';

// Import your main stylesheet
import './App.css';

/**
 * The main App component handles all routing and state management for the application.
 * It determines which screen to show based on authentication status and user actions.
 */
function App() {
  // --- STATE MANAGEMENT ---
  const [currentScreen, setCurrentScreen] = useState('global-loading');
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [gameParams, setGameParams] = useState({});
  const [editingNumber, setEditingNumber] = useState(null);

  // --- AUTHENTICATION CONTEXT ---
  const { user, navigateToScreen, clearNavigationTarget, loading, isAuthReady: authContextReady } = useAuth();

  // --- EFFECTS ---

  // Effect to sync the authentication readiness state from the context.
  useEffect(() => {
    if (authContextReady) {
      setIsAuthReady(true);
    }
  }, [authContextReady]);

  // Main navigation logic
  useEffect(() => {
    if (isAuthReady) {
      if (navigateToScreen) {
        setCurrentScreen(navigateToScreen);
        clearNavigationTarget();
        return;
      }

      if (user) {
        if (currentScreen === 'auth' || currentScreen === 'global-loading') {
          setCurrentScreen('dashboard');
        }
      } else {
        if (currentScreen !== 'auth') {
          setCurrentScreen('auth');
        }
      }
    }
  }, [user, navigateToScreen, isAuthReady, clearNavigationTarget, currentScreen]);


  /**
   * Handles manual navigation triggered by child components.
   */
  const handleNavigation = (screen, params = {}) => {
    console.log(`🧭 App: Manual navigation to: ${screen}`, params);
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
  
  // --- RENDER LOGIC ---

  return (
    <div className="app">
      <AnimatePresence mode="wait">
        {/* Global Loading Screen */}
        {currentScreen === 'global-loading' && (
          <motion.div key="global-loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <LoadingScreen />
          </motion.div>
        )}

        {/* Auth Screen */}
        {currentScreen === 'auth' && isAuthReady && !user && (
          <motion.div key="auth" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <AuthScreen />
          </motion.div>
        )}

        {/* Dashboard */}
        {currentScreen === 'dashboard' && isAuthReady && user && (
          <motion.div key="dashboard" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <Dashboard onNavigate={handleNavigation} />
          </motion.div>
        )}

        {/* Numbers List Screen */}
        {currentScreen === 'number-list' && isAuthReady && user && (
          <motion.div key="number-list" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <NumbersList onNavigate={handleNavigation} />
          </motion.div>
        )}

        {/* Number Form Screen */}
        {currentScreen === 'number-form' && isAuthReady && user && (
          <motion.div key="number-form" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <NumberForm onNavigate={handleNavigation} editingNumber={editingNumber} />
          </motion.div>
        )}

        {/* Game Selection Screen */}
        {currentScreen === 'game-selection' && isAuthReady && user && (
          <motion.div key="game-selection" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <GameSelection onNavigate={handleNavigation} />
          </motion.div>
        )}

        {/* Number Selection Screen */}
        {currentScreen === 'number-selection' && isAuthReady && user && (
          <motion.div key="number-selection" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <NumberSelection onNavigate={handleNavigation} gameMode={gameParams.gameMode} />
          </motion.div>
        )}

        {/* Game Play Screen */}
        {currentScreen === 'game-play' && isAuthReady && user && (
          <motion.div key="game-play" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
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

/**
 * A wrapper component that provides the AuthContext to the main App.
 */
const AppWithAuth = () => {
  return (
    <AuthProvider>
      <App />
    </AuthProvider>
  );
};

export default AppWithAuth;
