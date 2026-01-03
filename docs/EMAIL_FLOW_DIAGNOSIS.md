# Email Flow Diagnosis

## Current Status

### Working
- ✅ Password Recovery (`resetPasswordForEmail`) - Unknown, needs testing

### Not Working
- ❌ User Invites (`inviteUserByEmail`) - Returns non-2xx error

## Email Type Comparison

| Flow | Method | Auth Key | Template Variable | Status |
|------|--------|----------|-------------------|--------|
| Password Recovery | `resetPasswordForEmail()` | ANON | `{{ .ConfirmationURL }}` | ✅ Unknown |
| User Invite | `inviteUserByEmail()` | SERVICE_ROLE | `{{ .ConfirmationURL }}` | ❌ Failing |
| Signup Confirm | Auto-sent on signup | N/A | `{{ .ConfirmationURL }}` | Unknown |
| Magic Link | `signInWithOtp()` | ANON | `{{ .ConfirmationURL }}` | Unknown |
| Email Change | `updateUser()` | AUTH | `{{ .ConfirmationURL }}` | Unknown |

## Possible Root Causes

### 1. SMTP Not Configured
Supabase needs an email provider configured in the dashboard:
- Settings → Authentication → Email Settings
- SMTP server details required
- **Test**: Try password reset to confirm emails work at all

### 2. Invite Emails Disabled
In Supabase Auth settings:
- Authentication → Email Templates
- Check if "Invite User" template exists and is enabled
- Verify template has `{{ .ConfirmationURL }}`

### 3. Email Confirmations Enabled
- Settings → Authentication → Email Auth
- If "Enable email confirmations" is ON, it might conflict with invite flow
- **Recommended**: Turn OFF for admin-created users

### 4. Template Syntax Error
- Custom email templates might have syntax errors
- Missing required template variables
- Check Supabase logs for template rendering errors

## Diagnostic Steps

### Step 1: Test Password Reset
1. Go to `/forgot-password`
2. Enter a valid email
3. Check if email arrives
4. **If YES**: SMTP works, issue is invite-specific
5. **If NO**: SMTP not configured

### Step 2: Check Supabase Dashboard
1. Authentication → Email Templates
2. Verify "Invite User" template exists
3. Check template has: `{{ .ConfirmationURL }}`
4. Look for any error indicators

### Step 3: Check Auth Settings
1. Authentication → Settings → Email Auth
2. Verify SMTP configured
3. Check "Enable email confirmations" status
4. Review rate limiting settings

### Step 4: Review Edge Function Logs
The enhanced logging should show:
- Exact error message from `inviteUserByEmail()`
- Error code and status
- Supabase error details

## Next Actions

1. **User to test**: Try password reset to confirm SMTP works
2. **User to check**: Supabase Dashboard → Authentication → Email Templates
3. **User to provide**: Exact error message from new logging
4. **If SMTP not configured**: Follow Supabase docs to add email provider

## Expected Error Messages

### If SMTP Not Configured
```
Error sending email: SMTP not configured
```

### If Template Missing
```
Error: template not found
```

### If Rate Limited
```
Error: rate limit exceeded
```

### If Invalid Template
```
Error: template syntax error
```
