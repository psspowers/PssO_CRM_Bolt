import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY; // or SERVICE_ROLE if available

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing credentials in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function purge() {
  console.log('Targeting DB:', supabaseUrl);

  // 1. Identify Junk (Visual check)
  const { count } = await supabase
    .from('market_news')
    .select('*', { count: 'exact', head: true })
    .eq('impact_type', 'neutral')
    .ilike('title', '%no data%'); // Simple check

  console.log(`Found approx ${count} junk records (checking sample)...`);

  // 2. Execute Delete (Complex Filter)
  const { error, count: deleted } = await supabase
    .from('market_news')
    .delete({ count: 'exact' })
    .eq('impact_type', 'neutral')
    .or('title.ilike.%not found%,title.ilike.%no data%,title.ilike.%no public%,title.ilike.%unclear%,summary.ilike.%minimal%,summary.ilike.%absent%,summary.ilike.%data gaps%');

  if (error) console.error('❌ Error:', error);
  else console.log(`✅ PURGE COMPLETE. Deleted ${deleted} junk records.`);
}

purge();
