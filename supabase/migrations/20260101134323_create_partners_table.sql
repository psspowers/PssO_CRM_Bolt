/*
  # Create Partners Table

  1. New Tables
    - `partners`
      - `id` (uuid, primary key) - Unique partner identifier
      - `name` (text, required) - Partner organization name
      - `region` (text) - Geographic region
      - `country` (text) - Country location
      - `email` (text) - Contact email
      - `phone` (text) - Contact phone number
      - `clickup_link` (text) - Link to ClickUp project
      - `notes` (text) - Additional notes
      - `pss_orange_owner` (text) - PSS Orange owner name
      - `partner_owner` (text) - Partner owner name
      - `owner_id` (uuid) - User ID of the record owner
      - `created_at` (timestamptz) - Record creation timestamp
      - `updated_at` (timestamptz) - Last update timestamp
  
  2. Security
    - Enable RLS on `partners` table
    - Add policy for authenticated users to perform all operations
  
  3. Notes
    - Supports seed script requirements with pss_orange_owner and partner_owner fields
    - Includes owner_id for future RLS refinement
    - NOTIFY command refreshes Supabase API cache to prevent schema cache errors
*/

-- Create the Partners table
CREATE TABLE IF NOT EXISTS partners (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    name text NOT NULL,
    region text,
    country text,
    email text,
    phone text,
    clickup_link text,
    notes text,
    
    -- Specific fields required by Seed Script
    pss_orange_owner text, 
    partner_owner text,
    
    owner_id uuid,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE partners ENABLE ROW LEVEL SECURITY;

-- Allow full access for authenticated users
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON partners;
CREATE POLICY "Enable all access for authenticated users" ON partners
    FOR ALL
    USING (auth.role() = 'authenticated');

-- Refresh the API cache to prevent "table not in schema cache" errors
NOTIFY pgrst, 'reload config';