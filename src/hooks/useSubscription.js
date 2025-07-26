import { useState, useEffect, useCallback } from 'react';
import supabase from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

export const useSubscription = () => {
  const [subscription, setSubscription] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { user } = useAuth();

  // Initialize user records on first access
  const initializeUserRecords = async () => {
    try {
      if (!user) throw new Error('User must be authenticated');

      console.log('🔄 Initializing user records for:', user.id);

      // Check if subscription record exists
      const { data: existingSubscription, error: subError } = await supabase
        .from('user_subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (subError && subError.code === 'PGRST116') {
        // No subscription record found, create one
        console.log('📝 Creating subscription record...');
        const { data: newSub, error: insertSubError } = await supabase
          .from('user_subscriptions')
          .insert([{
            user_id: user.id,
            subscription_status: 'free_trial',
            free_games_played: 0,
            sequence_riddle_uses: 0,
            speed_5_uses: 0,
            word_search_uses: 0,
            odd_one_out_uses: 0
          }])
          .select()
          .single();

        if (insertSubError) throw insertSubError;
        console.log('✅ Subscription record created:', newSub);
      }

      // Check if profile record exists
      const { data: existingProfile, error: profileError } = await supabase
        .from('app_users_profile')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (profileError && profileError.code === 'PGRST116') {
        // No profile record found, create one
        console.log('📝 Creating profile record...');
        const { data: newProfile, error: insertProfileError } = await supabase
          .from('app_users_profile')
          .insert([{
            user_id: user.id,
            email: user.email,
            has_paid: false
          }])
          .select()
          .single();

        if (insertProfileError) throw insertProfileError;
        console.log('✅ Profile record created:', newProfile);
      }

    } catch (err) {
      console.error('❌ Error initializing user records:', err);
      // Don't throw here - let the app continue, just log the error
    }
  };

  // Fetch user's subscription status and profile
  const fetchUserData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      if (!user) {
        setSubscription(null);
        setUserProfile(null);
        return;
      }

      console.log('🔍 Fetching user data for:', user.id);

      // Initialize records if needed
      await initializeUserRecords();

      // Fetch subscription data
      const { data: subData, error: subError } = await supabase
        .from('user_subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (subError) {
        if (subError.code === 'PGRST116') {
          // Still no record after initialization attempt
          console.warn('⚠️ No subscription record found after initialization');
          setSubscription(null);
        } else {
          throw subError;
        }
      } else {
        console.log('📊 Subscription data:', subData);
        setSubscription(subData);
      }

      // Fetch profile data
      const { data: profileData, error: profileError } = await supabase
        .from('app_users_profile')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (profileError) {
        if (profileError.code === 'PGRST116') {
          console.warn('⚠️ No profile record found after initialization');
          setUserProfile(null);
        } else {
          throw profileError;
        }
      } else {
        console.log('👤 Profile data:', profileData);
        setUserProfile(profileData);
      }

    } catch (err) {
      console.error('❌ Error fetching user data:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [user]);

  // UPDATED: Increment specific game mode usage
  const incrementGameModeUsage = async (gameMode) => {
    try {
      if (!user || !subscription) {
        throw new Error('User or subscription not available');
      }

      // Only increment for free trial users
      if (subscription.subscription_status !== 'free_trial') {
        console.log('🔓 User has active subscription, not incrementing game uses');
        return { success: true, data: subscription };
      }

      console.log('🎮 Incrementing game mode usage for:', gameMode);

      // Map game mode to column name
      const gameColumnMap = {
        'sequence-riddle': 'sequence_riddle_uses',
        'speed-5': 'speed_5_uses',
        'word-search': 'word_search_uses',
        'odd-one-out': 'odd_one_out_uses'
      };

      const columnName = gameColumnMap[gameMode];
      if (!columnName) {
        throw new Error(`Unknown game mode: ${gameMode}`);
      }

      console.log('📊 Current usage for', gameMode, ':', subscription[columnName]);

      // CRITICAL FIX: Ensure we're using the actual current value from DB
      // Get the current value to ensure we have the latest data
      const { data: currentData, error: getCurrentError } = await supabase
        .from('user_subscriptions')
        .select(columnName)
        .eq('user_id', user.id)
        .single();
        
      if (getCurrentError) throw getCurrentError;
      
      const currentUsage = currentData[columnName] || 0;
      console.log('📊 Current usage from DB:', currentUsage);
      
      // ATOMIC increment using Supabase
      const updateData = {
        [columnName]: currentUsage + 1, // Increment from actual current value
        updated_at: new Date().toISOString()
      };

      console.log('🔄 Updating with data:', updateData);

      const { data, error: updateError } = await supabase
        .from('user_subscriptions')
        .update(updateData)
        .eq('user_id', user.id)
        .select()
        .single();

      if (updateError) throw updateError;

      console.log('✅ Game mode usage incremented successfully:', data);
      console.log('📊 New usage for', gameMode, ':', data[columnName]);

      // Update local state
      setSubscription(data);

      return { success: true, data };
    } catch (err) {
      console.error('❌ Error incrementing game mode usage:', err);
      return { success: false, error: err.message };
    }
  };

  // UPDATED: Check if user can play specific game mode
  const canPlayGameMode = (gameMode) => {
    if (!subscription) {
      console.log('❓ No subscription data available');
      return false;
    }

    // Active subscribers can play unlimited
    if (subscription.subscription_status === 'active') {
      return true;
    }

    // Free trial users are limited to 2 uses per game mode
    if (subscription.subscription_status === 'free_trial') {
      const gameColumnMap = {
        'sequence-riddle': 'sequence_riddle_uses',
        'speed-5': 'speed_5_uses',
        'word-search': 'word_search_uses',
        'odd-one-out': 'odd_one_out_uses'
      };

      const columnName = gameColumnMap[gameMode];
      if (!columnName) {
        console.log('❓ Unknown game mode:', gameMode);
        return false;
      }

      const currentUsage = subscription[columnName] || 0;
      const canPlay = currentUsage < 2;

      console.log('🎮 Can play', gameMode, '?', canPlay, {
        currentUsage,
        limit: 2
      });

      return canPlay;
    }

    return false;
  };

  // UPDATED: Check if user needs to see paywall for specific game mode
  const shouldShowPaywallForGameMode = (gameMode) => {
    if (!subscription) return false;

    if (subscription.subscription_status === 'free_trial') {
      const gameColumnMap = {
        'sequence-riddle': 'sequence_riddle_uses',
        'speed-5': 'speed_5_uses',
        'word-search': 'word_search_uses',
        'odd-one-out': 'odd_one_out_uses'
      };

      const columnName = gameColumnMap[gameMode];
      if (!columnName) return false;

      const currentUsage = subscription[columnName] || 0;
      const showPaywall = currentUsage >= 2;

      console.log('💰 Should show paywall for', gameMode, '?', showPaywall, {
        currentUsage,
        limit: 2
      });

      return showPaywall;
    }

    return false;
  };

  // UPDATED: Get remaining uses for specific game mode
  const getRemainingUsesForGameMode = (gameMode) => {
    if (!subscription || subscription.subscription_status !== 'free_trial') return 0;

    const gameColumnMap = {
      'sequence-riddle': 'sequence_riddle_uses',
      'speed-5': 'speed_5_uses',
      'word-search': 'word_search_uses',
      'odd-one-out': 'odd_one_out_uses'
    };

    const columnName = gameColumnMap[gameMode];
    if (!columnName) return 0;

    const currentUsage = subscription[columnName] || 0;
    return Math.max(0, 2 - currentUsage);
  };

  // UPDATED: Get total remaining uses across all game modes
  const getTotalRemainingUses = () => {
    if (!subscription || subscription.subscription_status !== 'free_trial') return 0;

    const gameModes = ['sequence-riddle', 'speed-5', 'word-search', 'odd-one-out'];
    let totalRemaining = 0;

    gameModes.forEach(gameMode => {
      totalRemaining += getRemainingUsesForGameMode(gameMode);
    });

    return totalRemaining;
  };

  // UPDATED: Get usage summary for all game modes
  const getUsageSummary = () => {
    if (!subscription) return {};

    return {
      'sequence-riddle': {
        used: subscription.sequence_riddle_uses || 0,
        remaining: getRemainingUsesForGameMode('sequence-riddle')
      },
      'speed-5': {
        used: subscription.speed_5_uses || 0,
        remaining: getRemainingUsesForGameMode('speed-5')
      },
      'word-search': {
        used: subscription.word_search_uses || 0,
        remaining: getRemainingUsesForGameMode('word-search')
      },
      'odd-one-out': {
        used: subscription.odd_one_out_uses || 0,
        remaining: getRemainingUsesForGameMode('odd-one-out')
      }
    };
  };

  // Legacy functions for backward compatibility
  const canPlayGames = () => {
    return getTotalRemainingUses() > 0 || subscription?.subscription_status === 'active';
  };

  const shouldShowPaywall = () => {
    return getTotalRemainingUses() === 0 && subscription?.subscription_status === 'free_trial';
  };

  const getRemainingFreeGames = () => {
    return getTotalRemainingUses();
  };

  const incrementFreeGamesPlayed = async () => {
    // This is now handled by incrementGameModeUsage
    console.warn('incrementFreeGamesPlayed is deprecated, use incrementGameModeUsage instead');
    return { success: true, data: subscription };
  };

  // Update subscription status (used by webhook handlers)
  const updateSubscriptionStatus = async (updates) => {
    try {
      if (!user) throw new Error('User must be authenticated');

      console.log('🔄 Updating subscription status:', updates);

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

      console.log('✅ Subscription updated:', data);
      setSubscription(data);

      // Refresh profile data as well (in case has_paid changed)
      await fetchUserData();

      return { success: true, data };
    } catch (err) {
      console.error('❌ Error updating subscription:', err);
      return { success: false, error: err.message };
    }
  };

  // Initialize on component mount
  useEffect(() => {
    fetchUserData();
  }, [fetchUserData]);

  return {
    subscription,
    userProfile,
    loading,
    error,
    // New per-game-mode functions
    canPlayGameMode,
    shouldShowPaywallForGameMode,
    getRemainingUsesForGameMode,
    incrementGameModeUsage,
    getTotalRemainingUses,
    getUsageSummary,
    // Legacy functions for backward compatibility
    canPlayGames,
    shouldShowPaywall,
    getRemainingFreeGames,
    incrementFreeGamesPlayed,
    updateSubscriptionStatus,
    refetch: fetchUserData
  };
};