import { useState } from 'react';
import supabase from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { checkAuthStatus, testRlsPolicy } from '../lib/debug';
import { testSupabaseConnection } from '../utils/api-debug';

export const useDebugger = () => {
  const [debugResults, setDebugResults] = useState(null);
  const [isDebugging, setIsDebugging] = useState(false);
  const { user } = useAuth();
  
  const runDiagnostics = async () => {
    try {
      setIsDebugging(true);
      const results = {
        timestamp: new Date().toISOString(),
        tests: {}
      };
      
      // 1. Test basic connection
      const connectionTest = await testSupabaseConnection(
        supabase.supabaseUrl,
        supabase.supabaseKey
      );
      results.tests.connection = connectionTest;
      
      // 2. Check authentication status
      const authStatus = await checkAuthStatus();
      results.tests.auth = authStatus;
      
      // 3. Test RLS policy if user is logged in
      if (user) {
        const rlsTest = await testRlsPolicy(user.id);
        results.tests.rls = rlsTest;
        
        // 4. Test specific table queries
        try {
          const { data, error } = await supabase
            .from('user_phone_numbers')
            .select('*')
            .eq('user_id', user.id)
            .limit(5);
          
          results.tests.tableQuery = {
            success: !error,
            data: data || [],
            error: error || null
          };
        } catch (err) {
          results.tests.tableQuery = {
            success: false,
            error: err.message
          };
        }
      }
      
      setDebugResults(results);
      return results;
    } catch (err) {
      console.error('Error running diagnostics:', err);
      setDebugResults({
        error: err.message,
        timestamp: new Date().toISOString()
      });
      return { error: err.message };
    } finally {
      setIsDebugging(false);
    }
  };
  
  return {
    debugResults,
    isDebugging,
    runDiagnostics
  };
};