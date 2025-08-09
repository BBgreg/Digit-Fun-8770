import { createClient } from '@supabase/supabase-js'

// Verify we have valid credentials
const SUPABASE_URL = 'https://vlckravdrnmbkvgkgrsq.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZsY2tyYXZkcm5tYmt2Z2tncnNxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI3MDM0NDgsImV4cCI6MjA2ODI3OTQ0OH0.J1cZTXk31evckH50JS2aDUz2zkExLDll_eVFPW5km5U'

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error('Missing Supabase credentials')
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false
  }
})

export default supabase