import React from 'react';
import { useSubscription } from '../../hooks/useSubscription';
import { useAuth } from '../../contexts/AuthContext';
import SafeIcon from '../../common/SafeIcon';
import * as FiIcons from 'react-icons/fi';

const { FiLoader } = FiIcons;

const GameAccessControl = ({ children, gameMode, onGameStart }) => {
  const { user } = useAuth();
  const { loading } = useSubscription();

  // Handle game start - now simplified since all games are free
  const handleGameStart = async () => {
    try {
      console.log('🎮 GameAccessControl: Starting game mode:', gameMode);
      
      // Simply call onGameStart if provided
      if (onGameStart) {
        await onGameStart();
      }
    } catch (error) {
      console.error('❌ Error in game start process:', error);
      // Allow game to proceed on error to avoid blocking users
      if (onGameStart) {
        await onGameStart();
      }
    }
  };

  // Show loading state while checking subscription
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin h-12 w-12 border-4 border-indigo-200 border-t-indigo-500 rounded-full mx-auto mb-4"></div>
          <p className="text-indigo-600">Loading game...</p>
        </div>
      </div>
    );
  }

  // Clone children and inject game start handler
  const childrenWithProps = React.Children.map(children, child => {
    if (React.isValidElement(child)) {
      return React.cloneElement(child, {
        onGameStart: handleGameStart,
        isProcessingGame: false,
        gameMode
      });
    }
    return child;
  });

  return <>{childrenWithProps}</>;
};

export default GameAccessControl;