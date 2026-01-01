/*
  # Bulletproof Schema Patch
  
  1. Purpose
    - Ensure all core tables exist (contacts, projects, activities, relationships)
    - Add all required columns if missing, even if tables already exist
    - Guarantee consistent schema across all environments
    - Safe to run multiple times (idempotent)
  
  2. Tables Updated
    - `contacts` - Customer/partner contact information
    - `projects` - Infrastructure projects and deals
    - `activities` - Activity log and task tracking
    - `relationships` - Entity relationship mapping
  
  3. Security
    - Enable RLS on all tables
    - Create policies for authenticated users to access all data
    - Reset existing policies to ensure consistency
  
  4. Notes
    - Uses IF NOT EXISTS for tables and ADD COLUMN IF NOT EXISTS for columns
    - Completely safe to run on existing database
    - Fixes any missing schema elements without affecting existing data
*/

-- ==========================================
-- 1. CONTACTS TABLE (Ensure table & columns)
-- ==========================================
CREATE TABLE IF NOT EXISTS contacts (id uuid DEFAULT gen_random_uuid() PRIMARY KEY);

-- Force add all required columns (safe to run even if they exist)
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS full_name text;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS role text;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS email text;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS phone text;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS country text;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS city text;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS tags text[];
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS relationship_notes text;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS avatar text;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS account_id uuid;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS partner_id uuid;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS owner_id uuid;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS clickup_link text;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- ==========================================
-- 2. PROJECTS TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS projects (id uuid DEFAULT gen_random_uuid() PRIMARY KEY);

ALTER TABLE projects ADD COLUMN IF NOT EXISTS name text;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS country text;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS capacity numeric;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS status text;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS linked_account_id uuid;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS owner_id uuid;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS clickup_link text;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS notes text;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();
ALTER TABLE projects ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- ==========================================
-- 3. ACTIVITIES TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS activities (id uuid DEFAULT gen_random_uuid() PRIMARY KEY);

ALTER TABLE activities ADD COLUMN IF NOT EXISTS type text;
ALTER TABLE activities ADD COLUMN IF NOT EXISTS summary text;
ALTER TABLE activities ADD COLUMN IF NOT EXISTS details text;
ALTER TABLE activities ADD COLUMN IF NOT EXISTS related_to_id uuid;
ALTER TABLE activities ADD COLUMN IF NOT EXISTS related_to_type text;
ALTER TABLE activities ADD COLUMN IF NOT EXISTS created_by uuid;
ALTER TABLE activities ADD COLUMN IF NOT EXISTS is_task boolean DEFAULT false;
ALTER TABLE activities ADD COLUMN IF NOT EXISTS assigned_to_id uuid;
ALTER TABLE activities ADD COLUMN IF NOT EXISTS due_date timestamptz;
ALTER TABLE activities ADD COLUMN IF NOT EXISTS task_status text;
ALTER TABLE activities ADD COLUMN IF NOT EXISTS priority text;
ALTER TABLE activities ADD COLUMN IF NOT EXISTS attachments text[];
ALTER TABLE activities ADD COLUMN IF NOT EXISTS tags text[];
ALTER TABLE activities ADD COLUMN IF NOT EXISTS clickup_link text;
ALTER TABLE activities ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();

-- ==========================================
-- 4. RELATIONSHIPS TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS relationships (id uuid DEFAULT gen_random_uuid() PRIMARY KEY);

ALTER TABLE relationships ADD COLUMN IF NOT EXISTS from_entity_id uuid;
ALTER TABLE relationships ADD COLUMN IF NOT EXISTS from_entity_type text;
ALTER TABLE relationships ADD COLUMN IF NOT EXISTS to_entity_id uuid;
ALTER TABLE relationships ADD COLUMN IF NOT EXISTS to_entity_type text;
ALTER TABLE relationships ADD COLUMN IF NOT EXISTS type text;
ALTER TABLE relationships ADD COLUMN IF NOT EXISTS strength text;
ALTER TABLE relationships ADD COLUMN IF NOT EXISTS notes text;
ALTER TABLE relationships ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();

-- ==========================================
-- 5. FINAL PERMISSIONS SWEEP
-- ==========================================
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE relationships ENABLE ROW LEVEL SECURITY;

-- Reset policies to ensure consistency
DROP POLICY IF EXISTS "Staff access contacts" ON contacts;
CREATE POLICY "Staff access contacts" 
ON contacts 
FOR ALL 
TO authenticated
USING (true)
WITH CHECK (true);

DROP POLICY IF EXISTS "Staff access projects" ON projects;
CREATE POLICY "Staff access projects" 
ON projects 
FOR ALL 
TO authenticated
USING (true)
WITH CHECK (true);

DROP POLICY IF EXISTS "Staff access activities" ON activities;
CREATE POLICY "Staff access activities" 
ON activities 
FOR ALL 
TO authenticated
USING (true)
WITH CHECK (true);

DROP POLICY IF EXISTS "Staff access relationships" ON relationships;
CREATE POLICY "Staff access relationships" 
ON relationships 
FOR ALL 
TO authenticated
USING (true)
WITH CHECK (true);

-- Refresh schema cache
NOTIFY pgrst, 'reload config';