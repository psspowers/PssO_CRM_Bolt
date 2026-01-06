/*
  # Create User-Entity Connections for Nexus Feature

  1. New Tables
    - `user_entity_connections`
      - Stores personal connections between CRM users and entities (contacts/accounts)
      - Tracks "I know this person/company" relationships
      - Enables Nexus pathfinding visualization
  
  2. New Functions
    - `find_nexus_paths(target_entity_id, target_entity_type, start_user_id)`
      - Returns connection paths from a user to a target entity
      - Finds both direct and indirect (through teammates) connections
  
  3. Security
    - Enable RLS on user_entity_connections table
    - Users can manage their own connections
    - Users can view teammate connections for collaboration
*/

-- Create user_entity_connections table
CREATE TABLE IF NOT EXISTS user_entity_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES crm_users(id) ON DELETE CASCADE,
  entity_id uuid NOT NULL,
  entity_type text NOT NULL CHECK (entity_type IN ('Contact', 'Account')),
  relationship_type text NOT NULL CHECK (relationship_type IN (
    'Knows', 'Worked With', 'Alumni', 'Family', 'Board Member', 
    'Advisor', 'Banker', 'Introduced By', 'Friend', 'Other'
  )),
  strength int NOT NULL CHECK (strength >= 1 AND strength <= 5) DEFAULT 3,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE user_entity_connections ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own connections"
  ON user_entity_connections FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can view teammate connections"
  ON user_entity_connections FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM crm_users
      WHERE id = auth.uid()
      AND role IN ('admin', 'super_admin', 'internal')
    )
  );

CREATE POLICY "Users can create own connections"
  ON user_entity_connections FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own connections"
  ON user_entity_connections FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own connections"
  ON user_entity_connections FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_entity_connections_user_id 
  ON user_entity_connections(user_id);
CREATE INDEX IF NOT EXISTS idx_user_entity_connections_entity 
  ON user_entity_connections(entity_id, entity_type);

-- Create the Nexus pathfinding function
CREATE OR REPLACE FUNCTION find_nexus_paths(
  target_entity_id uuid,
  target_entity_type text,
  start_user_id uuid
)
RETURNS TABLE (
  path_id int,
  hop_number int,
  connector_user_id uuid,
  connector_name text,
  connector_avatar text,
  relationship_type text,
  strength int,
  notes text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Find direct connections (1-hop): Current user -> Target entity
  RETURN QUERY
  SELECT
    1 as path_id,
    1 as hop_number,
    uec.user_id as connector_user_id,
    u.name as connector_name,
    u.avatar as connector_avatar,
    uec.relationship_type,
    uec.strength,
    uec.notes
  FROM user_entity_connections uec
  JOIN crm_users u ON uec.user_id = u.id
  WHERE uec.entity_id = target_entity_id
    AND uec.entity_type = target_entity_type
    AND uec.user_id = start_user_id
  ORDER BY uec.strength DESC;

  -- Find 2-hop connections: Current user -> Teammate -> Target entity
  RETURN QUERY
  SELECT
    2 as path_id,
    1 as hop_number,
    uec2.user_id as connector_user_id,
    u2.name as connector_name,
    u2.avatar as connector_avatar,
    uec2.relationship_type,
    uec2.strength,
    uec2.notes
  FROM user_entity_connections uec2
  JOIN crm_users u2 ON uec2.user_id = u2.id
  WHERE uec2.entity_id = target_entity_id
    AND uec2.entity_type = target_entity_type
    AND uec2.user_id != start_user_id
    AND EXISTS (
      SELECT 1 FROM user_hierarchy uh
      WHERE (uh.manager_id = start_user_id AND uh.subordinate_id = uec2.user_id)
         OR (uh.subordinate_id = start_user_id AND uh.manager_id = uec2.user_id)
    )
  ORDER BY uec2.strength DESC
  LIMIT 10;
END;
$$;