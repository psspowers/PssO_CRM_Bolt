import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function testTaskRPC() {
  console.log('🔍 Testing Task Master RPC Function...\n');

  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    console.error('❌ Authentication Error:', authError?.message || 'No user found');
    console.log('\n💡 Make sure you have a valid session. You may need to:');
    console.log('   1. Login to the app first');
    console.log('   2. Or set SUPABASE_SERVICE_ROLE_KEY for testing');
    return;
  }

  console.log(`✅ Authenticated as: ${user.email}`);
  console.log(`   User ID: ${user.id}\n`);

  const filters = ['all', 'mine', 'delegated'];

  for (const filter of filters) {
    console.log(`\n📊 Testing filter: "${filter}"`);
    console.log('─'.repeat(50));

    const { data, error } = await supabase.rpc('get_task_threads', {
      p_user_id: user.id,
      p_filter: filter,
    });

    if (error) {
      console.error(`❌ ERROR:`, error);
      console.log('\n🔍 Error Details:');
      console.log('   Code:', error.code);
      console.log('   Message:', error.message);
      console.log('   Details:', error.details);
      console.log('   Hint:', error.hint);
    } else {
      console.log(`✅ SUCCESS`);
      console.log(`   Type: ${Array.isArray(data) ? 'Array' : typeof data}`);
      console.log(`   Length: ${Array.isArray(data) ? data.length : 'N/A'}`);
      if (data && Array.isArray(data) && data.length > 0) {
        console.log(`   Sample:`, JSON.stringify(data[0], null, 2));
      } else {
        console.log(`   Data:`, data);
      }
    }
  }

  console.log('\n\n🔍 Testing old RPC function: get_deal_threads_view');
  console.log('─'.repeat(50));

  const { data: oldData, error: oldError } = await supabase.rpc('get_deal_threads_view', {
    p_view_mode: 'all',
  });

  if (oldError) {
    console.error(`❌ ERROR:`, oldError.message);
  } else {
    console.log(`✅ Old function still works`);
    console.log(`   Type: ${Array.isArray(oldData) ? 'Array' : typeof oldData}`);
    console.log(`   Length: ${Array.isArray(oldData) ? oldData.length : 'N/A'}`);
  }

  console.log('\n\n✅ Test Complete');
  process.exit(0);
}

testTaskRPC().catch((err) => {
  console.error('💥 Unhandled Error:', err);
  process.exit(1);
});
