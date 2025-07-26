import { useState, useEffect, useCallback } from 'react';
import supabase from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

export const useSubscription = () => {
  const [subscription, setSubscription] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { user } = useAuth();

  // Fetch user's subscription status
  const fetchSubscription = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      if (!user) {
        setSubscription(null);
        return;
      }

      console.log('Fetching subscription for user:', user.id);

      const { data, error: fetchError } = await supabase
        .from('user_subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (fetchError) {
        if (fetchError.code === 'PGRST116') {
          // No subscription record found, create one
          console.log('No subscription record found, creating one...');
          await initializeSubscription();
          return;
        }
        throw fetchError;
      }

      console.log('Subscription data:', data);
      setSubscription(data);
    } catch (err) {
      console.error('Error fetching subscription:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Initialize subscription record for new users
  const initializeSubscription = async () => {
    try {
      if (!user) throw new Error('User must be authenticated');

      console.log('Initializing subscription for user:', user.id);

      const { data, error: insertError } = await supabase
        .from('user_subscriptions')
        .insert([{
          user_id: user.id,
          subscription_status: 'free_trial',
          free_games_played: 0
        }])
        .select()
        .single();

      if (insertError) throw insertError;

      console.log('Subscription initialized:', data);
      setSubscription(data);
    } catch (err) {
      console.error('Error initializing subscription:', err);
      setError(err.message);
    }
  };

  // Check if user can play games (has remaining free games or active subscription)
  const canPlayGames = () => {
    if (!subscription) return false;
    
    return (
      subscription.subscription_status === 'active' ||
      (subscription.subscription_status === 'free_trial' && subscription.free_games_played < 6)
    );
  };

  // Check if user needs to see paywall
  const shouldShowPaywall = () => {
    if (!subscription) return false;
    
    return (
      subscription.subscription_status === 'free_trial' && 
      subscription.free_games_played >= 6
    );
  };

  // Get remaining free games
  const getRemainingFreeGames = () => {
    if (!subscription || subscription.subscription_status !== 'free_trial') return 0;
    return Math.max(0, 6 - subscription.free_games_played);
  };

  // Increment free games played (atomic operation)
  const incrementFreeGamesPlayed = async () => {
    try {
      if (!user || !subscription) {
        throw new Error('User or subscription not available');
      }

      // Only increment for free trial users
      if (subscription.subscription_status !== 'free_trial') {
        console.log('User has active subscription, not incrementing free games');
        return { success: true, data: subscription };
      }

      console.log('Incrementing free games played for user:', user.id);

      // Use atomic increment to prevent race conditions
      const { data, error: updateError } = await supabase
        .from('user_subscriptions')
        .update({ 
          free_games_played: subscription.free_games_played + 1,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id)
        .select()
        .single();

      if (updateError) throw updateError;

      console.log('Free games incremented:', data);
      setSubscription(data);
      
      return { success: true, data };
    } catch (err) {
      console.error('Error incrementing free games:', err);
      return { success: false, error: err.message };
    }
  };

  // Update subscription status (used by webhook handlers)
  const updateSubscriptionStatus = async (updates) => {
    try {
      if (!user) throw new Error('User must be authenticated');

      const { data, error: updateError } = await supabase
        .from('user_subscriptions')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id)
        .select()
        .single();

      if (updateError) throw updateError;

      setSubscription(data);
      return { success: true, data };
    } catch (err) {
      console.error('Error updating subscription:', err);
      return { success: false, error: err.message };
    }
  };

  useEffect(() => {
    fetchSubscription();
  }, [fetchSubscription]);

  return {
    subscription,
    loading,
    error,
    canPlayGames,
    shouldShowPaywall,
    getRemainingFreeGames,
    incrementFreeGamesPlayed,
    updateSubscriptionStatus,
    refetch: fetchSubscription
  };
};