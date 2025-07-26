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
  const { 
    subscription, 
    loading, 
    canPlayGameMode, 
    shouldShowPaywallForGameMode, 
    incrementGameModeUsage, 
    getRemainingUsesForGameMode 
  } = useSubscription();
  
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

  // Check if we should show paywall initially
  useEffect(() => {
    if (!loading && shouldShowPaywallForGameMode(gameMode)) {
      setShowPaywall(true);
    }
  }, [loading, shouldShowPaywallForGameMode, gameMode]);

  // UPDATED: Game access control with per-game-mode limits
  const handleGameStart = async () => {
    try {
      setIsProcessingGame(true);
      console.log('🎮 GameAccessControl: Starting game check for mode:', gameMode);
      console.log('📊 Current subscription:', subscription);

      // STEP 1: Check current game access for this specific mode BEFORE incrementing
      if (!canPlayGameMode(gameMode)) {
        console.log('🚫 User cannot play this game mode, showing paywall');
        setShowPaywall(true);
        setIsProcessingGame(false);
        return;
      }

      // STEP 2: For free trial users, increment the counter for this game mode BEFORE starting
      // This ensures we track usage immediately when game starts
      if (subscription?.subscription_status === 'free_trial') {
        console.log('🔢 Incrementing usage for game mode:', gameMode);
        console.log('📊 Current usage before increment:', subscription[`${gameMode.replace('-', '_')}_uses`]);
        
        const result = await incrementGameModeUsage(gameMode);
        
        if (!result.success) {
          console.error('❌ Failed to increment game mode usage:', result.error);
          // Show error but still allow game to proceed
          setIsProcessingGame(false);
          if (onGameStart) {
            await onGameStart();
          }
          return;
        } else {
          console.log('✅ Game mode usage incremented successfully:', result.data);
          const columnName = `${gameMode.replace('-', '_')}_uses`;
          console.log('📊 New usage after increment:', result.data[columnName]);
          
          // STEP 3: After incrementing, check if we've hit the limit for this game mode
          // This should never happen here since we check beforehand, but it's a safeguard
          if (result.data[columnName] >= 2) {
            console.log('🚫 Game mode limit reached after increment, showing paywall');
            setShowPaywall(true);
            setIsProcessingGame(false);
            return;
          }
        }
      }

      // STEP 4: If we get here, user can play the game
      console.log('✅ User can play game, starting...');
      if (onGameStart) {
        await onGameStart();
      }
    } catch (error) {
      console.error('❌ Error in game start process:', error);
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
      console.log('💳 Opening Stripe payment link for user:', user?.id);
      // Open Stripe payment link in new tab
      window.open(pricingPlan.paymentLink, '_blank');
    } catch (error) {
      console.error('❌ Subscription error:', error);
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
          gameMode={gameMode}
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
        remainingUses: getRemainingUsesForGameMode(gameMode),
        gameMode
      });
    }
    return child;
  });

  return <>{childrenWithProps}</>;
};

export default GameAccessControl;