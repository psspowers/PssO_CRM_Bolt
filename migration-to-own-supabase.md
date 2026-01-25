# Migration Guide: Move to Your Own Supabase Account

## Overview
This guide helps you migrate from the Bolt-provisioned Supabase instance to your own Supabase account.

## Step 1: Create New Supabase Project

1. Go to [supabase.com](https://supabase.com)
2. Create new account or sign in
3. Click "New Project"
4. Configure:
   - **Name**: PSS CRM (or your preferred name)
   - **Database Password**: Choose a strong password (save it!)
   - **Region**: Select closest to your users
   - **Pricing**: Free tier is sufficient to start

## Step 2: Get Your New Project Credentials

After project is created:

1. Go to **Project Settings** → **API**
2. Copy these values:
   - **Project URL**: `https://your-project-ref.supabase.co`
   - **Project Ref**: `your-project-ref` (from the URL)
   - **anon/public key**: Long string starting with `eyJ...`
   - **service_role key**: Another long string (keep this secret!)

## Step 3: Run Migrations in Your New Project

### Option A: Using Supabase Dashboard (Recommended)

1. Go to **SQL Editor** in your Supabase dashboard
2. Run ALL migration files in order from `supabase/migrations/` folder
3. Start with oldest (20260101...) and work your way to newest (20260125...)

**Important**: Run migrations in chronological order to avoid dependency errors!

### Option B: Using Supabase CLI (Advanced)

If you have Supabase CLI installed:

```bash
# Link to your project
supabase link --project-ref your-project-ref

# Push all migrations
supabase db push
```

## Step 4: Create Storage Buckets

### Vault Bucket (Private)
1. Go to **Storage** in Supabase dashboard
2. Click **New Bucket**
3. Configure:
   - **Name**: `vault`
   - **Public**: OFF (private)
   - **File size limit**: 50MB
   - **Allowed MIME types**:
     - `image/jpeg`
     - `image/png`
     - `image/gif`
     - `image/webp`
     - `application/pdf`
     - `application/msword`
     - `application/vnd.openxmlformats-officedocument.wordprocessingml.document`
     - `application/vnd.ms-excel`
     - `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`

### Avatars Bucket (Public)
1. Create another bucket:
   - **Name**: `avatars`
   - **Public**: ON
   - No file restrictions needed

## Step 5: Deploy Edge Functions

### Using Supabase Dashboard
1. Go to **Edge Functions**
2. For each function in `supabase/functions/`:
   - Click **New Function**
   - Copy/paste the code from `index.ts`
   - Deploy

### Functions to Deploy
- `create-user`
- `delete-user`
- `reset-user-password`
- `two-factor-auth`

## Step 6: Configure Authentication Settings

1. Go to **Authentication** → **Providers**
2. Enable **Email** provider
3. Go to **Authentication** → **Email Templates**
4. Disable email confirmation (or customize templates)

### Disable Email Confirmation
1. Go to **Authentication** → **Settings**
2. Find **Email Confirmations**
3. Toggle OFF "Enable email confirmations"

## Step 7: Update Environment Variables

Update your `.env` file with new credentials:

```env
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

**DO NOT** commit these changes to git if your repo is public!

## Step 8: Create Your Admin User

### Using Edge Function
Once edge functions are deployed, you can use the `create-user` function.

### Using Supabase Dashboard (Easier)
1. Go to **Authentication** → **Users**
2. Click **Add User**
3. Enter:
   - **Email**: your-email@example.com
   - **Password**: Choose a strong password
   - **Auto Confirm**: ON
4. After user is created, go to **SQL Editor** and run:

```sql
-- Insert CRM user record
INSERT INTO crm_users (id, email, name, role, is_active)
VALUES (
  (SELECT id FROM auth.users WHERE email = 'your-email@example.com'),
  'your-email@example.com',
  'Your Name',
  'super_admin',
  true
);

-- Refresh hierarchy
SELECT refresh_user_hierarchy();
```

## Step 9: Migrate Data (Optional)

If you want to keep existing data:

### Export from Current Database
Run these SQL queries in the current Supabase SQL Editor and save results:

```sql
-- Export accounts
COPY (SELECT * FROM accounts) TO STDOUT WITH CSV HEADER;

-- Export opportunities
COPY (SELECT * FROM opportunities) TO STDOUT WITH CSV HEADER;

-- Export contacts
COPY (SELECT * FROM contacts) TO STDOUT WITH CSV HEADER;

-- Export partners
COPY (SELECT * FROM partners) TO STDOUT WITH CSV HEADER;

-- Repeat for other tables as needed
```

### Import to New Database
Use the Supabase dashboard's Table Editor to import CSV files, or use SQL INSERT statements.

## Step 10: Test Your Application

1. Stop the dev server if running
2. Clear browser cache and localStorage
3. Start dev server: `npm run dev`
4. Test:
   - ✅ Login with your admin user
   - ✅ Create a test account
   - ✅ Create a test opportunity
   - ✅ Upload a file to Media Vault
   - ✅ Check notifications work
   - ✅ Verify user hierarchy

## Step 11: Update Production Deployment (if applicable)

If you've deployed to Vercel/Netlify/other hosting:

1. Update environment variables in your hosting dashboard
2. Redeploy the application

## Troubleshooting

### "relation does not exist" errors
- **Cause**: Migrations not run in order
- **Fix**: Drop all tables and re-run migrations from scratch

### RLS Policy errors
- **Cause**: Policies not created or user not authenticated
- **Fix**: Check that all migrations completed successfully

### Edge Function deployment fails
- **Cause**: Missing dependencies or incorrect import paths
- **Fix**: Ensure all imports use `npm:` or `jsr:` specifiers

### Can't login after migration
- **Cause**: User not in crm_users table
- **Fix**: Run the SQL query from Step 8 to create CRM user record

## Security Checklist

Before going live:

- [ ] Changed database password from default
- [ ] Kept service_role key secret (never expose in frontend)
- [ ] Disabled email confirmation or configured SMTP
- [ ] Set up RLS policies (already done via migrations)
- [ ] Created super_admin user for yourself
- [ ] Tested all critical features
- [ ] Backed up your database credentials securely

## Cost Considerations

**Supabase Free Tier Includes**:
- 500 MB database space
- 1 GB file storage
- 2 GB bandwidth
- 50,000 monthly active users
- Unlimited API requests

**When to Upgrade**:
- Database > 500 MB (unlikely for small teams)
- Need daily backups
- Need custom domain for auth emails
- Need point-in-time recovery

---

## Need Help?

If you encounter issues:

1. Check Supabase logs in dashboard
2. Check browser console for errors
3. Verify environment variables are correct
4. Ensure migrations ran successfully
5. Check RLS policies are active

---

**Estimated Time**: 30-60 minutes for full migration
**Difficulty**: Intermediate
**Downtime**: None (you can test in parallel before switching)
