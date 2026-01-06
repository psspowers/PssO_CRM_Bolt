/*
  # Create Session Tracking System

  1. New Tables
    - `session_events`
      - Tracks all session lifecycle events (login, logout, timeout, extend)
      - Records logout reasons (automatic vs manual, timeout, forced, error)
      - Links to user and captures device/browser info
  
  2. Purpose
    - Diagnose automatic logout issues
    - Track session duration patterns
    - Identify users experiencing frequent disconnections
    - Provide audit trail for security

  3. Security
    - Enable RLS on session_events table
    - Allow users to view their own session history
    - Allow admins to view all session events
*/

-- Create session events tracking table
CREATE TABLE IF NOT EXISTS session_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  email text,
  event_type text NOT NULL CHECK (event_type IN ('login', 'logout', 'timeout', 'extend_session', 'forced_logout', 'auto_logout')),
  logout_reason text,
  session_duration_seconds integer,
  remember_me boolean DEFAULT false,
  device_type text,
  browser text,
  os text,
  user_agent text,
  ip_address text,
  created_at timestamptz DEFAULT now()
);

-- Add index for querying by user and time
CREATE INDEX IF NOT EXISTS idx_session_events_user_id ON session_events(user_id);
CREATE INDEX IF NOT EXISTS idx_session_events_email ON session_events(email);
CREATE INDEX IF NOT EXISTS idx_session_events_created_at ON session_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_session_events_event_type ON session_events(event_type);

-- Enable RLS
ALTER TABLE session_events ENABLE ROW LEVEL SECURITY;

-- Users can view their own session events
CREATE POLICY "Users can view own session events"
  ON session_events
  FOR SELECT
  TO authenticated
  USING (
    auth.uid()::text = user_id::text 
    OR email = (SELECT email FROM auth.users WHERE id = auth.uid())
  );

-- Admins and super_admins can view all session events
CREATE POLICY "Admins can view all session events"
  ON session_events
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM crm_users 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'super_admin')
    )
  );

-- Service role can insert session events (for edge functions)
CREATE POLICY "Service can insert session events"
  ON session_events
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Create a view for session analytics
CREATE OR REPLACE VIEW session_analytics AS
SELECT
  DATE_TRUNC('day', created_at) as date,
  event_type,
  COUNT(*) as event_count,
  COUNT(DISTINCT user_id) as unique_users,
  AVG(session_duration_seconds) FILTER (WHERE event_type IN ('logout', 'timeout', 'auto_logout')) as avg_session_duration_seconds,
  COUNT(*) FILTER (WHERE event_type = 'auto_logout') as auto_logout_count,
  COUNT(*) FILTER (WHERE event_type = 'timeout') as timeout_count,
  COUNT(*) FILTER (WHERE event_type = 'logout') as manual_logout_count
FROM session_events
GROUP BY DATE_TRUNC('day', created_at), event_type
ORDER BY date DESC, event_type;

-- Grant select on view to authenticated users
GRANT SELECT ON session_analytics TO authenticated;
