# ✅ Supabase Migration Checklist

Use this checklist to track your migration from Bolt-provisioned Supabase to your own account.

## Pre-Migration

- [ ] Backup current data (export using `export-current-data.sql`)
- [ ] Save current `.env` file as `.env.backup`
- [ ] Download any uploaded files from storage buckets
- [ ] Document any custom configurations

## Step 1: Create New Supabase Project

- [ ] Sign up at [supabase.com](https://supabase.com)
- [ ] Create new project
  - [ ] Choose project name
  - [ ] Set database password (saved securely)
  - [ ] Select region
- [ ] Wait for project provisioning (2-3 minutes)

## Step 2: Get Credentials

- [ ] Navigate to Project Settings → API
- [ ] Copy Project URL: `_______________________`
- [ ] Copy Project Ref: `_______________________`
- [ ] Copy anon/public key: `_______________________`
- [ ] Copy service_role key (keep secret): `_______________________`

## Step 3: Run Database Migrations

### Using SQL Editor (Recommended)
- [ ] Open SQL Editor in new Supabase dashboard
- [ ] Run migrations in chronological order:
  - [ ] 20260101113858_create_crm_users_table.sql
  - [ ] 20260101132727_enforce_single_super_admin.sql
  - [ ] 20260101133624_remove_crm_users_auth_fkey.sql
  - [ ] 20260101134323_create_partners_table.sql
  - [ ] ... (continue with all 100+ migration files)
  - [ ] Last: 20260125023248_*.sql

**Tip**: Copy entire file content and paste into SQL Editor. Run one at a time. Check for errors after each.

- [ ] Verify no errors in migration execution
- [ ] Check all tables created: `SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';`

## Step 4: Create Storage Buckets

### Vault Bucket
- [ ] Go to Storage in dashboard
- [ ] Click "New Bucket"
- [ ] Configure:
  - Name: `vault`
  - Public: OFF
  - File size limit: 50MB
- [ ] Add RLS policies (copy from migration files)
- [ ] Add allowed MIME types:
  - [ ] image/jpeg
  - [ ] image/png
  - [ ] image/gif
  - [ ] image/webp
  - [ ] application/pdf
  - [ ] application/msword
  - [ ] application/vnd.openxmlformats-officedocument.wordprocessingml.document
  - [ ] application/vnd.ms-excel
  - [ ] application/vnd.openxmlformats-officedocument.spreadsheetml.sheet

### Avatars Bucket
- [ ] Create bucket named `avatars`
- [ ] Set as PUBLIC
- [ ] Configure policies for user uploads

## Step 5: Deploy Edge Functions

For each function in `supabase/functions/`:

### create-user
- [ ] Deploy function
- [ ] Test with dummy data
- [ ] Verify invites work

### delete-user
- [ ] Deploy function
- [ ] Test deletion (careful!)

### two-factor-auth
- [ ] Deploy function
- [ ] Test 2FA setup flow

### reset-user-password
- [ ] Deploy function
- [ ] Test password reset

## Step 6: Configure Authentication

- [ ] Go to Authentication → Settings
- [ ] Disable email confirmation (or configure SMTP)
- [ ] Set site URL if deploying to production
- [ ] Configure redirect URLs
- [ ] Set session timeout (if needed)

## Step 7: Create Your Admin User

### Method A: SQL Editor
- [ ] Go to Authentication → Users
- [ ] Click "Add User"
- [ ] Enter email and password
- [ ] Enable "Auto Confirm"
- [ ] Run SQL to create crm_users record:

```sql
INSERT INTO crm_users (id, email, name, role, is_active)
VALUES (
  (SELECT id FROM auth.users WHERE email = 'YOUR_EMAIL@example.com'),
  'YOUR_EMAIL@example.com',
  'Your Name',
  'super_admin',
  true
);
SELECT refresh_user_hierarchy();
```

- [ ] Verify user created successfully

## Step 8: Update Environment Variables

- [ ] Open `.env` file
- [ ] Update `VITE_SUPABASE_URL` with new project URL
- [ ] Update `VITE_SUPABASE_ANON_KEY` with new anon key
- [ ] Save file
- [ ] **DO NOT** commit to git if repo is public

## Step 9: Test Locally

- [ ] Stop dev server if running
- [ ] Clear browser cache and localStorage
- [ ] Start dev server: `npm run dev`
- [ ] Test login with admin credentials
- [ ] Test creating an account
- [ ] Test creating an opportunity
- [ ] Test uploading a file
- [ ] Test creating an activity
- [ ] Check notifications work
- [ ] Verify hierarchy (if multiple users)

## Step 10: Import Data (Optional)

If preserving existing data:

- [ ] Export data from old database (use `export-current-data.sql`)
- [ ] Import accounts
- [ ] Import opportunities
- [ ] Import contacts
- [ ] Import partners
- [ ] Import projects
- [ ] Import activities
- [ ] Import relationships
- [ ] Import junction tables
- [ ] Re-upload files to storage buckets
- [ ] Update media_files table references
- [ ] Verify data integrity

## Step 11: Production Deployment

If deploying to hosting:

- [ ] Choose hosting platform (Vercel/Netlify/etc.)
- [ ] Connect repository
- [ ] Set environment variables in hosting dashboard
- [ ] Deploy application
- [ ] Test production deployment
- [ ] Verify auth works in production
- [ ] Check all features functional

## Step 12: Post-Migration Verification

### Database
- [ ] All tables exist
- [ ] All functions exist
- [ ] All triggers exist
- [ ] RLS policies active
- [ ] Indexes created

### Storage
- [ ] Vault bucket created with correct policies
- [ ] Avatars bucket created with correct policies
- [ ] Files accessible

### Edge Functions
- [ ] All 4 functions deployed
- [ ] Functions respond correctly
- [ ] CORS headers working

### Application
- [ ] Login/logout works
- [ ] User creation works
- [ ] CRUD operations work
- [ ] File uploads work
- [ ] Notifications work
- [ ] Real-time features work (if any)

### Security
- [ ] RLS policies enforced
- [ ] Unauthenticated users blocked
- [ ] Hierarchical access working
- [ ] 2FA setup works (if enabled)

## Step 13: Cleanup

- [ ] Remove old `.env.backup` file (after confirming migration works)
- [ ] Document new credentials securely (password manager)
- [ ] Update team with new database details
- [ ] Archive migration files if desired

## Troubleshooting Checklist

If something doesn't work:

- [ ] Check browser console for errors
- [ ] Check Supabase logs in dashboard
- [ ] Verify environment variables are correct (no typos)
- [ ] Confirm migrations ran successfully
- [ ] Check RLS policies are active
- [ ] Verify user exists in both `auth.users` and `crm_users`
- [ ] Clear browser cache and localStorage
- [ ] Try incognito/private browsing mode

## Success Criteria

Migration is successful when:

- [ ] Can login with new credentials
- [ ] Can create/read/update entities
- [ ] Hierarchical security works correctly
- [ ] Files can be uploaded and accessed
- [ ] No console errors
- [ ] No Supabase errors in logs
- [ ] All features functional

---

## 🎉 Migration Complete!

**Estimated completion time**: 30-60 minutes
**Current status**: Using your own Supabase project!

### Next Steps:
1. Invite team members (use Admin panel)
2. Configure commission rates
3. Import existing data (if needed)
4. Set up production deployment
5. Monitor usage and upgrade plan if needed

### Support:
- Supabase Docs: https://supabase.com/docs
- Supabase Discord: https://discord.supabase.com
- Project README: See troubleshooting section

---

**Remember**: Keep your `service_role` key secret and never expose it in frontend code!
