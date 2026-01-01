# Two-Factor Authentication Setup Guide

## Overview

This guide explains how to set up Two-Factor Authentication (2FA) for the PSS Orange CRM, including:
- Deploying the required edge function
- Setting up 2FA for the admin account (sam@psspowers.com)
- Testing the authenticator app integration

## Prerequisites

1. Supabase CLI installed (`npm install -g supabase`)
2. Access to the Supabase project dashboard
3. The `user_2fa_settings` table created (from DATABASE_PART5_CORRECTED.sql)

## Step 1: Verify Database Table

Ensure the `user_2fa_settings` table exists with the correct schema:

```sql
-- Check if table exists and has correct columns
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'user_2fa_settings';
```

Expected columns:
- `user_id` (uuid, PK)
- `totp_secret` (text)
- `backup_codes` (text[])
- `is_enabled` (boolean)
- `method` (text)
- `email_otp_code` (text)
- `email_otp_expires_at` (timestamptz)
- `created_at` (timestamptz)
- `updated_at` (timestamptz)

If missing, run the corrected Part 5 SQL script.

## Step 2: Deploy the Edge Function

### Option A: Using Supabase CLI

1. Create the function directory:
```bash
mkdir -p supabase/functions/two-factor-auth
```

2. Create `supabase/functions/two-factor-auth/index.ts` with the following content:

```typescript
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { encode as base32Encode } from 'https://deno.land/std@0.208.0/encoding/base32.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function generateSecret(): string {
  const bytes = new Uint8Array(20)
  crypto.getRandomValues(bytes)
  return base32Encode(bytes).replace(/=/g, '')
}

function generateBackupCodes(count: number = 8): string[] {
  const codes: string[] = []
  for (let i = 0; i < count; i++) {
    const bytes = new Uint8Array(4)
    crypto.getRandomValues(bytes)
    const code = Array.from(bytes)
      .map(b => b.toString(16).padStart(2, '0'))
      .join('')
      .toUpperCase()
    codes.push(code)
  }
  return codes
}

function generateOtpAuthUrl(secret: string, email: string, issuer: string = 'PSS Orange CRM'): string {
  const encodedIssuer = encodeURIComponent(issuer)
  const encodedEmail = encodeURIComponent(email)
  return `otpauth://totp/${encodedIssuer}:${encodedEmail}?secret=${secret}&issuer=${encodedIssuer}&algorithm=SHA1&digits=6&period=30`
}

async function verifyTOTP(secret: string, code: string, window: number = 1): Promise<boolean> {
  const now = Math.floor(Date.now() / 1000)
  const period = 30
  
  const base32Chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'
  let bits = ''
  for (const char of secret.toUpperCase()) {
    const val = base32Chars.indexOf(char)
    if (val === -1) continue
    bits += val.toString(2).padStart(5, '0')
  }
  const bytes = new Uint8Array(Math.floor(bits.length / 8))
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(bits.slice(i * 8, (i + 1) * 8), 2)
  }
  
  for (let i = -window; i <= window; i++) {
    const counter = Math.floor((now / period) + i)
    const counterBytes = new Uint8Array(8)
    let c = counter
    for (let j = 7; j >= 0; j--) {
      counterBytes[j] = c & 0xff
      c = Math.floor(c / 256)
    }
    
    const key = await crypto.subtle.importKey('raw', bytes, { name: 'HMAC', hash: 'SHA-1' }, false, ['sign'])
    const signature = await crypto.subtle.sign('HMAC', key, counterBytes)
    const hash = new Uint8Array(signature)
    
    const offset = hash[hash.length - 1] & 0x0f
    const binary = ((hash[offset] & 0x7f) << 24) |
                   ((hash[offset + 1] & 0xff) << 16) |
                   ((hash[offset + 2] & 0xff) << 8) |
                   (hash[offset + 3] & 0xff)
    const otp = (binary % 1000000).toString().padStart(6, '0')
    
    if (otp === code) return true
  }
  return false
}

function generateEmailOTP(): string {
  const bytes = new Uint8Array(3)
  crypto.getRandomValues(bytes)
  const num = (bytes[0] << 16) | (bytes[1] << 8) | bytes[2]
  return (num % 1000000).toString().padStart(6, '0')
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const { action, userId, email, method, code } = await req.json()

    switch (action) {
      case 'check': {
        const { data } = await supabase
          .from('user_2fa_settings')
          .select('is_enabled, method')
          .eq('user_id', userId)
          .single()

        return new Response(
          JSON.stringify({ enabled: data?.is_enabled || false, method: data?.method || 'email' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      case 'setup': {
        const secret = generateSecret()
        const backupCodes = generateBackupCodes(8)
        const otpAuthUrl = generateOtpAuthUrl(secret, email || 'user@example.com')

        await supabase
          .from('user_2fa_settings')
          .upsert({
            user_id: userId,
            totp_secret: secret,
            backup_codes: backupCodes,
            method: method || 'authenticator',
            is_enabled: false,
            updated_at: new Date().toISOString()
          }, { onConflict: 'user_id' })

        return new Response(
          JSON.stringify({ secret, otpAuthUrl, backupCodes }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      case 'enable': {
        const { data: settings } = await supabase
          .from('user_2fa_settings')
          .select('totp_secret, backup_codes')
          .eq('user_id', userId)
          .single()

        if (!settings) {
          return new Response(
            JSON.stringify({ error: 'No pending 2FA setup' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        const isValid = await verifyTOTP(settings.totp_secret, code)
        if (!isValid && !settings.backup_codes?.includes(code)) {
          return new Response(
            JSON.stringify({ error: 'Invalid code' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        await supabase
          .from('user_2fa_settings')
          .update({ is_enabled: true, updated_at: new Date().toISOString() })
          .eq('user_id', userId)

        return new Response(
          JSON.stringify({ success: true, enabled: true }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      case 'disable': {
        await supabase.from('user_2fa_settings').delete().eq('user_id', userId)
        return new Response(
          JSON.stringify({ success: true, enabled: false }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      case 'verify': {
        const { data: settings } = await supabase
          .from('user_2fa_settings')
          .select('totp_secret, backup_codes, method, email_otp_code, email_otp_expires_at')
          .eq('user_id', userId)
          .single()

        if (!settings) {
          return new Response(
            JSON.stringify({ error: '2FA not configured' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        let isValid = false
        if (settings.method === 'authenticator') {
          isValid = await verifyTOTP(settings.totp_secret, code)
        } else if (settings.email_otp_code === code && new Date(settings.email_otp_expires_at) > new Date()) {
          isValid = true
          await supabase
            .from('user_2fa_settings')
            .update({ email_otp_code: null, email_otp_expires_at: null })
            .eq('user_id', userId)
        }

        if (!isValid && code.length === 8) {
          const idx = settings.backup_codes?.indexOf(code.toUpperCase())
          if (idx !== undefined && idx !== -1) {
            isValid = true
            const codes = [...settings.backup_codes]
            codes.splice(idx, 1)
            await supabase.from('user_2fa_settings').update({ backup_codes: codes }).eq('user_id', userId)
          }
        }

        if (!isValid) {
          return new Response(
            JSON.stringify({ error: 'Invalid code' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        return new Response(
          JSON.stringify({ success: true, verified: true }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      case 'send-email-otp': {
        const otp = generateEmailOTP()
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000)

        await supabase
          .from('user_2fa_settings')
          .update({ email_otp_code: otp, email_otp_expires_at: expiresAt.toISOString() })
          .eq('user_id', userId)

        console.log(`[2FA] Email OTP for ${email}: ${otp}`)
        
        return new Response(
          JSON.stringify({ success: true, message: 'OTP sent' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      default:
        return new Response(
          JSON.stringify({ error: 'Invalid action' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }
  } catch (error) {
    console.error('2FA error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
```

3. Deploy the function:
```bash
supabase functions deploy two-factor-auth --project-ref YOUR_PROJECT_REF
```

### Option B: Using Supabase Dashboard

1. Go to your Supabase project dashboard
2. Navigate to Edge Functions
3. Click "Create a new function"
4. Name it `two-factor-auth`
5. Paste the code above
6. Deploy

## Step 3: Set Up 2FA for Admin Account

### Method 1: Through the UI (Recommended)

1. Log in as `sam@psspowers.com`
2. Navigate to Settings > Security
3. In the "Two-Factor Authentication" section:
   - Select "Authenticator App" method
   - Click "Enable"
4. The setup flow will:
   - Generate a TOTP secret
   - Display the secret for manual entry
   - Generate 8 backup codes
5. Open your authenticator app (Google Authenticator, Authy, etc.)
6. Add a new account:
   - Scan QR code (if displayed) OR
   - Manually enter the secret shown
7. Enter the 6-digit code from your authenticator app
8. Click "Verify & Enable"
9. **IMPORTANT**: Save your backup codes securely!

### Method 2: Pre-configure via SQL (For Testing)

```sql
-- First, get the user ID for sam@psspowers.com
SELECT id FROM auth.users WHERE email = 'sam@psspowers.com';

-- Insert 2FA settings (replace USER_ID with actual ID)
INSERT INTO public.user_2fa_settings (
  user_id,
  totp_secret,
  backup_codes,
  is_enabled,
  method
) VALUES (
  'USER_ID_HERE',
  'JBSWY3DPEHPK3PXP', -- Example secret - generate a real one!
  ARRAY['A1B2C3D4', 'E5F6G7H8', 'I9J0K1L2', 'M3N4O5P6', 'Q7R8S9T0', 'U1V2W3X4', 'Y5Z6A7B8', 'C9D0E1F2'],
  true,
  'authenticator'
)
ON CONFLICT (user_id) DO UPDATE SET
  totp_secret = EXCLUDED.totp_secret,
  backup_codes = EXCLUDED.backup_codes,
  is_enabled = EXCLUDED.is_enabled,
  method = EXCLUDED.method,
  updated_at = now();
```

**Note**: If using SQL method, you'll need to add the secret to your authenticator app manually.

## Step 4: Test the 2FA Flow

### Test Login with 2FA

1. Log out of the application
2. Go to the login page
3. Enter `sam@psspowers.com` credentials
4. You should be prompted for a 2FA code
5. Enter the code from your authenticator app
6. Verify successful login

### Test Backup Codes

1. Log out
2. Log in with credentials
3. At the 2FA prompt, enter one of your backup codes (8 characters)
4. Verify successful login
5. Note: Each backup code can only be used once!

## Step 5: Verify Integration

Run these checks to ensure everything is working:

### Check 2FA Status via API
```javascript
const { data } = await supabase.functions.invoke('two-factor-auth', {
  body: { action: 'check', userId: 'USER_ID' }
});
console.log(data); // { enabled: true, method: 'authenticator' }
```

### Check Database Entry
```sql
SELECT user_id, is_enabled, method, 
       array_length(backup_codes, 1) as remaining_backup_codes
FROM user_2fa_settings 
WHERE user_id = 'USER_ID';
```

## Troubleshooting

### "2FA Coming Soon" Message
- The edge function is not deployed or not accessible
- Check Supabase Edge Functions dashboard
- Verify the function name is exactly `two-factor-auth`

### Invalid Code Errors
- Ensure your device time is synchronized
- TOTP codes are time-sensitive (30-second window)
- Try the next code if one fails

### Backup Codes Not Working
- Codes are case-insensitive but must be exact
- Each code can only be used once
- Regenerate codes if all are used

### Email OTP Not Received
- Email OTP requires email service configuration
- Check Supabase logs for the OTP (logged to console in dev)
- Consider using authenticator app method instead

## Security Best Practices

1. **Store backup codes securely** - Use a password manager
2. **Don't share your TOTP secret** - Treat it like a password
3. **Use authenticator app over email** - More secure and reliable
4. **Regenerate backup codes periodically** - After using any
5. **Enable 2FA for all admin accounts** - Not just the primary admin

## QR Code Generation (Optional Enhancement)

To display a QR code for easier authenticator app setup, add a QR code library:

```bash
npm install qrcode.react
```

Then update TwoFactorSettings.tsx to display the QR code:

```tsx
import QRCode from 'qrcode.react';

// In the setup mode section:
{method === 'authenticator' && otpUrl && (
  <div className="flex justify-center mb-4">
    <QRCode value={otpUrl} size={200} />
  </div>
)}
```
