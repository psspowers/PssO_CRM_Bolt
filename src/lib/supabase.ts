import { createClient } from '@supabase/supabase-js';

// Environment variables with fallback for deployed environments
// Note: The anon key is designed to be public-facing and safe for client-side use
// Security is enforced through Row Level Security (RLS) policies in the database
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://asymsthwlzdseuvqkvwl.databasepad.com';
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6IjIxNGYwYzZlLTBlNGQtNGYzNC05NjkzLWVjZTkxMDM1MTBmYiJ9.eyJwcm9qZWN0SWQiOiJhc3ltc3Rod2x6ZHNldXZxa3Z3bCIsInJvbGUiOiJhbm9uIiwiaWF0IjoxNzY0NzEzOTI3LCJleHAiOjIwODAwNzM5MjcsImlzcyI6ImZhbW91cy5kYXRhYmFzZXBhZCIsImF1ZCI6ImZhbW91cy5jbGllbnRzIn0.-s4aAxVYVe42BDiPo99HQCq6Dp2Sc9r4VEQ7YRpqoDI';

// Log warning in development if using fallback values
if (import.meta.env.DEV && (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY)) {
  console.warn(
    'Using fallback Supabase credentials. For local development, create a .env file with:\n' +
    'VITE_SUPABASE_URL=your_supabase_url\n' +
    'VITE_SUPABASE_ANON_KEY=your_anon_key'
  );
}

const supabase = createClient(supabaseUrl, supabaseKey);

export { supabase };
