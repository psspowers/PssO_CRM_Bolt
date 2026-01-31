# Deployment & Migration Guide

**Version:** 1.0
**Last Updated:** January 31, 2026
**Audience:** DevOps Engineers, System Administrators, Deployment Teams

---

## Table of Contents

1. [Introduction](#1-introduction)
2. [Database Safety System](#2-database-safety-system)
3. [Migration from Bolt Supabase](#3-migration-from-bolt-supabase)
4. [Safe Project Duplication](#4-safe-project-duplication)
5. [Production Deployment](#5-production-deployment)
6. [Post-Deployment Verification](#6-post-deployment-verification)
7. [Troubleshooting](#7-troubleshooting)
8. [Appendix: Migration Checklist](#appendix-migration-checklist)

---

## 1. Introduction

### 1.1 Purpose

This guide provides comprehensive instructions for deploying the PSS Orange CRM system, migrating from Bolt-provisioned Supabase to your own account, and safely duplicating the project for development or staging environments.

### 1.2 Prerequisites

Before starting, ensure you have:
- Node.js 18+ installed
- npm or yarn package manager
- Git installed and configured
- Access to a Supabase account
- Basic understanding of PostgreSQL and SQL
- Command-line proficiency

### 1.3 Estimated Time

- **New Supabase setup**: 30-60 minutes
- **Full migration with data**: 60-90 minutes
- **Production deployment**: 15-30 minutes

---

## 2. Database Safety System

### 2.1 The Three Immutable Rules

#### Rule 1: Migrations Apply SQL — Never Create Infrastructure

✅ Migrations should ONLY apply SQL to existing database
✅ Should be idempotent (safe to re-run)
❌ Should NEVER provision new databases

**Red Flag**: If any tool says "provisioning database" → **ABORT IMMEDIATELY**

#### Rule 2: .env Defines Reality at Build Time

`VITE_SUPABASE_URL` is **compile-time destiny**. If it changes, your app's reality changes.

**Backup Strategy:**
```bash
.env                    # Active configuration
.env.ORIGINAL_BACKUP    # Safe restore point
```

**Recovery:**
```bash
cp .env.ORIGINAL_BACKUP .env
npm run dev
```

#### Rule 3: Any Database Mismatch = Crash, Don't Limp

The most dangerous state is:
- ✅ App loads fine
- ✅ Auth works
- ✅ Queries return empty arrays
- ❌ No errors

This means: **You're on a brand-new database that perfectly matches your schema.**

**Solution**: Kill switch activates → app refuses to run.

### 2.2 Technical Implementation

#### Two-Factor Database Identity

The app verifies TWO cryptographic invariants before allowing ANY operation:

```sql
CREATE TABLE db_identity (
  id boolean PRIMARY KEY DEFAULT true,
  environment text NOT NULL,
  project_ref text NOT NULL,
  created_at timestamptz DEFAULT now(),

  CONSTRAINT single_identity CHECK (id = true),
  CONSTRAINT immutable_identity CHECK (
    environment IN ('PRODUCTION_ORIGINAL', 'STAGING', 'DEVELOPMENT')
  )
);

INSERT INTO db_identity (environment, project_ref)
VALUES ('PRODUCTION_ORIGINAL', 'your-project-ref');
```

#### Runtime Verification

On every app startup, before ANY render:

```typescript
const { data } = await supabase
  .from('db_identity')
  .select('environment, project_ref')
  .single();

if (
  data?.environment !== 'PRODUCTION_ORIGINAL' ||
  data?.project_ref !== 'your-project-ref'
) {
  throw new Error('❌ Connected to the wrong database');
}
```

### 2.3 Failure Modes (Intentional)

#### Wrong Database Detected

```
🚨 WRONG DATABASE DETECTED

Expected:
  Environment: PRODUCTION_ORIGINAL
  Project Ref: your-project-ref

Found:
  Environment: NONE
  Project Ref: NONE

Your app is connected to the wrong database!

RECOVERY:
1. Check .env file
2. Compare with .env.ORIGINAL_BACKUP
3. Restore: cp .env.ORIGINAL_BACKUP .env
4. Restart dev server

APP BLOCKED - Will not operate on wrong database.
```

**What You See**: Full-screen red error with recovery instructions. App will not render.

### 2.4 Safety Checklist

Before proceeding with any deployment:

- [ ] `.env.ORIGINAL_BACKUP` exists
- [ ] `db_identity` table exists with TWO factors
- [ ] App refuses to boot on mismatch
- [ ] Check runs BEFORE any render
- [ ] Check runs BEFORE any write
- [ ] Constraint prevents value changes

---

## 3. Migration from Bolt Supabase

### 3.1 Overview

This section guides you through migrating from the Bolt-provisioned Supabase instance to your own Supabase account.

### 3.2 Pre-Migration

**Backup Current Data:**
```bash
# Export data using provided SQL script
psql -h your-db-host -U postgres -f export-current-data.sql > backup.sql

# Backup environment file
cp .env .env.backup

# Document current configuration
cat .env > current-config.txt
```

**Download Storage Files:**
- Export files from `vault` bucket
- Export files from `avatars` bucket
- Save to local backup directory

### 3.3 Step 1: Create New Supabase Project

1. Go to [supabase.com](https://supabase.com)
2. Create new account or sign in
3. Click "New Project"
4. Configure:
   - **Name**: PSS CRM (or your preferred name)
   - **Database Password**: Choose a strong password (save it securely!)
   - **Region**: Select closest to your users (e.g., Singapore, Tokyo, US West)
   - **Pricing**: Free tier is sufficient to start

5. Wait for project provisioning (2-3 minutes)

### 3.4 Step 2: Get Project Credentials

After project is created:

1. Go to **Project Settings** → **API**
2. Copy these values:

```env
Project URL: https://your-project-ref.supabase.co
Project Ref: your-project-ref
anon/public key: eyJ...
service_role key: eyJ... (keep this secret!)
```

**Save these credentials securely** - you'll need them for configuration.

### 3.5 Step 3: Run Database Migrations

#### Option A: Using Supabase Dashboard (Recommended)

1. Go to **SQL Editor** in your Supabase dashboard
2. Run ALL migration files in chronological order from `supabase/migrations/` folder
3. Start with oldest (20260101...) and work your way to newest

**Migration Order:**
```
20260101113858_create_crm_users_table.sql
20260101132727_enforce_single_super_admin.sql
20260101133624_remove_crm_users_auth_fkey.sql
20260101134323_create_partners_table.sql
... (continue with all ~100 migration files)
20260130124552_20260130_tasks_final_master.sql (last)
```

**Important Tips:**
- Run migrations ONE AT A TIME
- Check for errors after each migration
- If error occurs, note the migration file and error message
- Do not skip migrations - dependencies exist between them

**Verify Migrations:**
```sql
-- Check table count
SELECT COUNT(*) FROM information_schema.tables
WHERE table_schema = 'public';
-- Should return 20-30 tables

-- Check functions exist
SELECT COUNT(*) FROM pg_proc
WHERE pronamespace = 'public'::regnamespace;
-- Should return 15+ functions
```

#### Option B: Using Supabase CLI (Advanced)

If you have Supabase CLI installed:

```bash
# Install CLI (if not already installed)
npm install -g supabase

# Login to Supabase
supabase login

# Link to your project
supabase link --project-ref your-project-ref

# Push all migrations
supabase db push
```

### 3.6 Step 4: Create Storage Buckets

#### Vault Bucket (Private)

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
     - `text/csv`

4. RLS policies are created automatically by migrations

#### Avatars Bucket (Public)

1. Create another bucket:
   - **Name**: `avatars`
   - **Public**: ON
   - **File size limit**: 5MB
   - **Allowed MIME types**: All image types

2. Verify policies exist:
```sql
SELECT * FROM storage.policies
WHERE bucket_id IN ('vault', 'avatars');
```

### 3.7 Step 5: Deploy Edge Functions

#### Using Supabase Dashboard

For each function in `supabase/functions/`:

**Functions to Deploy:**
1. `create-user` - Admin user creation
2. `delete-user` - User deletion
3. `reset-user-password` - Password reset
4. `two-factor-auth` - 2FA setup and verification

**Deployment Steps:**
1. Go to **Edge Functions** in dashboard
2. Click **New Function**
3. Set function name (e.g., `create-user`)
4. Copy entire `index.ts` content from `supabase/functions/create-user/`
5. Click **Deploy**
6. Repeat for all 4 functions

**Verify Deployment:**
```bash
# Test function endpoint
curl -X POST \
  'https://your-project-ref.supabase.co/functions/v1/create-user' \
  -H 'Authorization: Bearer YOUR_ANON_KEY' \
  -H 'Content-Type: application/json'

# Should return CORS headers and 400 (missing body) - this confirms it's deployed
```

#### Using Supabase CLI

```bash
# Deploy all functions
supabase functions deploy create-user
supabase functions deploy delete-user
supabase functions deploy reset-user-password
supabase functions deploy two-factor-auth
```

### 3.8 Step 6: Configure Authentication

1. Go to **Authentication** → **Settings**

**Disable Email Confirmation:**
1. Find **Email Confirmations**
2. Toggle OFF "Enable email confirmations"
3. Save changes

**Configure Session Settings:**
- Session timeout: 30 days (default)
- Refresh token rotation: Enabled
- Enable manual linking: Disabled

**Configure Providers:**
1. Go to **Authentication** → **Providers**
2. Enable **Email** provider
3. Save changes

**Optional: Custom SMTP**
If you want branded emails:
1. Go to **Authentication** → **Settings** → **SMTP Settings**
2. Configure your SMTP server
3. Test email delivery

### 3.9 Step 7: Create Database Identity

**Critical Security Step:**

```sql
-- Create identity record for your new project
INSERT INTO db_identity (environment, project_ref)
VALUES ('PRODUCTION_ORIGINAL', 'your-project-ref')
ON CONFLICT (id) DO NOTHING;

-- Verify it was created
SELECT * FROM db_identity;
```

Expected output:
```
id | environment          | project_ref       | created_at
---|----------------------|-------------------|----------------------------
t  | PRODUCTION_ORIGINAL  | your-project-ref  | 2026-01-31 10:00:00+00
```

### 3.10 Step 8: Create Your Admin User

#### Method A: SQL Editor (Recommended)

1. Go to **Authentication** → **Users**
2. Click **Add User**
3. Configure:
   - **Email**: your-email@example.com
   - **Password**: Choose a strong password
   - **Auto Confirm**: ON
4. Click **Create User**

5. Run this SQL to create CRM profile:

```sql
-- Create CRM user record
INSERT INTO crm_users (
  id,
  email,
  name,
  role,
  is_active,
  avatar_url,
  position,
  department
)
VALUES (
  (SELECT id FROM auth.users WHERE email = 'your-email@example.com'),
  'your-email@example.com',
  'Your Name',
  'super_admin',
  true,
  NULL,
  'CRM Administrator',
  'Management'
);

-- Refresh user hierarchy
SELECT refresh_user_hierarchy();

-- Verify user was created
SELECT id, email, name, role FROM crm_users WHERE email = 'your-email@example.com';
```

#### Method B: Using Edge Function

```bash
curl -X POST \
  'https://your-project-ref.supabase.co/functions/v1/create-user' \
  -H 'Authorization: Bearer YOUR_SERVICE_ROLE_KEY' \
  -H 'Content-Type: application/json' \
  -d '{
    "email": "your-email@example.com",
    "password": "your-password",
    "name": "Your Name",
    "role": "super_admin",
    "position": "CRM Administrator",
    "department": "Management"
  }'
```

### 3.11 Step 9: Update Environment Variables

Create or update `.env` file in project root:

```env
# Supabase Configuration
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ... (your anon key)

# Optional Configuration
VITE_APP_VERSION=1.2.0
```

**Create backup:**
```bash
cp .env .env.ORIGINAL_BACKUP
```

**NEVER commit `.env` to git** if your repository is public!

### 3.12 Step 10: Test Locally

```bash
# Stop any running dev server
# Clear browser cache and localStorage

# Install dependencies (if fresh clone)
npm install

# Start dev server
npm run dev
```

**Test Checklist:**

- [ ] App loads without errors
- [ ] Database identity verification passes
- [ ] Can login with admin credentials
- [ ] Can create a test account
- [ ] Can create a test opportunity
- [ ] Can upload a file to Media Vault
- [ ] Can create an activity/task
- [ ] Notifications appear
- [ ] Search functionality works
- [ ] User dropdown shows profile

**Expected Console Output:**
```
✅ Database identity verified: PRODUCTION_ORIGINAL (your-project-ref)
```

### 3.13 Step 11: Import Existing Data (Optional)

If you need to preserve data from the old database:

#### Export from Old Database

```sql
-- Export accounts
COPY (
  SELECT * FROM accounts ORDER BY created_at
) TO STDOUT WITH CSV HEADER;

-- Export opportunities
COPY (
  SELECT * FROM opportunities ORDER BY created_at
) TO STDOUT WITH CSV HEADER;

-- Export contacts
COPY (
  SELECT * FROM contacts ORDER BY created_at
) TO STDOUT WITH CSV HEADER;

-- Export projects
COPY (
  SELECT * FROM projects ORDER BY created_at
) TO STDOUT WITH CSV HEADER;

-- Export activities
COPY (
  SELECT * FROM activities ORDER BY created_at
) TO STDOUT WITH CSV HEADER;
```

Save each export to a separate CSV file.

#### Import to New Database

**Using Table Editor:**
1. Go to **Table Editor** in Supabase dashboard
2. Select table (e.g., `accounts`)
3. Click **Import Data**
4. Upload CSV file
5. Map columns
6. Click **Import**

**Using SQL:**
```sql
-- Import accounts
COPY accounts FROM '/path/to/accounts.csv'
WITH (FORMAT CSV, HEADER true);

-- Verify import
SELECT COUNT(*) FROM accounts;
```

#### Re-upload Storage Files

```bash
# Use Supabase CLI or dashboard to upload files
# For each file in backup directory:
supabase storage upload vault backup/vault/file.pdf
```

### 3.14 Step 12: Verification

Run comprehensive verification:

```sql
-- 1. Check all core tables exist
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;

-- 2. Check RLS is enabled
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
AND rowsecurity = true;

-- 3. Check policies exist
SELECT tablename, policyname
FROM pg_policies
WHERE schemaname = 'public';

-- 4. Check functions exist
SELECT proname
FROM pg_proc
WHERE pronamespace = 'public'::regnamespace;

-- 5. Check triggers exist
SELECT tgname, tgrelid::regclass
FROM pg_trigger
WHERE tgname NOT LIKE 'RI_%';

-- 6. Verify user count
SELECT role, COUNT(*)
FROM crm_users
WHERE is_active = true
GROUP BY role;
```

---

## 4. Safe Project Duplication

### 4.1 Pre-Duplication Checklist

Before duplicating the project (in Bolt, Git, or elsewhere):

- [ ] `.env.ORIGINAL_BACKUP` exists
- [ ] `DATABASE_SAFETY_SYSTEM.md` is present
- [ ] `db_identity` table exists in Supabase
- [ ] App currently boots with success message

**If ANY box is unchecked → STOP and fix first**

### 4.2 During Duplication

**DO:**
- ✅ Duplicate project/chat/repository ONLY
- ✅ Keep all documentation files

**DO NOT:**
- ❌ Duplicate Supabase project
- ❌ Accept "fix migrations" prompts
- ❌ Allow database provisioning
- ❌ Click "Apply migrations automatically"

**Red Flags - ABORT if you see:**
- "Out of sync"
- "Fix database"
- "Provisioning database"
- "Apply migrations automatically"

### 4.3 Post-Duplication (Mandatory)

In the duplicated project, run:

```bash
cp .env.ORIGINAL_BACKUP .env
npm run dev
```

**Expected Result:**
```
✅ Database identity verified: PRODUCTION_ORIGINAL (your-project-ref)
```

**Anything else means something went wrong - follow recovery steps.**

### 4.4 Recovery Process

#### Symptom: App shows database error

```bash
# In the duplicated project
cp .env.ORIGINAL_BACKUP .env
npm run dev
```

#### Symptom: Original project suddenly broken

```bash
# In the original project
cp .env.ORIGINAL_BACKUP .env
npm run dev
```

#### Symptom: Bolt says "database out of sync"

**DO NOT CLICK "FIX"**

Close the prompt and run:
```bash
cp .env.ORIGINAL_BACKUP .env
npm run dev
```

---

## 5. Production Deployment

### 5.1 Hosting Options

Recommended hosting platforms:
- **Vercel** (Recommended - optimized for Vite)
- Netlify
- Cloudflare Pages
- AWS Amplify

### 5.2 Deployment to Vercel

#### Prerequisites

```bash
# Install Vercel CLI
npm install -g vercel

# Login to Vercel
vercel login
```

#### Initial Deployment

```bash
# Build locally first to test
npm run build

# Deploy to Vercel
vercel --prod
```

#### Configure Environment Variables

1. Go to Vercel dashboard
2. Select your project
3. Go to **Settings** → **Environment Variables**
4. Add:
   - `VITE_SUPABASE_URL` → Your Supabase URL
   - `VITE_SUPABASE_ANON_KEY` → Your anon key

5. Redeploy: `vercel --prod`

#### Configure vercel.json

Create `vercel.json` in project root (already exists):

```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "framework": "vite",
  "routes": [
    {
      "src": "/assets/(.*)",
      "headers": {
        "cache-control": "max-age=31536000, immutable"
      }
    },
    {
      "src": "/(.*)",
      "dest": "/index.html"
    }
  ]
}
```

### 5.3 Deployment to Netlify

#### Using Netlify CLI

```bash
# Install Netlify CLI
npm install -g netlify-cli

# Login
netlify login

# Initialize
netlify init

# Deploy
netlify deploy --prod
```

#### Configuration

Create `netlify.toml`:

```toml
[build]
  command = "npm run build"
  publish = "dist"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200

[[headers]]
  for = "/assets/*"
  [headers.values]
    Cache-Control = "public, max-age=31536000, immutable"
```

### 5.4 Post-Deployment Configuration

#### Update Supabase Auth Settings

1. Go to Supabase **Authentication** → **Settings**
2. **Site URL**: `https://your-domain.vercel.app`
3. **Redirect URLs**: Add your production URL
4. Save changes

#### Update CORS Settings (if needed)

For Edge Functions, CORS is already configured in the code.

Verify CORS headers in function responses:
```javascript
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};
```

---

## 6. Post-Deployment Verification

### 6.1 Smoke Tests

Run these tests immediately after deployment:

#### Authentication Tests
- [ ] Can access login page
- [ ] Can login with admin account
- [ ] Session persists after refresh
- [ ] Can logout successfully

#### Core Functionality Tests
- [ ] Dashboard loads with data
- [ ] Can create new opportunity
- [ ] Can create new account
- [ ] Can create new contact
- [ ] Can upload file to Media Vault
- [ ] Can create activity/task

#### Edge Function Tests
- [ ] User creation works (Admin panel)
- [ ] Password reset works
- [ ] 2FA setup works (if enabled)

#### Performance Tests
- [ ] Page load time < 3 seconds
- [ ] No console errors
- [ ] No 404 errors in Network tab
- [ ] Assets load from CDN

### 6.2 Monitoring Setup

#### Supabase Dashboard Monitoring

1. Go to **Project Settings** → **Database**
2. Monitor:
   - Active connections
   - Database size
   - Query performance

3. Go to **Storage**
4. Monitor:
   - Storage usage
   - Bandwidth usage

#### Application Monitoring

**Using Vercel Analytics:**
1. Enable analytics in Vercel dashboard
2. Monitor:
   - Page views
   - Response times
   - Error rates

**Using Console Logs:**
Check browser console for:
- Authentication events
- API errors
- Network failures

### 6.3 Security Verification

Run security checklist:

- [ ] Service role key not exposed in frontend
- [ ] RLS policies active on all tables
- [ ] Storage buckets have correct policies
- [ ] HTTPS enabled (not HTTP)
- [ ] API keys not in Git history
- [ ] Database password is strong
- [ ] Admin users use strong passwords
- [ ] 2FA enabled for admin accounts

---

## 7. Troubleshooting

### 7.1 Common Issues

#### "relation does not exist" errors

**Cause**: Migrations not run or run in wrong order

**Fix**:
1. Check which tables exist:
```sql
SELECT tablename FROM pg_tables WHERE schemaname = 'public';
```

2. Identify missing tables
3. Re-run missing migrations in order
4. If too many errors, consider fresh migration:
```sql
-- Drop all tables (DANGEROUS - backup first!)
DROP SCHEMA public CASCADE;
CREATE SCHEMA public;

-- Re-run all migrations in order
```

#### RLS Policy Errors

**Cause**: Policies not created or user not authenticated

**Fix**:
```sql
-- Check if RLS is enabled
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public';

-- Check if policies exist
SELECT * FROM pg_policies WHERE schemaname = 'public';

-- If missing, re-run RLS migration files
```

#### Can't Login After Migration

**Cause**: User not in `crm_users` table

**Fix**:
```sql
-- Check if user exists in auth.users
SELECT id, email FROM auth.users WHERE email = 'your-email@example.com';

-- Check if user exists in crm_users
SELECT id, email, role FROM crm_users WHERE email = 'your-email@example.com';

-- If missing from crm_users, create:
INSERT INTO crm_users (id, email, name, role)
VALUES (
  (SELECT id FROM auth.users WHERE email = 'your-email@example.com'),
  'your-email@example.com',
  'Your Name',
  'super_admin'
);
```

#### Database Identity Errors

**Cause**: Wrong database or missing identity record

**Fix**:
```bash
# 1. Verify .env is correct
cat .env | grep VITE_SUPABASE_URL

# 2. Restore from backup if needed
cp .env.ORIGINAL_BACKUP .env

# 3. Verify identity exists in database
# Run in Supabase SQL Editor:
SELECT * FROM db_identity;

# 4. If missing, create it:
INSERT INTO db_identity (environment, project_ref)
VALUES ('PRODUCTION_ORIGINAL', 'your-project-ref');

# 5. Restart dev server
npm run dev
```

#### Edge Function Deployment Fails

**Cause**: Missing dependencies or incorrect import paths

**Common Issues**:
- Using `import { ... } from 'package'` instead of `import { ... } from 'npm:package'`
- Missing `npm:` or `jsr:` prefixes
- Incompatible package versions

**Fix**:
```typescript
// BAD
import { createClient } from '@supabase/supabase-js'

// GOOD
import { createClient } from 'npm:@supabase/supabase-js@2.49.4'
```

#### Build Failures

**Cause**: TypeScript errors, missing dependencies, or environment variables

**Fix**:
```bash
# 1. Clean install
rm -rf node_modules package-lock.json
npm install

# 2. Check TypeScript errors
npm run type-check

# 3. Check environment variables
cat .env

# 4. Try development build first
npm run build:dev

# 5. Then production build
npm run build
```

### 7.2 Diagnostic Commands

```bash
# Check Node version
node --version  # Should be 18+

# Check npm version
npm --version

# Check environment variables are loaded
npm run dev | grep "VITE_SUPABASE"

# Check build output
npm run build
ls -lah dist/

# Check for TypeScript errors
npm run type-check

# Check for linting errors
npm run lint
```

### 7.3 Database Diagnostic Queries

```sql
-- Check database size
SELECT pg_size_pretty(pg_database_size(current_database()));

-- Check table sizes
SELECT
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- Check active connections
SELECT COUNT(*) FROM pg_stat_activity;

-- Check for long-running queries
SELECT
  pid,
  now() - pg_stat_activity.query_start AS duration,
  query
FROM pg_stat_activity
WHERE (now() - pg_stat_activity.query_start) > interval '5 minutes';

-- Check RLS policies
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  cmd
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
```

### 7.4 Support Resources

**Supabase Documentation:**
- Main Docs: https://supabase.com/docs
- Discord: https://discord.supabase.com
- GitHub: https://github.com/supabase/supabase

**Vercel Documentation:**
- Main Docs: https://vercel.com/docs
- Support: https://vercel.com/support

**Project-Specific:**
- Review `README.md` in project root
- Check `/docs/` folder for additional documentation
- Review `CHANGELOG.md` for version-specific issues

---

## Appendix: Migration Checklist

### Quick Reference Checklist

Use this checklist for rapid migration:

#### Pre-Migration
- [ ] Backup current data
- [ ] Save `.env` as `.env.backup`
- [ ] Download storage files
- [ ] Document custom configurations

#### Migration Steps
1. [ ] Create new Supabase project
2. [ ] Copy credentials (URL, keys, project ref)
3. [ ] Run all migrations in order (100+ files)
4. [ ] Create storage buckets (vault, avatars)
5. [ ] Deploy edge functions (4 functions)
6. [ ] Configure authentication settings
7. [ ] Create database identity record
8. [ ] Create admin user
9. [ ] Update `.env` file
10. [ ] Create `.env.ORIGINAL_BACKUP`
11. [ ] Test locally
12. [ ] Import data (if needed)
13. [ ] Deploy to production
14. [ ] Run post-deployment verification

#### Verification
- [ ] Database identity verified
- [ ] Can login
- [ ] Core features work
- [ ] Files can be uploaded
- [ ] No console errors
- [ ] RLS policies active
- [ ] Edge functions respond correctly

#### Success Criteria
- [ ] App loads without errors
- [ ] Authentication works
- [ ] CRUD operations function
- [ ] Hierarchical security enforced
- [ ] Files uploadable and accessible
- [ ] Performance acceptable

---

## Change Log

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2026-01-31 | Initial consolidated deployment guide |

---

**Maintained by:** PSS Orange Development Team
**For Support:** Review troubleshooting section or contact development team
**Related Documentation:** See `USER_GUIDE.md`, `SYSTEM_ARCHITECTURE.md`, and `FEATURE_REFERENCE.md`
