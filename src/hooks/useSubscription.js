import { useState, useEffect, useCallback } from 'react';
import supabase from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

export const useSubscription = () => {
  const [subscription, setSubscription] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { user } = useAuth();

  const fetchUserData = useCallback(async () => {
    setLoading(true); 
    try {
      setError(null);

      if (!user) {
        setSubscription(null);
        setUserProfile(null);
        setLoading(false);
        return;
      }

      console.log('🔍 Fetching/Initializing user data for:', user.id);

      // --- Fetch/Initialize Subscription Data ---
      let { data: subData, error: subError } = await supabase
        .from('user_subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (subError && subError.code === 'PGRST116') {
        console.log('📝 No subscription found, creating one...');
        const { data: newSub, error: insertSubError } = await supabase
          .from('user_subscriptions')
          .insert([{
            user_id: user.id,
            subscription_status: 'free_trial',
            sequence_riddle_uses: 0,
            speed_5_uses: 0,
            word_search_uses: 0,
            odd_one_out_uses: 0
          }])
          .select()
          .single();
        if (insertSubError) throw insertSubError;
        subData = newSub;
        console.log('✅ New subscription created and used:', subData);
      } else if (subError) {
        throw subError;
      }
      setSubscription(subData);
      console.log('📊 Subscription data set:', subData);

      // --- Fetch/Initialize Profile Data ---
      let { data: profileData, error: profileError } = await supabase
        .from('app_users_profile')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (profileError && profileError.code === 'PGRST116') {
        console.log('📝 No profile found, creating one...');
        const { data: newProfile, error: insertProfileError } = await supabase
          .from('app_users_profile')
          .insert([{ user_id: user.id, email: user.email, has_paid: false }])
          .select()
          .single();
        if (insertProfileError) throw insertProfileError;
        profileData = newProfile;
        console.log('✅ New profile created and used:', profileData);
      } else if (profileError) {
        throw profileError;
      }
      setUserProfile(profileData);
      console.log('👤 Profile data set:', profileData);

    } catch (err) {
      console.error('❌ Error in fetchUserData:', err);
      setError(err.message);
    } finally {
      console.log('✅ fetchUserData finished, setting loading to false.');
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      fetchUserData();
    } else {
      setLoading(false);
    }
  }, [user, fetchUserData]);

  const incrementGameModeUsage = async (gameMode) => {
    try {
      if (!user || !subscription) throw new Error('User or subscription not available');
      if (subscription.subscription_status !== 'free_trial') return { success: true, data: subscription };

      const gameColumnMap = {
        'sequence-riddle': 'sequence_riddle_uses',
        'speed-5': 'speed_5_uses',
        'word-search': 'word_search_uses',
        'odd-one-out': 'odd_one_out_uses'
      };
      const columnName = gameColumnMap[gameMode];
      if (!columnName) throw new Error(`Unknown game mode: ${gameMode}`);

      const { data: currentData, error: getCurrentError } = await supabase
        .from('user_subscriptions')
        .select(columnName)
        .eq('user_id', user.id)
        .single();
      if (getCurrentError) throw getCurrentError;
      
      const currentUsage = currentData[columnName] || 0;
      const { data, error: updateError } = await supabase
        .from('user_subscriptions')
        .update({ [columnName]: currentUsage + 1 })
        .eq('user_id', user.id)
        .select()
        .single();

      if (updateError) throw updateError;
      setSubscription(data);
      return { success: true, data };
    } catch (err) {
      console.error('❌ Error incrementing game mode usage:', err);
      return { success: false, error: err.message };
    }
  };

  const canPlayGameMode = useCallback((gameMode) => {
    if (!subscription) return false;
    if (subscription.subscription_status === 'active') return true;
    if (subscription.subscription_status === 'free_trial') {
      const gameColumnMap = {
        'sequence-riddle': 'sequence_riddle_uses',
        'speed-5': 'speed_5_uses',
        'word-search': 'word_search_uses',
        'odd-one-out': 'odd_one_out_uses'
      };
      const columnName = gameColumnMap[gameMode];
      if (!columnName) return false;
      return (subscription[columnName] || 0) < 2;
    }
    return false;
  }, [subscription]);

  const getRemainingUsesForGameMode = useCallback((gameMode) => {
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
  }, [subscription]);

  const getTotalRemainingUses = useCallback(() => {
    if (!subscription || subscription.subscription_status !== 'free_trial') return 0;
    const gameModes = ['sequence-riddle', 'speed-5', 'word-search', 'odd-one-out'];
    return gameModes.reduce((total, mode) => total + getRemainingUsesForGameMode(mode), 0);
  }, [subscription, getRemainingUsesForGameMode]);

  const getUsageSummary = useCallback(() => {
    if (!subscription) return {
        'sequence-riddle': { used: 0, remaining: 0 },
        'speed-5': { used: 0, remaining: 0 },
        'word-search': { used: 0, remaining: 0 },
        'odd-one-out': { used: 0, remaining: 0 },
    };
    
    const gameModes = ['sequence-riddle', 'speed-5', 'word-search', 'odd-one-out'];
    const summary = {};
    gameModes.forEach(mode => {
      const columnName = `${mode.replace('-', '_')}_uses`;
      summary[mode] = {
        used: subscription[columnName] || 0,
        remaining: getRemainingUsesForGameMode(mode)
      };
    });
    return summary;
  }, [subscription, getRemainingUsesForGameMode]);

  /**
   * FINAL FIX: This function was missing. It checks if a user has used up their
   * free plays for a specific game mode.
   */
  const shouldShowPaywallForGameMode = useCallback((gameMode) => {
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
      return currentUsage >= 2;
    }
    return false;
  }, [subscription]);

  return {
    subscription,
    userProfile,
    loading,
    error,
    canPlayGameMode,
    getRemainingUsesForGameMode,
    incrementGameModeUsage,
    getTotalRemainingUses,
    getUsageSummary,
    shouldShowPaywallForGameMode, // Added back for GameAccessControl
    refetch: fetchUserData
  };
};
