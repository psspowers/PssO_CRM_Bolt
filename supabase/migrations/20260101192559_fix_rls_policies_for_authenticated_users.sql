/*
  # Fix RLS Policies for Authenticated Users
  
  ## Changes Made
  
  This migration fixes the Row Level Security policies across all main tables to properly allow
  authenticated users to access data. The previous policies used `auth.role() = 'authenticated'`
  which doesn't work correctly. We're switching to `auth.uid() IS NOT NULL` which is the standard
  way to check if a user is authenticated in Supabase.
  
  ## Tables Updated
  
  1. **opportunities** - Enable full access for authenticated users
  2. **accounts** - Enable full access for authenticated users  
  3. **partners** - Enable full access for authenticated users
  4. **projects** - Enable full access for authenticated users
  5. **contacts** - Enable full access for authenticated users
  6. **activities** - Enable full access for authenticated users
  7. **relationships** - Enable full access for authenticated users
  8. **opportunity_partners** - Enable full access for authenticated users
  9. **account_partners** - Enable full access for authenticated users
  10. **project_partners** - Enable full access for authenticated users
  
  ## Security Model
  
  - All authenticated users can read, create, update, and delete records
  - Unauthenticated users have no access
  - This matches the internal CRM use case where all logged-in users are trusted employees
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Enable read access for all users" ON opportunities;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON opportunities;
DROP POLICY IF EXISTS "Enable update for users based on email" ON opportunities;
DROP POLICY IF EXISTS "Enable delete for authenticated users" ON opportunities;

DROP POLICY IF EXISTS "Enable read access for all users" ON accounts;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON accounts;
DROP POLICY IF EXISTS "Enable update for users based on email" ON accounts;
DROP POLICY IF EXISTS "Enable delete for authenticated users" ON accounts;

DROP POLICY IF EXISTS "Enable all access for authenticated users" ON partners;

DROP POLICY IF EXISTS "Staff access projects" ON projects;
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON projects;

DROP POLICY IF EXISTS "Enable read access for all users" ON contacts;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON contacts;
DROP POLICY IF EXISTS "Enable update for users based on email" ON contacts;
DROP POLICY IF EXISTS "Enable delete for authenticated users" ON contacts;

DROP POLICY IF EXISTS "Enable read access for all users" ON activities;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON activities;
DROP POLICY IF EXISTS "Enable update for users based on email" ON activities;
DROP POLICY IF EXISTS "Enable delete for authenticated users" ON activities;

DROP POLICY IF EXISTS "Enable all access for authenticated users" ON relationships;

DROP POLICY IF EXISTS "Enable all access for authenticated users" ON opportunity_partners;
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON account_partners;
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON project_partners;

-- Create new policies using the correct authentication check

-- Opportunities
CREATE POLICY "Authenticated users can view opportunities"
  ON opportunities FOR SELECT
  TO authenticated
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can create opportunities"
  ON opportunities FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update opportunities"
  ON opportunities FOR UPDATE
  TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete opportunities"
  ON opportunities FOR DELETE
  TO authenticated
  USING (auth.uid() IS NOT NULL);

-- Accounts
CREATE POLICY "Authenticated users can view accounts"
  ON accounts FOR SELECT
  TO authenticated
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can create accounts"
  ON accounts FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update accounts"
  ON accounts FOR UPDATE
  TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete accounts"
  ON accounts FOR DELETE
  TO authenticated
  USING (auth.uid() IS NOT NULL);

-- Partners
CREATE POLICY "Authenticated users can view partners"
  ON partners FOR SELECT
  TO authenticated
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can create partners"
  ON partners FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update partners"
  ON partners FOR UPDATE
  TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete partners"
  ON partners FOR DELETE
  TO authenticated
  USING (auth.uid() IS NOT NULL);

-- Projects
CREATE POLICY "Authenticated users can view projects"
  ON projects FOR SELECT
  TO authenticated
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can create projects"
  ON projects FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update projects"
  ON projects FOR UPDATE
  TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete projects"
  ON projects FOR DELETE
  TO authenticated
  USING (auth.uid() IS NOT NULL);

-- Contacts
CREATE POLICY "Authenticated users can view contacts"
  ON contacts FOR SELECT
  TO authenticated
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can create contacts"
  ON contacts FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update contacts"
  ON contacts FOR UPDATE
  TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete contacts"
  ON contacts FOR DELETE
  TO authenticated
  USING (auth.uid() IS NOT NULL);

-- Activities
CREATE POLICY "Authenticated users can view activities"
  ON activities FOR SELECT
  TO authenticated
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can create activities"
  ON activities FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update activities"
  ON activities FOR UPDATE
  TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete activities"
  ON activities FOR DELETE
  TO authenticated
  USING (auth.uid() IS NOT NULL);

-- Relationships
CREATE POLICY "Authenticated users can view relationships"
  ON relationships FOR SELECT
  TO authenticated
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can create relationships"
  ON relationships FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update relationships"
  ON relationships FOR UPDATE
  TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete relationships"
  ON relationships FOR DELETE
  TO authenticated
  USING (auth.uid() IS NOT NULL);

-- Join Tables
CREATE POLICY "Authenticated users can view opportunity_partners"
  ON opportunity_partners FOR SELECT
  TO authenticated
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can manage opportunity_partners"
  ON opportunity_partners FOR ALL
  TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can view account_partners"
  ON account_partners FOR SELECT
  TO authenticated
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can manage account_partners"
  ON account_partners FOR ALL
  TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can view project_partners"
  ON project_partners FOR SELECT
  TO authenticated
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can manage project_partners"
  ON project_partners FOR ALL
  TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);
