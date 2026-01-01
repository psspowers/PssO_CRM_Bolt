/*
  # Add Organization Columns to Contacts
  
  1. Changes
    - Add `organization_id` (uuid) to contacts table
    - Add `organization_type` (text) to contacts table
  
  2. Purpose
    - Support linking contacts to organizations
    - Enable seed script to populate organization relationships
    - Track what type of organization (partner, account, etc.)
  
  3. Notes
    - Safe to run multiple times (uses IF NOT EXISTS)
    - Refreshes API cache after changes
*/

-- Add missing columns to CONTACTS to match Seed Script
ALTER TABLE contacts 
ADD COLUMN IF NOT EXISTS organization_id uuid;

ALTER TABLE contacts 
ADD COLUMN IF NOT EXISTS organization_type text;

-- CRITICAL: Refresh the API Cache
NOTIFY pgrst, 'reload config';