// Authentication utility functions for user data isolation
import supabase from './supabase';

export const getCurrentUser = async () => {
  try {
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (error) {
      console.error('Error getting current user session:', error);
      throw error;
    }
    
    return session?.user || null;
  } catch (err) {
    console.error('Error in getCurrentUser:', err);
    return null;
  }
};

export const verifyUserOwnership = async (tableName, recordId, userIdColumn = 'user_id') => {
  try {
    const user = await getCurrentUser();
    
    if (!user) {
      throw new Error('User must be authenticated');
    }
    
    const { data, error } = await supabase
      .from(tableName)
      .select(`id, ${userIdColumn}`)
      .eq('id', recordId)
      .single();
    
    if (error) {
      console.error('Error verifying ownership:', error);
      throw error;
    }
    
    if (!data) {
      throw new Error('Record not found');
    }
    
    if (data[userIdColumn] !== user.id) {
      throw new Error('Access denied: You can only access your own records');
    }
    
    return true;
  } catch (err) {
    console.error('Error in verifyUserOwnership:', err);
    throw err;
  }
};

export const ensureUserAuthenticated = (user) => {
  if (!user) {
    throw new Error('User must be authenticated to perform this action');
  }
  
  console.log('User authenticated:', user.id);
  return true;
};

export const logUserAction = (action, details = {}) => {
  const user = getCurrentUser();
  console.log(`User Action: ${action}`, {
    userId: user?.id || 'anonymous',
    timestamp: new Date().toISOString(),
    ...details
  });
};