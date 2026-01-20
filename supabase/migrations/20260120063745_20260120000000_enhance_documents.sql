/*
  # Enhance Documents System for VDR

  1. New Columns
    - `media_files.is_starred` (boolean) - Star/importance flag for document prioritization
    - `media_files.description` (text) - Optional notes/description for each document

  2. Changes
    - Add is_starred column with default false
    - Add description column for document metadata
    - Both columns are nullable and safe to add to existing data

  3. Security
    - No RLS changes needed (inherits existing media_files policies)
*/

-- Add is_starred column for document prioritization
ALTER TABLE media_files 
ADD COLUMN IF NOT EXISTS is_starred boolean DEFAULT false;

-- Add description column for document notes
ALTER TABLE media_files 
ADD COLUMN IF NOT EXISTS description text;