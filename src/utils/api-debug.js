import 'cross-fetch/polyfill'; // Ensure fetch is available

export const testSupabaseConnection = async (supabaseUrl, supabaseKey) => {
  try {
    console.group('🔌 Testing Supabase Connection');
    
    // Try a simple fetch to the Supabase health endpoint
    const response = await fetch(`${supabaseUrl}/rest/v1/`, {
      headers: {
        'apikey': supabaseKey,
        'Content-Type': 'application/json'
      }
    });
    
    const status = response.status;
    console.log(`📡 Connection status: ${status}`);
    
    if (status === 200) {
      console.log('✅ Supabase connection successful');
      return { success: true, status };
    } else {
      console.error('❌ Supabase connection failed with status:', status);
      return { success: false, status };
    }
  } catch (err) {
    console.error('❌ Connection error:', err);
    return { success: false, error: err.message };
  } finally {
    console.groupEnd();
  }
};