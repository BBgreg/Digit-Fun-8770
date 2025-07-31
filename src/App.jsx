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

  // `currentScreen` determines which component is visible. Starts with a loading screen.
  const [currentScreen, setCurrentScreen] = useState('global-loading');
  
  // `isAuthReady` tracks if the initial authentication check from Firebase has completed.
  const [isAuthReady, setIsAuthReady] = useState(false);
  
  // `gameParams` stores parameters needed for the game play screen.
  const [gameParams, setGameParams] = useState({});
  
  // `editingNumber` holds the data of a phone number when the user wants to edit it.
  const [editingNumber, setEditingNumber] = useState(null);

  // --- AUTHENTICATION CONTEXT ---

  // Destructure values from the authentication context.
  const { user, navigateToScreen, clearNavigationTarget, loading, isAuthReady: authContextReady } = useAuth();

  // --- EFFECTS ---

  // Effect to sync the authentication readiness state from the context to this component's local state.
  // This ensures the app knows when it's safe to check for a user.
  useEffect(() => {
    if (authContextReady && !isAuthReady) {
      console.log('✅ App: Auth context is ready, updating local state.');
      setIsAuthReady(true);
    }
  }, [authContextReady, isAuthReady]);

  /**
   * CRITICAL NAVIGATION LOGIC
   * This effect is responsible for all main routing decisions.
   * It waits until authentication is ready, then directs the user to the correct screen.
   */
  useEffect(() => {
    // Only run navigation logic after the initial auth check is complete.
    if (isAuthReady) {
      // 1. Handle explicit navigation (e.g., after an email confirmation link).
      // This takes priority over all other routing.
      if (navigateToScreen) {
        console.log(`🚀 App: IMMEDIATE NAVIGATION to: ${navigateToScreen}`);
        setCurrentScreen(navigateToScreen);
        clearNavigationTarget(); // Clear the target so this doesn't run again.
        return; // Stop further execution in this effect.
      }

      // 2. Determine the default screen based on whether a user is logged in.
      if (user) {
        // If the user is authenticated, and they are on the auth or loading screen,
        // navigate them to the main dashboard.
        if (currentScreen === 'auth' || currentScreen === 'global-loading') {
          console.log('🚀 App: User authenticated, defaulting to dashboard.');
          setCurrentScreen('dashboard');
        }
      } else {
        // If the user is not authenticated, ensure the auth screen is shown.
        if (currentScreen !== 'auth') {
          console.log('🔒 App: User not authenticated, ensuring auth screen is shown.');
          setCurrentScreen('auth');
        }
      }
    }
  }, [user, navigateToScreen, isAuthReady, clearNavigationTarget]);


  /**
   * Handles manual navigation triggered by child components (e.g., button clicks).
   * @param {string} screen - The key for the screen to navigate to.
   * @param {object} params - Any parameters needed for the destination screen.
   */
  const handleNavigation = (screen, params = {}) => {
    console.log(`🧭 App: Manual navigation to: ${screen}`, params);
    setGameParams(params);
    
    if (screen === 'edit-number') {
      setEditingNumber(params);
      setCurrentScreen('number-form');
    } else if (screen === 'add-number') {
      setEditingNumber(null); // Ensure we are not editing when adding.
      setCurrentScreen('number-form');
    } else {
      setEditingNumber(null);
      setCurrentScreen(screen);
    }
  };
  
  // Optional: Enhanced debug logging to monitor state changes during development.
  useEffect(() => {
    console.log('🔥 App State Update:', {
      currentScreen,
      isAuthReady,
      userAuthenticated: !!user,
      navigateToScreen,
      authLoading: loading,
    });
  }, [currentScreen, user, navigateToScreen, isAuthReady, loading]);


  // --- RENDER LOGIC ---

  return (
    <div className="app">
      <AnimatePresence mode="wait">
        {/* Global Loading Screen: Shown only when currentScreen is 'global-loading' */}
        {currentScreen === 'global-loading' && (
          <motion.div key="global-loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <LoadingScreen />
          </motion.div>
        )}

        {/* Auth Screen: Shown only when not logged in AND auth is ready */}
        {currentScreen === 'auth' && isAuthReady && !user && (
          <motion.div key="auth" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <AuthScreen />
          </motion.div>
        )}

        {/* Dashboard: Shown when logged in AND auth is ready */}
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

        {/* Number Form Screen (for adding or editing) */}
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
 * This is the component that should be exported and used in your index.js file.
 */
const AppWithAuth = () => {
  return (
    <AuthProvider>
      <App />
    </AuthProvider>
  );
};

export default AppWithAuth;
