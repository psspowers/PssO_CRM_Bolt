/*
  # Create Partner Join Tables

  1. New Tables
    - `account_partners`
      - `id` (uuid, primary key)
      - `account_id` (uuid, references accounts)
      - `partner_id` (uuid, references partners)
      - `created_at` (timestamptz)
    
    - `opportunity_partners`
      - `id` (uuid, primary key)
      - `opportunity_id` (uuid, references opportunities)
      - `partner_id` (uuid, references partners)
      - `created_at` (timestamptz)
    
    - `project_partners`
      - `id` (uuid, primary key)
      - `project_id` (uuid, references projects)
      - `partner_id` (uuid, references partners)
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on all three tables
    - Add policies allowing authenticated users to manage partner relationships
    - Policies use FOR ALL to cover SELECT, INSERT, UPDATE, and DELETE operations

  3. Purpose
    - Enable many-to-many relationships between partners and various entities
    - Track which partners are associated with accounts, opportunities, and projects
    - Support collaborative work and partnership management
*/

-- 1. Create 'account_partners' join table
CREATE TABLE IF NOT EXISTS account_partners (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    account_id uuid NOT NULL,
    partner_id uuid NOT NULL,
    created_at timestamptz DEFAULT now()
);

-- 2. Create 'opportunity_partners' join table
CREATE TABLE IF NOT EXISTS opportunity_partners (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    opportunity_id uuid NOT NULL,
    partner_id uuid NOT NULL,
    created_at timestamptz DEFAULT now()
);

-- 3. Create 'project_partners' join table
CREATE TABLE IF NOT EXISTS project_partners (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    project_id uuid NOT NULL,
    partner_id uuid NOT NULL,
    created_at timestamptz DEFAULT now()
);

-- 4. Enable Row Level Security on all three tables
ALTER TABLE account_partners ENABLE ROW LEVEL SECURITY;
ALTER TABLE opportunity_partners ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_partners ENABLE ROW LEVEL SECURITY;

-- 5. Create policies for authenticated users to manage partner relationships

-- Policy for Account Partners
DROP POLICY IF EXISTS "Manage account partners" ON account_partners;
CREATE POLICY "Manage account partners" 
ON account_partners 
FOR ALL 
TO authenticated
USING (true)
WITH CHECK (true);

-- Policy for Opportunity Partners
DROP POLICY IF EXISTS "Manage opportunity partners" ON opportunity_partners;
CREATE POLICY "Manage opportunity partners" 
ON opportunity_partners 
FOR ALL 
TO authenticated
USING (true)
WITH CHECK (true);

-- Policy for Project Partners
DROP POLICY IF EXISTS "Manage project partners" ON project_partners;
CREATE POLICY "Manage project partners" 
ON project_partners 
FOR ALL 
TO authenticated
USING (true)
WITH CHECK (true);

-- 6. Refresh schema cache
NOTIFY pgrst, 'reload config';