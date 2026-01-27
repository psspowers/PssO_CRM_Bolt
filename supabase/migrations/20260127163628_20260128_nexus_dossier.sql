/*
  # Nexus Dossier Intelligence System

  1. Schema Changes
    - Add intelligence_dossier field to store AI-generated profiles
    - Add personality_type categorization (5 types)
    - Add last_dossier_update timestamp for tracking

  2. Purpose
    - Transform Nexus contacts into intelligence targets
    - Store comprehensive AI-generated profiles
    - Track personality types for strategic engagement
    - Enable "War Room" intelligence gathering

  3. Security
    - Inherits existing RLS policies from contacts table
*/

-- Add intelligence fields to contacts
ALTER TABLE contacts
ADD COLUMN IF NOT EXISTS intelligence_dossier TEXT,
ADD COLUMN IF NOT EXISTS personality_type TEXT CHECK (personality_type IN ('Visionary', 'Analytical', 'Skeptic', 'Driver', 'Supporter')),
ADD COLUMN IF NOT EXISTS last_dossier_update TIMESTAMPTZ;

-- Create index for finding contacts with dossiers
CREATE INDEX IF NOT EXISTS idx_contacts_has_dossier ON contacts(last_dossier_update) WHERE intelligence_dossier IS NOT NULL;

-- Create index for personality type filtering
CREATE INDEX IF NOT EXISTS idx_contacts_personality ON contacts(personality_type) WHERE personality_type IS NOT NULL;
