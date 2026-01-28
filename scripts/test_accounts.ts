import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.VITE_SUPABASE_ANON_KEY!
);

async function testAccountsFetch() {
  console.log('🔍 Testing accounts fetch...\n');

  // First, check current user
  const { data: { user } } = await supabase.auth.getUser();
  console.log('Current user:', user?.email || 'NOT LOGGED IN');

  if (user) {
    // Check user role
    const { data: crmUser } = await supabase
      .from('crm_users')
      .select('role, email')
      .eq('id', user.id)
      .single();
    console.log('User role:', crmUser?.role || 'NO ROLE FOUND');
    console.log('---\n');
  }

  // Test 1: Fetch accounts with nested opportunities (EXACT SAME QUERY AS CODE)
  console.log('TEST 1: Full query with nested opportunities (FIXED)');
  const { data: accounts, error } = await supabase
    .from('accounts')
    .select('*, opportunities!opportunities_account_id_fkey(id, stage, owner_id, primary_partner_id, value)')
    .order('name');

  if (error) {
    console.error('❌ ERROR:', error.message);
    console.error('Details:', error);
  } else {
    console.log('✅ SUCCESS: Found', accounts?.length || 0, 'accounts');
    if (accounts && accounts.length > 0) {
      console.log('First account:', accounts[0].name);
      console.log('Opportunities:', accounts[0].opportunities?.length || 0);
    }
  }
  console.log('---\n');

  // Test 2: Fetch accounts WITHOUT nested opportunities
  console.log('TEST 2: Simple accounts query (no joins)');
  const { data: simpleAccounts, error: simpleError } = await supabase
    .from('accounts')
    .select('*')
    .order('name');

  if (simpleError) {
    console.error('❌ ERROR:', simpleError.message);
  } else {
    console.log('✅ SUCCESS: Found', simpleAccounts?.length || 0, 'accounts');
  }
  console.log('---\n');

  // Test 3: Fetch account_metrics_view
  console.log('TEST 3: Account metrics view');
  const { data: metrics, error: metricsError } = await supabase
    .from('account_metrics_view')
    .select('*');

  if (metricsError) {
    console.error('❌ ERROR:', metricsError.message);
  } else {
    console.log('✅ SUCCESS: Found', metrics?.length || 0, 'metrics');
  }
  console.log('---\n');

  // Test 4: Fetch account_partners
  console.log('TEST 4: Account partners');
  const { data: links, error: linksError } = await supabase
    .from('account_partners')
    .select('account_id, partner_id');

  if (linksError) {
    console.error('❌ ERROR:', linksError.message);
  } else {
    console.log('✅ SUCCESS: Found', links?.length || 0, 'partner links');
  }
  console.log('---\n');

  // Test 5: Check total counts
  console.log('TEST 5: Raw table counts');
  const { count: accountCount } = await supabase
    .from('accounts')
    .select('*', { count: 'exact', head: true });
  console.log('Total accounts (with RLS):', accountCount);

  const { count: oppCount } = await supabase
    .from('opportunities')
    .select('*', { count: 'exact', head: true });
  console.log('Total opportunities (with RLS):', oppCount);
}

testAccountsFetch().catch(console.error);
