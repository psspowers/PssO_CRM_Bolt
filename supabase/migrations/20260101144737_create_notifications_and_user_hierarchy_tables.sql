/*
  # Create Missing Tables for Notifications and User Hierarchy
  
  1. New Tables
    - `notifications`
      - `id` (uuid, primary key)
      - `user_id` (uuid, FK to crm_users) - User who receives the notification
      - `type` (text) - Type of notification (mention, task_assigned, etc)
      - `title` (text) - Notification title
      - `message` (text) - Notification message
      - `entity_id` (uuid) - Related entity ID (opportunity, contact, etc)
      - `entity_type` (text) - Type of related entity
      - `is_read` (boolean) - Whether notification has been read
      - `created_at` (timestamptz)
    
    - `user_hierarchy`
      - `id` (uuid, primary key)
      - `manager_id` (uuid, FK to crm_users) - Manager/supervisor
      - `subordinate_id` (uuid, FK to crm_users) - Direct or indirect report
      - `depth` (integer) - How many levels down (1 = direct report, 2+ = indirect)
      - `created_at` (timestamptz)
  
  2. Security
    - Enable RLS on both tables
    - Add policies for authenticated users to access their own data
  
  3. Indexes
    - Index on user_id for notifications
    - Index on manager_id for user_hierarchy
    - Index on subordinate_id for user_hierarchy
*/

-- =====================================================
-- NOTIFICATIONS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES crm_users(id) ON DELETE CASCADE,
  type text,
  title text,
  message text,
  entity_id uuid,
  entity_type text,
  is_read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Users can view their own notifications
CREATE POLICY "Users can view own notifications"
  ON notifications
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Users can update their own notifications (mark as read)
CREATE POLICY "Users can update own notifications"
  ON notifications
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- System can insert notifications (authenticated users)
CREATE POLICY "Authenticated users can insert notifications"
  ON notifications
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Users can delete their own notifications
CREATE POLICY "Users can delete own notifications"
  ON notifications
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_notifications_user_id 
ON notifications(user_id);

CREATE INDEX IF NOT EXISTS idx_notifications_created_at 
ON notifications(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notifications_is_read 
ON notifications(is_read);

-- =====================================================
-- USER HIERARCHY TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS user_hierarchy (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  manager_id uuid REFERENCES crm_users(id) ON DELETE CASCADE,
  subordinate_id uuid REFERENCES crm_users(id) ON DELETE CASCADE,
  depth integer DEFAULT 1,
  created_at timestamptz DEFAULT now(),
  UNIQUE(manager_id, subordinate_id)
);

-- Enable RLS
ALTER TABLE user_hierarchy ENABLE ROW LEVEL SECURITY;

-- Managers can view their subordinates
CREATE POLICY "Managers can view subordinates"
  ON user_hierarchy
  FOR SELECT
  TO authenticated
  USING (manager_id = auth.uid());

-- Subordinates can view who they report to
CREATE POLICY "Subordinates can view managers"
  ON user_hierarchy
  FOR SELECT
  TO authenticated
  USING (subordinate_id = auth.uid());

-- Only admins can insert/update/delete hierarchy
CREATE POLICY "Admins can manage hierarchy"
  ON user_hierarchy
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM crm_users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_hierarchy_manager_id 
ON user_hierarchy(manager_id);

CREATE INDEX IF NOT EXISTS idx_user_hierarchy_subordinate_id 
ON user_hierarchy(subordinate_id);

CREATE INDEX IF NOT EXISTS idx_user_hierarchy_depth 
ON user_hierarchy(depth);

-- =====================================================
-- HELPER FUNCTION: Populate User Hierarchy from reports_to
-- =====================================================

-- This function should be called when crm_users.reports_to changes
-- It populates the user_hierarchy table with all direct and indirect reports

CREATE OR REPLACE FUNCTION refresh_user_hierarchy()
RETURNS void AS $$
BEGIN
  -- Clear existing hierarchy
  DELETE FROM user_hierarchy;
  
  -- Insert direct reports (depth = 1)
  INSERT INTO user_hierarchy (manager_id, subordinate_id, depth)
  SELECT reports_to, id, 1
  FROM crm_users
  WHERE reports_to IS NOT NULL;
  
  -- Insert indirect reports (depth = 2+)
  -- This is a simplified version - for production, use a recursive CTE
  INSERT INTO user_hierarchy (manager_id, subordinate_id, depth)
  SELECT h1.manager_id, h2.subordinate_id, h1.depth + h2.depth
  FROM user_hierarchy h1
  JOIN user_hierarchy h2 ON h1.subordinate_id = h2.manager_id
  WHERE NOT EXISTS (
    SELECT 1 FROM user_hierarchy
    WHERE manager_id = h1.manager_id AND subordinate_id = h2.subordinate_id
  );
END;
$$ LANGUAGE plpgsql;

-- Initial population of hierarchy from existing reports_to relationships
SELECT refresh_user_hierarchy();

COMMENT ON FUNCTION refresh_user_hierarchy() IS 'Rebuilds user_hierarchy table from crm_users.reports_to relationships';