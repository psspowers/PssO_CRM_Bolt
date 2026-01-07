/*
  # Nexus Team-Wide Search Upgrade

  ## Overview
  Upgrades the Nexus system to show connections from ANY internal team member to a target entity.
  
  ## Changes
  
  1. New Function: `find_team_nexus_paths`
     - Searches from ALL internal users (super_admin, admin, internal roles)
     - Returns top 5 connection paths across the entire team
     - Same output structure as `find_nexus_paths`
  
  ## Function Details
  
  - **Input**: 
    - `target_entity_id` (uuid): The entity to find connections to
    - `max_depth` (integer, default 3): Maximum relationship hops
  
  - **Output**:
    - `path` (json): Array of entities and relationships in the path
    - `degrees` (integer): Number of hops in the path
    - `total_strength` (integer): Cumulative strength score
    - `win_probability` (integer): Success likelihood percentage
  
  ## Security
  - Uses SECURITY DEFINER to access all team relationships
  - Restricted search path for security
  - Only searches from authenticated internal users
*/

CREATE OR REPLACE FUNCTION find_team_nexus_paths(
  target_entity_id uuid, 
  max_depth integer DEFAULT 3
)
RETURNS TABLE(
  path json, 
  degrees integer, 
  total_strength integer, 
  win_probability integer
)
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
WITH RECURSIVE internal_users AS (
  SELECT id 
  FROM crm_users 
  WHERE role IN ('super_admin', 'admin', 'internal')
    AND is_active = true
),
search_graph (
  last_id,
  path_ids,
  path_objects,
  current_depth,
  total_strength
) AS (
  SELECT
    r.to_entity_id,
    ARRAY[r.from_entity_id, r.to_entity_id],
    ARRAY[
      jsonb_build_object(
        'entity_id', r.from_entity_id,
        'entity_type', r.from_entity_type,
        'entity_name', (SELECT name FROM crm_users WHERE id = r.from_entity_id)
      ),
      jsonb_build_object(
        'entity_id', r.to_entity_id,
        'entity_type', r.to_entity_type,
        'relationship', r.type,
        'strength', CASE r.strength WHEN 'Strong' THEN 5 WHEN 'Medium' THEN 3 WHEN 'Weak' THEN 1 ELSE 3 END,
        'entity_name', CASE
          WHEN r.to_entity_type = 'Contact' THEN (SELECT full_name FROM contacts WHERE id = r.to_entity_id)
          WHEN r.to_entity_type = 'Account' THEN (SELECT name FROM accounts WHERE id = r.to_entity_id)
          WHEN r.to_entity_type = 'Partner' THEN (SELECT name FROM partners WHERE id = r.to_entity_id)
          WHEN r.to_entity_type = 'User' THEN (SELECT name FROM crm_users WHERE id = r.to_entity_id)
          ELSE 'Unknown'
        END
      )
    ],
    1,
    CASE r.strength WHEN 'Strong' THEN 5 WHEN 'Medium' THEN 3 WHEN 'Weak' THEN 1 ELSE 3 END
  FROM relationships r
  INNER JOIN internal_users iu ON r.from_entity_id = iu.id
  WHERE r.from_entity_type = 'User'

  UNION ALL

  SELECT
    next_node.entity_id,
    sg.path_ids || next_node.entity_id,
    sg.path_objects || jsonb_build_object(
      'entity_id', next_node.entity_id,
      'entity_type', next_node.entity_type,
      'relationship', next_node.relationship_type,
      'strength', next_node.strength_value,
      'entity_name', next_node.entity_name
    ),
    sg.current_depth + 1,
    sg.total_strength + next_node.strength_value
  FROM search_graph sg
  CROSS JOIN LATERAL (
    SELECT
      r.to_entity_id as entity_id,
      r.to_entity_type as entity_type,
      r.type as relationship_type,
      CASE r.strength WHEN 'Strong' THEN 5 WHEN 'Medium' THEN 3 WHEN 'Weak' THEN 1 ELSE 3 END as strength_value,
      CASE
        WHEN r.to_entity_type = 'Contact' THEN (SELECT full_name FROM contacts WHERE id = r.to_entity_id)
        WHEN r.to_entity_type = 'Account' THEN (SELECT name FROM accounts WHERE id = r.to_entity_id)
        WHEN r.to_entity_type = 'Partner' THEN (SELECT name FROM partners WHERE id = r.to_entity_id)
        WHEN r.to_entity_type = 'User' THEN (SELECT name FROM crm_users WHERE id = r.to_entity_id)
        ELSE 'Unknown'
      END as entity_name
    FROM relationships r
    WHERE r.from_entity_id = sg.last_id
      AND NOT (r.to_entity_id = ANY(sg.path_ids))

    UNION ALL

    SELECT
      r.from_entity_id as entity_id,
      r.from_entity_type as entity_type,
      r.type || ' (via)' as relationship_type,
      CASE r.strength WHEN 'Strong' THEN 5 WHEN 'Medium' THEN 3 WHEN 'Weak' THEN 1 ELSE 3 END as strength_value,
      CASE
        WHEN r.from_entity_type = 'Contact' THEN (SELECT full_name FROM contacts WHERE id = r.from_entity_id)
        WHEN r.from_entity_type = 'Account' THEN (SELECT name FROM accounts WHERE id = r.from_entity_id)
        WHEN r.from_entity_type = 'Partner' THEN (SELECT name FROM partners WHERE id = r.from_entity_id)
        WHEN r.from_entity_type = 'User' THEN (SELECT name FROM crm_users WHERE id = r.from_entity_id)
        ELSE 'Unknown'
      END as entity_name
    FROM relationships r
    WHERE r.to_entity_id = sg.last_id
      AND NOT (r.from_entity_id = ANY(sg.path_ids))
  ) next_node
  WHERE sg.current_depth < max_depth
)
SELECT
  array_to_json(path_objects) as path,
  current_depth as degrees,
  total_strength,
  ((total_strength::numeric / current_depth) / 5.0 * 100)::int as win_probability
FROM search_graph
WHERE last_id = target_entity_id
ORDER BY current_depth ASC, total_strength DESC
LIMIT 5;
$$;