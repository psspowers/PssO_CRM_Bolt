import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://asymsthwlzdseuvqkvwl.databasepad.com';
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6IjIxNGYwYzZlLTBlNGQtNGYzNC05NjkzLWVjZTkxMDM1MTBmYiJ9.eyJwcm9qZWN0SWQiOiJhc3ltc3Rod2x6ZHNldXZxa3Z3bCIsInJvbGUiOiJhbm9uIiwiaWF0IjoxNzY0NzEzOTI3LCJleHAiOjIwODAwNzM5MjcsImlzcyI6ImZhbW91cy5kYXRhYmFzZXBhZCIsImF1ZCI6ImZhbW91cy5jbGllbnRzIn0.-s4aAxVYVe42BDiPo99HQCq6Dp2Sc9r4VEQ7YRpqoDI';

if (import.meta.env.DEV && (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY)) {
  console.warn(
    'Using fallback Supabase credentials. For local development, create a .env file with:\n' +
    'VITE_SUPABASE_URL=your_supabase_url\n' +
    'VITE_SUPABASE_ANON_KEY=your_anon_key'
  );
}

let supabaseInstance: SupabaseClient | null = null;

function getSupabaseClient(): SupabaseClient {
  if (!supabaseInstance) {
    supabaseInstance = createClient(supabaseUrl, supabaseKey, {
      auth: {
        flowType: 'pkce',
        autoRefreshToken: true,
        detectSessionInUrl: true,
        persistSession: true
      },
      realtime: {
        params: {
          eventsPerSecond: 10
        }
      }
    });
  }
  return supabaseInstance;
}

export const supabase = getSupabaseClient();
export { getSupabaseClient };
