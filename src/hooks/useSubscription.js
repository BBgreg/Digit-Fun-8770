import { useState, useEffect } from 'react';
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
              subscription_status: 'active', // Always set to active
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
        
        // Ensure subscription is always active regardless of what's in the database
        if (subData && subData.subscription_status !== 'active') {
          subData.subscription_status = 'active';
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
            .insert([{ 
              user_id: user.id, 
              email: user.email, 
              has_paid: true // Always set to true
            }])
            .select()
            .single();
          if (insertProfileError) throw insertProfileError;
          profileData = newProfile;
        } else if (profileError) {
          throw profileError;
        }
        
        // Ensure has_paid is always true regardless of what's in the database
        if (profileData && !profileData.has_paid) {
          profileData.has_paid = true;
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
  }, [user]);

  // Always return true - all games are always available
  const canPlayGameMode = () => true;

  // This function now does nothing - no usage tracking
  const incrementGameModeUsage = async () => {
    return { success: true };
  };

  // Simple implementation of getUsageSummary for backward compatibility
  const getUsageSummary = () => {
    return {
      'sequence-riddle': { used: 0, remaining: 'Unlimited' },
      'speed-5': { used: 0, remaining: 'Unlimited' },
      'word-search': { used: 0, remaining: 'Unlimited' },
      'odd-one-out': { used: 0, remaining: 'Unlimited' },
    };
  };

  return {
    subscription,
    userProfile,
    loading,
    error,
    canPlayGameMode,
    incrementGameModeUsage,
    getUsageSummary,
  };
};