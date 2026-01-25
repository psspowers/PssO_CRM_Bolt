import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error(
    'Missing Supabase environment variables. Please ensure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set in your .env file.'
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

let identityVerified = false;

export async function verifyDatabaseIdentity(): Promise<void> {
  if (identityVerified) return;

  try {
    const { data, error } = await supabase
      .from('db_identity')
      .select('environment')
      .single();

    if (error) {
      console.error('❌ DATABASE IDENTITY CHECK FAILED:', error);
      throw new Error(
        `🚨 DATABASE IDENTITY ERROR\n\n` +
        `Cannot verify database identity.\n` +
        `This usually means:\n` +
        `1. Connected to wrong database\n` +
        `2. .env file was overwritten\n\n` +
        `RECOVERY:\n` +
        `1. Check .env matches .env.ORIGINAL_BACKUP\n` +
        `2. Restore: cp .env.ORIGINAL_BACKUP .env\n` +
        `3. Restart dev server\n\n` +
        `Error: ${error.message}`
      );
    }

    if (data?.environment !== 'PRODUCTION_ORIGINAL') {
      throw new Error(
        `🚨 WRONG DATABASE DETECTED\n\n` +
        `Expected: PRODUCTION_ORIGINAL\n` +
        `Found: ${data?.environment || 'NONE'}\n\n` +
        `Your app is connected to the wrong database!\n\n` +
        `RECOVERY:\n` +
        `1. Check .env: ${supabaseUrl}\n` +
        `2. Compare with .env.ORIGINAL_BACKUP\n` +
        `3. Restore: cp .env.ORIGINAL_BACKUP .env\n` +
        `4. Restart dev server\n\n` +
        `APP BLOCKED - Will not operate on wrong database.`
      );
    }

    identityVerified = true;
    console.log('✅ Database identity verified: PRODUCTION_ORIGINAL');
  } catch (err) {
    if (err instanceof Error) {
      throw err;
    }
    throw new Error('Database identity check failed');
  }
}
