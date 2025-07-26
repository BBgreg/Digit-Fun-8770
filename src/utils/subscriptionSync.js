// Utility functions for subscription synchronization
import supabase from '../lib/supabase';

// Sync subscription status from Stripe webhook data
export const syncSubscriptionFromStripe = async (stripeSubscription, customerId) => {
  try {
    console.log('🔄 Syncing subscription from Stripe:', stripeSubscription.id);

    // Map Stripe status to our internal status
    let internalStatus = 'active';
    let hasPaid = true;

    switch (stripeSubscription.status) {
      case 'active':
        internalStatus = 'active';
        hasPaid = true;
        break;
      case 'canceled':
        internalStatus = 'canceled';
        hasPaid = false;
        break;
      case 'past_due':
        internalStatus = 'past_due';
        hasPaid = false;
        break;
      case 'unpaid':
        internalStatus = 'unpaid';
        hasPaid = false;
        break;
      default:
        internalStatus = stripeSubscription.status;
        hasPaid = stripeSubscription.status === 'active';
    }

    // Update user_subscriptions table
    const { data: subData, error: subError } = await supabase
      .from('user_subscriptions')
      .update({
        stripe_subscription_id: stripeSubscription.id,
        subscription_status: internalStatus,
        current_period_end: new Date(stripeSubscription.current_period_end * 1000).toISOString(),
        free_games_played: internalStatus === 'active' ? 0 : undefined, // Reset if active
        updated_at: new Date().toISOString()
      })
      .eq('stripe_customer_id', customerId)
      .select()
      .single();

    if (subError) {
      console.error('❌ Error updating subscription:', subError);
      throw subError;
    }

    // Update app_users_profile table
    const { error: profileError } = await supabase
      .from('app_users_profile')
      .update({
        has_paid: hasPaid,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', subData.user_id);

    if (profileError) {
      console.error('❌ Error updating profile:', profileError);
      // Don't throw - subscription update succeeded
    }

    console.log('✅ Successfully synced subscription:', {
      subscriptionId: stripeSubscription.id,
      status: internalStatus,
      hasPaid
    });

    return { success: true, data: subData };
  } catch (error) {
    console.error('❌ Error syncing subscription:', error);
    return { success: false, error: error.message };
  }
};

// Verify subscription data consistency
export const verifySubscriptionConsistency = async (userId) => {
  try {
    console.log('🔍 Verifying subscription consistency for user:', userId);

    // Fetch both subscription and profile data
    const { data: subData, error: subError } = await supabase
      .from('user_subscriptions')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (subError) throw subError;

    const { data: profileData, error: profileError } = await supabase
      .from('app_users_profile')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (profileError) throw profileError;

    // Check consistency
    const expectedHasPaid = subData.subscription_status === 'active';
    const isConsistent = profileData.has_paid === expectedHasPaid;

    if (!isConsistent) {
      console.warn('⚠️ Subscription data inconsistency detected:', {
        subscriptionStatus: subData.subscription_status,
        profileHasPaid: profileData.has_paid,
        expectedHasPaid
      });

      // Fix the inconsistency
      const { error: fixError } = await supabase
        .from('app_users_profile')
        .update({
          has_paid: expectedHasPaid,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId);

      if (fixError) {
        console.error('❌ Error fixing inconsistency:', fixError);
      } else {
        console.log('✅ Fixed subscription data inconsistency');
      }
    }

    return {
      success: true,
      consistent: isConsistent,
      subscription: subData,
      profile: profileData
    };
  } catch (error) {
    console.error('❌ Error verifying subscription consistency:', error);
    return { success: false, error: error.message };
  }
};

// Initialize user records if missing
export const ensureUserRecordsExist = async (userId, userEmail) => {
  try {
    console.log('🔧 Ensuring user records exist for:', userId);

    // Check and create subscription record
    const { data: existingSub, error: subCheckError } = await supabase
      .from('user_subscriptions')
      .select('id')
      .eq('user_id', userId)
      .single();

    if (subCheckError && subCheckError.code === 'PGRST116') {
      // Create subscription record
      const { error: subCreateError } = await supabase
        .from('user_subscriptions')
        .insert({
          user_id: userId,
          subscription_status: 'free_trial',
          free_games_played: 0
        });

      if (subCreateError) {
        console.error('❌ Error creating subscription record:', subCreateError);
      } else {
        console.log('✅ Created subscription record');
      }
    }

    // Check and create profile record
    const { data: existingProfile, error: profileCheckError } = await supabase
      .from('app_users_profile')
      .select('user_id')
      .eq('user_id', userId)
      .single();

    if (profileCheckError && profileCheckError.code === 'PGRST116') {
      // Create profile record
      const { error: profileCreateError } = await supabase
        .from('app_users_profile')
        .insert({
          user_id: userId,
          email: userEmail,
          has_paid: false
        });

      if (profileCreateError) {
        console.error('❌ Error creating profile record:', profileCreateError);
      } else {
        console.log('✅ Created profile record');
      }
    }

    return { success: true };
  } catch (error) {
    console.error('❌ Error ensuring user records exist:', error);
    return { success: false, error: error.message };
  }
};