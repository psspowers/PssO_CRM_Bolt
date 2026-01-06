/*
  # Fix Nexus Bidirectional Relationship Traversal

  1. Problem
    - Current function only follows OUTGOING relationships (where from_entity_id = last_node)
    - Misses paths through INCOMING relationships (where to_entity_id = last_node)
    - Example: Sam → Li Wei, Li Wei → Somchai
      Should find: Sam → Li Wei → Somchai (2 degrees)

  2. Solution
    - Use UNION in the recursive step to traverse BOTH directions
    - Outgoing: from_entity_id = current node → use to_entity_id as next
    - Incoming: to_entity_id = current node → use from_entity_id as next
    - This creates true bidirectional graph traversal

  3. Security
    - Maintains SECURITY DEFINER
*/

DROP FUNCTION IF EXISTS find_nexus_paths(uuid, uuid, int);

CREATE OR REPLACE FUNCTION find_nexus_paths(
  start_user_id uuid,
  target_entity_id uuid,
  max_depth int DEFAULT 3
)
RETURNS TABLE (
  path json,
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
  -- Base Case: Direct Connections from start user
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

  -- Recursive Step: Bidirectional traversal
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
    -- Outgoing relationships: from current node
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

    -- Incoming relationships: to current node
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
ORDER BY total_strength DESC
LIMIT 5;
$$ LANGUAGE sql SECURITY DEFINER;