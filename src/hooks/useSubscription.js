import { useState, useEffect, useCallback } from 'react';
import supabase from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

export const useSubscription = () => {
  const [subscription, setSubscription] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { user } = useAuth();

  useEffect(() => {
    const fetchAndSetData = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        // --- Fetch/Initialize Subscription Data ---
        let { data: subData, error: subError } = await supabase
          .from('user_subscriptions')
          .select('*')
          .eq('user_id', user.id)
          .single();

        if (subError && subError.code === 'PGRST116') {
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
        } else if (subError) {
          throw subError;
        }
        setSubscription(subData);

        // --- Fetch/Initialize Profile Data ---
        let { data: profileData, error: profileError } = await supabase
          .from('app_users_profile')
          .select('*')
          .eq('user_id', user.id)
          .single();

        if (profileError && profileError.code === 'PGRST116') {
          const { data: newProfile, error: insertProfileError } = await supabase
            .from('app_users_profile')
            .insert([{ user_id: user.id, email: user.email, has_paid: false }])
            .select()
            .single();
          if (insertProfileError) throw insertProfileError;
          profileData = newProfile;
        } else if (profileError) {
          throw profileError;
        }
        setUserProfile(profileData);

      } catch (err) {
        console.error('❌ Error in fetchUserData:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchAndSetData();
  }, [user]); // This effect now ONLY depends on the user object.

  const incrementGameModeUsage = async (gameMode) => {
    try {
      if (!user || !subscription) throw new Error('User or subscription not available');
      if (subscription.subscription_status !== 'free_trial') {
        return { success: true, data: subscription };
      }

      const gameColumnMap = {
        'sequence-riddle': 'sequence_riddle_uses',
        'speed-5': 'speed_5_uses',
        'word-search': 'word_search_uses',
        'odd-one-out': 'odd_one_out_uses'
      };
      const columnName = gameColumnMap[gameMode];
      if (!columnName) throw new Error(`Unknown game mode: ${gameMode}`);
      
      const currentUsage = subscription[columnName] || 0;
      const newUsage = currentUsage + 1;

      const { data, error: updateError } = await supabase
        .from('user_subscriptions')
        .update({ [columnName]: newUsage })
        .eq('user_id', user.id)
        .select()
        .single();

      if (updateError) throw updateError;
      
      setSubscription(data); // Update local state with the new data from the database
      return { success: true, data };
    } catch (err) {
      console.error('❌ Error incrementing game mode usage:', err);
      return { success: false, error: err.message };
    }
  };

  const canPlayGameMode = useCallback((gameMode) => {
    if (loading || !subscription) return false;
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
  }, [subscription, loading]);

  const getRemainingUsesForGameMode = useCallback((gameMode) => {
    if (loading || !subscription || subscription.subscription_status !== 'free_trial') return 0;
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
  }, [subscription, loading]);

  const getUsageSummary = useCallback(() => {
    if (loading || !subscription) return {
        'sequence-riddle': { used: 0, remaining: 2 },
        'speed-5': { used: 0, remaining: 2 },
        'word-search': { used: 0, remaining: 2 },
        'odd-one-out': { used: 0, remaining: 2 },
    };
    
    const gameModes = ['sequence-riddle', 'speed-5', 'word-search', 'odd-one-out'];
    const summary = {};
    gameModes.forEach(mode => {
      const columnName = `${mode.replace(/-/g, '_')}_uses`;
      summary[mode] = {
        used: subscription[columnName] || 0,
        remaining: getRemainingUsesForGameMode(mode)
      };
    });
    return summary;
  }, [subscription, loading, getRemainingUsesForGameMode]);

  const shouldShowPaywallForGameMode = useCallback((gameMode) => {
    if (loading || !subscription) return false;

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
  }, [subscription, loading]);

  return {
    subscription,
    userProfile,
    loading,
    error,
    canPlayGameMode,
    getRemainingUsesForGameMode,
    incrementGameModeUsage,
    getUsageSummary,
    shouldShowPaywallForGameMode,
  };
};
