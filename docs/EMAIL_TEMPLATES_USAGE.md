# Email Templates Usage Guide

This guide shows you how to use the dynamic email templates that automatically fetch your company logo and details from the database.

## Available Templates

### 1. Confirmation Email

```typescript
import { generateConfirmationEmail } from '@/lib/emailTemplates';

const html = await generateConfirmationEmail({
  confirmationUrl: 'https://yourapp.com/confirm?token=xyz',
  userName: 'John Doe' // optional
});

// Use with your email service
sendEmail({
  to: 'user@example.com',
  subject: 'Confirm Your Email',
  html
});
```

### 2. Welcome Email

```typescript
import { generateWelcomeEmail } from '@/lib/emailTemplates';

const html = await generateWelcomeEmail({
  userName: 'John Doe',
  loginUrl: 'https://yourapp.com/login' // optional
});
```

### 3. Password Reset Email

```typescript
import { generatePasswordResetEmail } from '@/lib/emailTemplates';

const html = await generatePasswordResetEmail({
  resetUrl: 'https://yourapp.com/reset?token=xyz',
  userName: 'John Doe' // optional
});
```

### 4. Generic Email

```typescript
import { generateGenericEmail } from '@/lib/emailTemplates';

const html = await generateGenericEmail({
  title: 'Account Updated',
  message: 'Your account settings have been successfully updated.',
  buttonText: 'View Profile', // optional
  buttonUrl: 'https://yourapp.com/profile', // optional
  footerText: 'If you didn\'t make this change, please contact support.' // optional
});
```

## Using with Supabase Edge Functions

Create an edge function to send emails with dynamic templates:

```typescript
import { generateConfirmationEmail } from '@/lib/emailTemplates';

Deno.serve(async (req) => {
  const { email, confirmationUrl, userName } = await req.json();

  const html = await generateConfirmationEmail({
    confirmationUrl,
    userName
  });

  // Send email using your email service (SendGrid, Mailgun, etc.)
  // ...

  return new Response(JSON.stringify({ success: true }));
});
```

## Static Template for Supabase Auth

If you need to use this in Supabase Auth email templates (which don't support dynamic rendering), use the static version with the hardcoded logo URL:

**File:** `supabase-auth-confirmation-template.html`

```html
<!DOCTYPE html>
<html>
<body style="font-family: 'Helvetica Neue', Arial, sans-serif; background-color: #f9f9f9; margin: 0; padding: 40px 0;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0">
    <tr>
      <td align="center">
        <div style="max-width: 600px; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.05); border-top: 5px solid #E87E3C;">
          <div style="padding: 40px; text-align: center;">
            <img src="https://shrglaqikuzcvoihzpyt.supabase.co/storage/v1/object/public/company-assets/pss_orange_logo.png" alt="PSS Orange" width="140" style="margin-bottom: 30px;">
            <h2 style="color: #333; margin-top: 0;">Let's get started!</h2>
            <p style="color: #666; font-size: 16px; line-height: 1.5;">Thanks for joining PSS Orange. Please click the button below to verify your email address and activate your account.</p>
            <a href="{{ .ConfirmationURL }}" style="display: inline-block; padding: 14px 30px; background-color: #E87E3C; color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: bold; margin: 20px 0;">Confirm My Account</a>
            <p style="color: #999; font-size: 12px; margin-top: 30px;">If the button doesn't work, copy this link: <br> <a href="{{ .ConfirmationURL }}" style="color: #E87E3C;">{{ .ConfirmationURL }}</a></p>
          </div>
          <div style="background-color: #f4f4f4; padding: 20px; text-align: center; color: #999; font-size: 12px;">
            &copy; 2026 PSS Orange. All rights reserved.
          </div>
        </div>
      </td>
    </tr>
  </table>
</body>
</html>
```

## How It Works

1. **Dynamic Logo Loading**: All template functions fetch the logo URL from your `system_settings` table
2. **Automatic Company Name**: Company name is pulled from settings
3. **Fallback Support**: If logo or company name isn't found, sensible defaults are used
4. **Type Safety**: TypeScript interfaces ensure you pass the correct data

## Updating Logo

To update your logo, simply upload a new file to Supabase Storage and update the setting:

```typescript
import { updateSystemSetting } from '@/lib/api/settings';

await updateSystemSetting(
  'company_logo_url',
  'https://shrglaqikuzcvoihzpyt.supabase.co/storage/v1/object/public/company-assets/new_logo.png'
);
```

All future emails will automatically use the new logo.
