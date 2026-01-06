/*
  # Fix Nexus Path Array Serialization

  1. Issue
    - The `path` field uses `to_jsonb(path_objects)` which may not deserialize correctly
    - Need to return the array directly for proper JSON serialization

  2. Solution
    - Change return type from `jsonb` to `json`
    - Remove `to_jsonb()` wrapper and let PostgreSQL serialize the array directly
    - Use `array_to_json()` to ensure proper serialization

  3. Security
    - Maintains SECURITY DEFINER for data access
*/

DROP FUNCTION IF EXISTS find_nexus_paths(uuid, uuid, int);

CREATE OR REPLACE FUNCTION find_nexus_paths(
  start_user_id uuid,
  target_entity_id uuid,
  max_depth int DEFAULT 3
)
RETURNS TABLE (
  path json,           -- Changed from jsonb to json for better serialization
  degrees int,
  total_strength int,
  win_probability int
) AS $$
WITH RECURSIVE search_graph (
  last_id,
  path_ids,
  path_objects,
  current_depth,
  total_strength
) AS (
  -- Base Case: Direct Connections
  SELECT
    to_entity_id,
    ARRAY[from_entity_id, to_entity_id],
    ARRAY[
      jsonb_build_object(
        'entity_id', from_entity_id,
        'entity_type', from_entity_type,
        'entity_name', (SELECT name FROM crm_users WHERE id = from_entity_id)
      ),
      jsonb_build_object(
        'entity_id', to_entity_id,
        'entity_type', to_entity_type,
        'relationship', type,
        'strength', CASE strength WHEN 'Strong' THEN 5 WHEN 'Medium' THEN 3 WHEN 'Weak' THEN 1 ELSE 3 END,
        'entity_name', CASE
          WHEN to_entity_type = 'Contact' THEN (SELECT full_name FROM contacts WHERE id = to_entity_id)
          WHEN to_entity_type = 'Account' THEN (SELECT name FROM accounts WHERE id = to_entity_id)
          WHEN to_entity_type = 'Partner' THEN (SELECT name FROM partners WHERE id = to_entity_id)
          WHEN to_entity_type = 'User' THEN (SELECT name FROM crm_users WHERE id = to_entity_id)
          ELSE 'Unknown'
        END
      )
    ],
    1,
    CASE strength WHEN 'Strong' THEN 5 WHEN 'Medium' THEN 3 WHEN 'Weak' THEN 1 ELSE 3 END
  FROM relationships
  WHERE from_entity_id = start_user_id

  UNION ALL

  -- Recursive Step
  SELECT
    e.to_entity_id,
    sg.path_ids || e.to_entity_id,
    sg.path_objects || jsonb_build_object(
      'entity_id', e.to_entity_id,
      'entity_type', e.to_entity_type,
      'relationship', e.type,
      'strength', CASE e.strength WHEN 'Strong' THEN 5 WHEN 'Medium' THEN 3 WHEN 'Weak' THEN 1 ELSE 3 END,
      'entity_name', CASE
          WHEN e.to_entity_type = 'Contact' THEN (SELECT full_name FROM contacts WHERE id = e.to_entity_id)
          WHEN e.to_entity_type = 'Account' THEN (SELECT name FROM accounts WHERE id = e.to_entity_id)
          WHEN e.to_entity_type = 'Partner' THEN (SELECT name FROM partners WHERE id = e.to_entity_id)
          WHEN e.to_entity_type = 'User' THEN (SELECT name FROM crm_users WHERE id = e.to_entity_id)
          ELSE 'Unknown'
        END
    ),
    sg.current_depth + 1,
    sg.total_strength + CASE e.strength WHEN 'Strong' THEN 5 WHEN 'Medium' THEN 3 WHEN 'Weak' THEN 1 ELSE 3 END
  FROM relationships e
  JOIN search_graph sg ON e.from_entity_id = sg.last_id
  WHERE sg.current_depth < max_depth
    AND NOT (e.to_entity_id = ANY(sg.path_ids))
)
SELECT
  array_to_json(path_objects) as path,  -- Use array_to_json instead of to_jsonb
  current_depth as degrees,
  total_strength,
  ((total_strength::numeric / current_depth) / 5.0 * 100)::int as win_probability
FROM search_graph
WHERE last_id = target_entity_id
ORDER BY total_strength DESC
LIMIT 5;
$$ LANGUAGE sql SECURITY DEFINER;
