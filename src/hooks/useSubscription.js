import { useState, useEffect, useCallback } from 'react';
import supabase from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

export const useSubscription = () => {
  const [subscription, setSubscription] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { user } = useAuth();

  /**
   * This is the main data fetching function. It has been rewritten to be more robust.
   * It attempts to fetch user data, and if the data doesn't exist (for a new user),
   * it creates the necessary records and uses the newly created data in a single flow.
   */
  const fetchUserData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      if (!user) {
        setSubscription(null);
        setUserProfile(null);
        return;
      }

      console.log('🔍 Fetching/Initializing user data for:', user.id);

      // --- Fetch/Initialize Subscription Data ---
      let { data: subData, error: subError } = await supabase
        .from('user_subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (subError && subError.code === 'PGRST116') { // 'PGRST116' means no rows found
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

  // This effect runs whenever the user's authentication state changes.
  useEffect(() => {
    fetchUserData();
  }, [fetchUserData]);

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

  const canPlayGameMode = (gameMode) => {
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
  };

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

  return {
    subscription,
    userProfile,
    loading,
    error,
    canPlayGameMode,
    getRemainingUsesForGameMode,
    incrementGameModeUsage,
    refetch: fetchUserData
  };
};
