/**
 * Admin Script: Force Password Reset
 *
 * Usage: node scripts/reset-password.js <email> <new-password>
 * Example: node scripts/reset-password.js meera@partner.com FireHorse2026
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Error: Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function resetPassword(email, newPassword) {
  try {
    console.log(`🔍 Looking up user: ${email}`);

    // Find user by email
    const { data: crmUser, error: lookupError } = await supabase
      .from('crm_users')
      .select('id, name, email')
      .eq('email', email)
      .single();

    if (lookupError || !crmUser) {
      throw new Error(`User not found: ${email}`);
    }

    console.log(`✅ Found user: ${crmUser.name} (${crmUser.email})`);
    console.log(`🔐 Resetting password to: ${newPassword}`);

    // Update password using admin API
    const { data, error } = await supabase.auth.admin.updateUserById(
      crmUser.id,
      { password: newPassword }
    );

    if (error) {
      throw error;
    }

    console.log('✅ Password updated in auth system');

    // Set password_change_required flag
    const { error: flagError } = await supabase
      .from('crm_users')
      .update({
        password_change_required: true,
        updated_at: new Date().toISOString()
      })
      .eq('id', crmUser.id);

    if (flagError) {
      console.warn('⚠️  Warning: Could not set password_change_required flag:', flagError.message);
    } else {
      console.log('✅ Set password_change_required flag');
    }

    console.log('\n✅ SUCCESS: Password reset complete');
    console.log(`📧 User ${email} can now login with the new password`);
    console.log('⚠️  User will be required to change password on first login\n');

  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    process.exit(1);
  }
}

// Parse command line arguments
const args = process.argv.slice(2);

if (args.length !== 2) {
  console.error('Usage: node scripts/reset-password.js <email> <new-password>');
  console.error('Example: node scripts/reset-password.js meera@partner.com FireHorse2026');
  process.exit(1);
}

const [email, newPassword] = args;

resetPassword(email, newPassword);
