import supabase from '../lib/supabase';

/**
 * Get user subscription status
 * @param {string} userId - The user ID
 * @returns {Promise<Object>} - The subscription data
 */
export const getUserSubscription = async (userId) => {
  try {
    const { data, error } = await supabase
      .from('user_subscriptions')
      .select('*')
      .eq('user_id', userId)
      .single();
      
    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Error getting user subscription:', error);
    return { data: null, error };
  }
};

/**
 * Check if a user's subscription is active
 * @param {string} userId - The user ID
 * @returns {Promise<boolean>} - Whether the subscription is active
 */
export const isSubscriptionActive = async (userId) => {
  try {
    const { data, error } = await supabase
      .from('user_subscriptions')
      .select('subscription_status')
      .eq('user_id', userId)
      .single();
      
    if (error) throw error;
    return data?.subscription_status === 'active';
  } catch (error) {
    console.error('Error checking subscription status:', error);
    return false;
  }
};

/**
 * Handles redirection to the payment page using the provided Stripe payment link
 * @param {string} paymentLink - The Stripe hosted checkout URL
 * @returns {void} - Opens the payment link in a new tab
 */
export const redirectToPayment = (paymentLink) => {
  if (!paymentLink) {
    console.error('Payment link not provided');
    return;
  }
  
  // Open the payment link in a new tab
  window.open(paymentLink, '_blank');
};

/**
 * Increment usage counter for a specific game mode
 * @param {string} userId - The user ID
 * @param {string} gameMode - The game mode (sequence-riddle, speed-5, etc)
 * @returns {Promise<Object>} - The updated subscription data
 */
export const incrementGameModeUsage = async (userId, gameMode) => {
  try {
    // Convert game mode ID to column name
    const columnMap = {
      'sequence-riddle': 'sequence_riddle_uses',
      'speed-5': 'speed_5_uses',
      'word-search': 'word_search_uses',
      'odd-one-out': 'odd_one_out_uses'
    };
    
    const columnName = columnMap[gameMode];
    if (!columnName) {
      throw new Error(`Invalid game mode: ${gameMode}`);
    }
    
    // Get current value
    const { data: currentData, error: fetchError } = await supabase
      .from('user_subscriptions')
      .select(columnName)
      .eq('user_id', userId)
      .single();
      
    if (fetchError) throw fetchError;
    
    // Increment the value
    const currentValue = currentData[columnName] || 0;
    const newValue = currentValue + 1;
    
    // Update the column
    const { data, error } = await supabase
      .from('user_subscriptions')
      .update({ [columnName]: newValue })
      .eq('user_id', userId)
      .select()
      .single();
      
    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error(`Error incrementing ${gameMode} usage:`, error);
    return { data: null, error };
  }
};