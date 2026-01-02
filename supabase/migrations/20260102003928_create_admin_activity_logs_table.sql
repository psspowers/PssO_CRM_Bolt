/*
  # Create Admin Activity Logs Table

  1. New Tables
    - `admin_activity_logs`
      - `id` (uuid, primary key) - Unique identifier for each log entry
      - `user_id` (uuid) - ID of the user who performed the action
      - `user_email` (text) - Email of the user for easier reading
      - `action` (text) - Type of action performed (e.g., 'UPDATE', 'INSERT')
      - `entity_type` (text) - Type of entity changed (e.g., 'opportunity', 'account')
      - `entity_id` (uuid) - ID of the entity that was changed
      - `details` (jsonb) - Detailed information about what changed (old/new values)
      - `created_at` (timestamptz) - Timestamp of when the action occurred

  2. Security
    - Enable RLS on `admin_activity_logs` table
    - Add policy for admins to view all logs
    - Add policy for system to insert logs (allows triggers to write without permission errors)

  3. Important Notes
    - The insert policy allows system-level operations (triggers) to write logs
    - This prevents crashes when normal users save data and triggers attempt to log
    - Only admins can read the logs for audit purposes
*/

-- 1. Create the missing Audit Log table
CREATE TABLE IF NOT EXISTS admin_activity_logs (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid,          -- Who did it
    user_email text,       -- Email for easier reading
    action text,           -- e.g., 'UPDATE', 'INSERT'
    entity_type text,      -- e.g., 'opportunity', 'account'
    entity_id uuid,        -- The ID of the thing changed
    details jsonb,         -- What changed (old/new values)
    created_at timestamptz DEFAULT now()
);

-- 2. Enable Security
ALTER TABLE admin_activity_logs ENABLE ROW LEVEL SECURITY;

-- 3. Allow Admins to View Logs
CREATE POLICY "Admins can view logs" ON admin_activity_logs
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM crm_users 
    WHERE id = auth.uid() AND role = 'admin'
  )
);

-- 4. Allow Everyone (System) to Insert Logs
-- This is critical so the triggers don't crash when a normal user saves something
CREATE POLICY "System can insert logs" ON admin_activity_logs
FOR INSERT
TO authenticated
WITH CHECK (true);

-- 5. Refresh Cache
NOTIFY pgrst, 'reload config';