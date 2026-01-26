import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY!
);

async function purge() {
  console.log('🔍 ANALYZING NOISE on:', process.env.VITE_SUPABASE_URL);

  if (!process.env.VITE_SUPABASE_SERVICE_ROLE_KEY) {
    console.error('❌ VITE_SUPABASE_SERVICE_ROLE_KEY is required but not found in .env');
    console.error('📝 Add it to .env: VITE_SUPABASE_SERVICE_ROLE_KEY=your_service_role_key');
    console.error('🔑 Get it from: Supabase Dashboard > Settings > API > service_role key');
    return;
  }

  // Debug: Test basic query first
  const { data: testData, error: testError } = await supabase
    .from('market_news')
    .select('count', { count: 'exact', head: true });

  console.log('Total records in market_news:', testData, testError);

  // Debug: Test simple pattern match
  const { data: simpleTest, error: simpleError } = await supabase
    .from('market_news')
    .select('id, title')
    .ilike('title', '%limited energy%')
    .limit(5);

  console.log('Simple pattern test (limited energy):', simpleTest?.length, simpleError);

  // STEP 1: Preview what will be deleted (ACTUAL DATABASE PATTERNS)
  const { data: preview, error: previewError } = await supabase
    .from('market_news')
    .select('id, title, summary, impact_type')
    .or('title.ilike.%limited energy%,title.ilike.%no renewable%,title.ilike.%data not found%,title.ilike.%lacking energy%,title.ilike.%no clear energy%,title.ilike.%without energy%,title.ilike.%unclear renewable%,title.ilike.%unclear energy%,title.ilike.%unclear renewables%,title.ilike.%limited renewable%,title.ilike.%no energy project%,title.ilike.%duplicate entity%,title.ilike.%duplicate entry%,summary.ilike.%not publicly available%,summary.ilike.%minimal or unavailable%,summary.ilike.%data gaps noted%,summary.ilike.%not found publicly%,summary.ilike.%information is absent%,summary.ilike.%data limitations%,summary.ilike.%minimal or unpublished%,summary.ilike.%not evident in public%,summary.ilike.%not prominently reported%,summary.ilike.%limited publicly%,summary.ilike.%data limitations present%,summary.ilike.%duplicate entry%,summary.ilike.%minimal. data gaps%,summary.ilike.%not widely reported%,summary.ilike.%no public renewable%,summary.ilike.%data gaps exist%');

  console.log('OR query result:', preview?.length, 'Error:', previewError);

  if (previewError) {
    console.error('❌ Preview Error:', previewError);
    return;
  }

  console.log(`\n📊 FOUND ${preview?.length || 0} GARBAGE RECORDS:`);
  console.log('---');
  preview?.slice(0, 10).forEach((item, i) => {
    console.log(`${i + 1}. [${item.impact_type}] ${item.title?.substring(0, 60)}...`);
  });
  if (preview && preview.length > 10) {
    console.log(`... and ${preview.length - 10} more`);
  }
  console.log('---\n');

  // STEP 2: Execute deletion (SAME PATTERNS)
  const { count, error } = await supabase
    .from('market_news')
    .delete({ count: 'exact' })
    .or('title.ilike.%limited energy%,title.ilike.%no renewable%,title.ilike.%data not found%,title.ilike.%lacking energy%,title.ilike.%no clear energy%,title.ilike.%without energy%,title.ilike.%unclear renewable%,title.ilike.%unclear energy%,title.ilike.%unclear renewables%,title.ilike.%limited renewable%,title.ilike.%no energy project%,title.ilike.%duplicate entity%,title.ilike.%duplicate entry%,summary.ilike.%not publicly available%,summary.ilike.%minimal or unavailable%,summary.ilike.%data gaps noted%,summary.ilike.%not found publicly%,summary.ilike.%information is absent%,summary.ilike.%data limitations%,summary.ilike.%minimal or unpublished%,summary.ilike.%not evident in public%,summary.ilike.%not prominently reported%,summary.ilike.%limited publicly%,summary.ilike.%data limitations present%,summary.ilike.%duplicate entry%,summary.ilike.%minimal. data gaps%,summary.ilike.%not widely reported%,summary.ilike.%no public renewable%,summary.ilike.%data gaps exist%');

  if (error) {
    console.error('❌ Purge Error:', error);
  } else {
    console.log(`✅ EVICTION COMPLETE. Deleted ${count} garbage records.`);
    console.log('🎯 Database is now clean. Next scan will use the new "Strict Bouncer" prompt.\n');
  }
}

purge();
