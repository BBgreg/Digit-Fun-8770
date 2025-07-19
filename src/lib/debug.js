// Debug utility file to help diagnose Supabase issues
import supabase from './supabase';

export const checkAuthStatus = async () => {
  try {
    console.group('🔍 Supabase Auth Status Check');
    
    // 1. Check if user is authenticated
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError) {
      console.error('❌ Error getting session:', sessionError);
      return { success: false, error: sessionError };
    }
    
    if (!session) {
      console.log('⚠️ No active session found');
      return { success: false, message: 'No active session' };
    }
    
    console.log('✅ User authenticated:', {
      id: session.user.id,
      email: session.user.email,
      expires_at: new Date(session.expires_at * 1000).toLocaleString()
    });
    
    // 2. Test a simple query to check RLS
    const { data: testData, error: testError } = await supabase
      .from('user_phone_numbers')
      .select('id, contact_name')
      .limit(1);
    
    if (testError) {
      console.error('❌ Test query failed:', testError);
      return { success: false, error: testError };
    }
    
    console.log('✅ Test query successful, user can access their data');
    
    return { 
      success: true, 
      user: session.user,
      testQueryResult: testData 
    };
  } catch (err) {
    console.error('❌ Unexpected error during auth check:', err);
    return { success: false, error: err };
  } finally {
    console.groupEnd();
  }
};

export const testRlsPolicy = async (userId) => {
  try {
    console.group('🔍 Testing RLS Policy for User Data Isolation');
    
    console.log('Testing RLS policies for user:', userId);
    
    // Test SELECT policy
    const { data: selectData, error: selectError } = await supabase
      .from('user_phone_numbers')
      .select('id, contact_name, phone_number_digits, user_id')
      .limit(5);
    
    if (selectError) {
      console.error('❌ SELECT policy test failed:', selectError);
      return { success: false, error: selectError };
    }
    
    // Verify all returned records belong to the authenticated user
    const unauthorizedRecords = selectData.filter(record => record.user_id !== userId);
    
    if (unauthorizedRecords.length > 0) {
      console.error('❌ RLS SECURITY VIOLATION: User can see other users\' data', unauthorizedRecords);
      return { 
        success: false, 
        error: 'RLS policy violation: User can access unauthorized records',
        unauthorizedRecords 
      };
    }
    
    console.log(`✅ RLS SELECT policy working correctly - user can only see their own ${selectData.length} records`);
    
    // Test INSERT policy by attempting insertion
    const testInsert = {
      user_id: userId,
      contact_name: 'RLS Test Contact',
      phone_number_digits: '5551234567',
      mastery_level: 0
    };
    
    const { data: insertData, error: insertError } = await supabase
      .from('user_phone_numbers')
      .insert([testInsert])
      .select()
      .single();
    
    if (insertError) {
      console.error('❌ INSERT policy test failed:', insertError);
      return { success: false, error: insertError };
    }
    
    console.log('✅ RLS INSERT policy working correctly');
    
    // Clean up test record
    await supabase
      .from('user_phone_numbers')
      .delete()
      .eq('id', insertData.id);
    
    console.log('✅ Test record cleaned up');
    
    return { 
      success: true, 
      message: 'RLS policies are working correctly',
      userRecords: selectData.length 
    };
  } catch (err) {
    console.error('❌ Unexpected error during RLS test:', err);
    return { success: false, error: err };
  } finally {
    console.groupEnd();
  }
};

export const testDataIsolation = async () => {
  try {
    console.group('🔒 Testing User Data Isolation');
    
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      console.error('❌ No authenticated user for isolation test');
      return { success: false, error: 'No authenticated user' };
    }
    
    const userId = session.user.id;
    
    // Test 1: Verify user can only see their own phone numbers
    const { data: phoneNumbers, error: phoneError } = await supabase
      .from('user_phone_numbers')
      .select('*');
    
    if (phoneError) {
      console.error('❌ Error fetching phone numbers:', phoneError);
      return { success: false, error: phoneError };
    }
    
    const unauthorizedPhones = phoneNumbers.filter(phone => phone.user_id !== userId);
    
    if (unauthorizedPhones.length > 0) {
      console.error('❌ DATA ISOLATION VIOLATION: User can see other users\' phone numbers');
      return { success: false, error: 'Data isolation violation in phone numbers' };
    }
    
    // Test 2: Verify user can only see their own game results
    const { data: gameResults, error: gameError } = await supabase
      .from('game_results')
      .select('*');
    
    if (gameError) {
      console.error('❌ Error fetching game results:', gameError);
      return { success: false, error: gameError };
    }
    
    const unauthorizedGames = gameResults.filter(game => game.user_id !== userId);
    
    if (unauthorizedGames.length > 0) {
      console.error('❌ DATA ISOLATION VIOLATION: User can see other users\' game results');
      return { success: false, error: 'Data isolation violation in game results' };
    }
    
    console.log('✅ Data isolation is working correctly');
    console.log(`User ${userId} can access:`);
    console.log(`- ${phoneNumbers.length} phone numbers (their own)`);
    console.log(`- ${gameResults.length} game results (their own)`);
    
    return { 
      success: true, 
      message: 'Data isolation is working correctly',
      userPhoneNumbers: phoneNumbers.length,
      userGameResults: gameResults.length
    };
  } catch (err) {
    console.error('❌ Unexpected error during data isolation test:', err);
    return { success: false, error: err };
  } finally {
    console.groupEnd();
  }
};