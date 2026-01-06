/*
  # Nexus ROI Upgrade - Operation v1.5

  1. New Features
    - Adds verification flag to entity relationships for quality control
    - Creates connector leaderboard view for gamification
    - Upgrades pathfinding engine with ROI calculation (win probability)

  2. Changes
    - `entity_relationships` table: New `verified` boolean column
    - New view: `connector_leaderboard` for tracking user connection counts
    - Enhanced function: `find_nexus_paths` with win probability metric

  3. Security
    - Grants SELECT permission on leaderboard view to authenticated users
    - Function uses SECURITY DEFINER for consistent access
*/

-- 1. Add Verification Flag to table
ALTER TABLE entity_relationships ADD COLUMN IF NOT EXISTS verified boolean DEFAULT false;

-- 2. Create Leaderboard View (For Gamification)
CREATE OR REPLACE VIEW connector_leaderboard AS
SELECT created_by as user_id, COUNT(*) as connection_count
FROM entity_relationships
GROUP BY created_by;

GRANT SELECT ON connector_leaderboard TO authenticated;

-- 3. Upgrade the Pathfinding Engine (With ROI Math)
DROP FUNCTION IF EXISTS find_nexus_paths;

CREATE OR REPLACE FUNCTION find_nexus_paths(
  start_user_id uuid,
  target_entity_id uuid,
  max_depth int DEFAULT 3
)
RETURNS TABLE (
  path_nodes jsonb[], -- Array of node objects for UI
  depth int,
  total_strength int,
  win_probability int -- The new ROI metric (0-100%)
) AS $$
WITH RECURSIVE search_graph (
  last_id,
  path_ids,
  path_nodes,
  current_depth,
  total_strength
) AS (
  -- Base Case: Direct Connections from Start User
  SELECT
    to_entity_id,
    ARRAY[from_entity_id, to_entity_id],
    ARRAY[
      jsonb_build_object('id', from_entity_id, 'type', from_entity_type), -- Start Node
      jsonb_build_object('id', to_entity_id, 'type', to_entity_type, 'strength', strength, 'rel', relationship_type) -- Next Node
    ],
    1,
    strength
  FROM entity_relationships
  WHERE from_entity_id = start_user_id

  UNION ALL

  -- Recursive Step
  SELECT
    e.to_entity_id,
    sg.path_ids || e.to_entity_id,
    sg.path_nodes || jsonb_build_object('id', e.to_entity_id, 'type', e.to_entity_type, 'strength', e.strength, 'rel', e.relationship_type),
    sg.current_depth + 1,
    sg.total_strength + e.strength
  FROM entity_relationships e
  JOIN search_graph sg ON e.from_entity_id = sg.last_id
  WHERE sg.current_depth < max_depth
    AND NOT (e.to_entity_id = ANY(sg.path_ids)) -- Prevent cycles
)
SELECT
  path_nodes,
  current_depth,
  total_strength,
  -- Logic: Calculate Win Probability based on Average Path Strength
  -- Formula: (Total Strength / Depth) / 5 * 100
  ((total_strength::numeric / current_depth) / 5.0 * 100)::int as win_probability
FROM search_graph
WHERE last_id = target_entity_id
ORDER BY total_strength DESC
LIMIT 5;
$$ LANGUAGE sql SECURITY DEFINER;