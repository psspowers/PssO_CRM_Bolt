import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseServiceKey) {
  console.error('SUPABASE_SERVICE_ROLE_KEY not found in environment');
  console.log('Please set it in your .env file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function resetPimlapatPassword() {
  const userId = '095fd167-f612-469b-a6bb-ffed3d05ea16';
  const newPassword = 'FireHorse2026';

  console.log('Resetting password for Pimlapat Boonthae...');
  console.log('User ID:', userId);

  const { data, error } = await supabase.auth.admin.updateUserById(
    userId,
    {
      password: newPassword,
      email_confirm: true
    }
  );

  if (error) {
    console.error('Error resetting password:', error);
    process.exit(1);
  }

  console.log('Password reset successfully!');
  console.log('New password: FireHorse2026');

  const { error: updateError } = await supabase
    .from('crm_users')
    .update({
      password_change_required: false
    })
    .eq('id', userId);

  if (updateError) {
    console.error('Error updating CRM user:', updateError);
  } else {
    console.log('CRM user updated - password_change_required set to false');
  }

  console.log('\nPimlapat can now login with:');
  console.log('Email: pimlapat@psspowers.com');
  console.log('Password: FireHorse2026');
}

resetPimlapatPassword();
