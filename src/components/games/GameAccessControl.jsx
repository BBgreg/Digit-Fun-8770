import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useSubscription } from '../../hooks/useSubscription';
import PaywallModal from '../subscription/PaywallModal';
import { useAuth } from '../../contexts/AuthContext';
import SafeIcon from '../../common/SafeIcon';
import * as FiIcons from 'react-icons/fi';

const { FiLoader } = FiIcons;

const GameAccessControl = ({ children, gameMode, onGameStart }) => {
  const { user } = useAuth();
  const { subscription, loading, canPlayGames, shouldShowPaywall, incrementFreeGamesPlayed, getRemainingFreeGames } = useSubscription();
  const [showPaywall, setShowPaywall] = useState(false);
  const [isProcessingGame, setIsProcessingGame] = useState(false);

  const pricingPlan = {
    name: "Unlimited",
    amount: 2.99,
    priceId: "price_1Rp0nHIa1WstuQNe3aRfnIj1",
    paymentLink: "https://buy.stripe.com/4gMcN5cJ46hqdmS0q01RC01",
    currency: "usd",
    interval: "month"
  };

  // Handle game start with subscription checks
  const handleGameStart = async () => {
    try {
      setIsProcessingGame(true);
      console.log('GameAccessControl: Starting game check for mode:', gameMode);
      console.log('Current subscription:', subscription);

      // Check if user can play games
      if (!canPlayGames()) {
        console.log('User cannot play games, showing paywall');
        setShowPaywall(true);
        return;
      }

      // For free trial users, increment the counter before starting the game
      if (subscription?.subscription_status === 'free_trial') {
        console.log('Incrementing free games played...');
        const result = await incrementFreeGamesPlayed();
        
        if (!result.success) {
          console.error('Failed to increment free games:', result.error);
          // Still allow the game to proceed, but log the error
        } else {
          console.log('Free games incremented successfully:', result.data);
          
          // After incrementing, check if we've hit the limit
          if (result.data.free_games_played >= 6) {
            console.log('Free games limit reached after increment, showing paywall');
            setShowPaywall(true);
            return;
          }
        }
      }

      // If we get here, user can play the game
      console.log('User can play game, starting...');
      if (onGameStart) {
        await onGameStart();
      }
    } catch (error) {
      console.error('Error in game start process:', error);
      // Allow game to proceed on error to avoid blocking users
      if (onGameStart) {
        await onGameStart();
      }
    } finally {
      setIsProcessingGame(false);
    }
  };

  // Handle subscription purchase
  const handleSubscribe = async () => {
    try {
      console.log('Opening Stripe payment link for user:', user.id);
      // Open Stripe payment link in new tab
      window.open(pricingPlan.paymentLink, '_blank');
    } catch (error) {
      console.error('Subscription error:', error);
      throw error;
    }
  };

  // Show loading state while checking subscription
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin h-12 w-12 border-4 border-indigo-200 border-t-indigo-500 rounded-full mx-auto mb-4"></div>
          <p className="text-indigo-600">Checking subscription status...</p>
        </div>
      </div>
    );
  }

  // Show paywall modal if needed
  if (showPaywall) {
    return (
      <>
        {children}
        <PaywallModal
          isOpen={showPaywall}
          onClose={() => setShowPaywall(false)}
          onSubscribe={handleSubscribe}
          subscription={subscription}
        />
      </>
    );
  }

  // Clone children and inject game start handler
  const childrenWithProps = React.Children.map(children, child => {
    if (React.isValidElement(child)) {
      return React.cloneElement(child, {
        onGameStart: handleGameStart,
        isProcessingGame,
        subscription,
        remainingFreeGames: getRemainingFreeGames()
      });
    }
    return child;
  });

  return <>{childrenWithProps}</>;
};

export default GameAccessControl;