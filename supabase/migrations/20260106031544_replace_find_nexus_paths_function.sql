/*
  # Replace find_nexus_paths RPC Function

  ## Summary
  Replaces the existing find_nexus_paths function with an updated version that supports
  recursive pathfinding through the relationships table.

  ## Purpose
  Enables the Nexus feature to discover and visualize degrees of separation between users and 
  their network contacts, showing how people are connected through intermediaries.

  ## Changes
  - Drops old version that used user_entity_connections table
  - Creates new version that uses relationships table for graph traversal
  - Supports multi-hop recursive pathfinding
  - Returns JSONB array of path objects

  ## Details
  
  1. Function: find_nexus_paths
    - Parameters:
      - start_user_id: UUID of the starting user (your profile/contact)
      - target_entity_id: UUID of the target entity (the person/org you want to reach)
      - max_depth: Maximum degrees of separation to search (default 4)
    - Returns: JSONB array of path objects containing:
      - path: Array of nodes representing each hop in the connection
      - total_strength: Aggregate strength score of the path
      - degrees: Number of hops/degrees of separation
  
  2. Algorithm:
    - Uses recursive CTE (Common Table Expression) to traverse the relationships graph
    - Starts from the user's direct connections
    - Recursively follows relationships up to specified degrees deep
    - Prevents cycles by tracking visited entities
    - Calculates path strength and sorts by strongest connections first
  
  3. Security:
    - Function executes with invoker's permissions
    - Respects existing RLS policies on relationships table
*/

DROP FUNCTION IF EXISTS find_nexus_paths(uuid, text, uuid);

CREATE OR REPLACE FUNCTION find_nexus_paths(
  start_user_id uuid,
  target_entity_id uuid,
  max_depth int DEFAULT 4
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  result jsonb;
BEGIN
  WITH RECURSIVE path_search AS (
    SELECT 
      r.from_entity_id,
      r.from_entity_type,
      r.to_entity_id,
      r.to_entity_type,
      r.type as relationship_type,
      r.strength,
      1 as depth,
      ARRAY[r.from_entity_id] as visited,
      jsonb_build_array(
        jsonb_build_object(
          'entity_id', r.from_entity_id,
          'entity_type', r.from_entity_type,
          'entity_name', COALESCE(
            (SELECT full_name FROM contacts WHERE id = r.from_entity_id),
            (SELECT name FROM partners WHERE id = r.from_entity_id),
            'Unknown'
          ),
          'relationship_type', r.type,
          'strength', r.strength
        ),
        jsonb_build_object(
          'entity_id', r.to_entity_id,
          'entity_type', r.to_entity_type,
          'entity_name', COALESCE(
            (SELECT full_name FROM contacts WHERE id = r.to_entity_id),
            (SELECT name FROM partners WHERE id = r.to_entity_id),
            (SELECT name FROM accounts WHERE id = r.to_entity_id),
            'Unknown'
          )
        )
      ) as path,
      CASE 
        WHEN r.strength = 'Weak' THEN 1
        WHEN r.strength = 'Medium' THEN 3
        WHEN r.strength = 'Strong' THEN 5
        ELSE COALESCE(r.strength::int, 3)
      END as strength_value
    FROM relationships r
    WHERE r.from_entity_id = start_user_id
    
    UNION ALL
    
    SELECT 
      r.from_entity_id,
      r.from_entity_type,
      r.to_entity_id,
      r.to_entity_type,
      r.type as relationship_type,
      r.strength,
      ps.depth + 1,
      ps.visited || r.from_entity_id,
      ps.path || jsonb_build_object(
        'entity_id', r.to_entity_id,
        'entity_type', r.to_entity_type,
        'entity_name', COALESCE(
          (SELECT full_name FROM contacts WHERE id = r.to_entity_id),
          (SELECT name FROM partners WHERE id = r.to_entity_id),
          (SELECT name FROM accounts WHERE id = r.to_entity_id),
          'Unknown'
        ),
        'relationship_type', r.type,
        'strength', r.strength
      ),
      ps.strength_value + CASE 
        WHEN r.strength = 'Weak' THEN 1
        WHEN r.strength = 'Medium' THEN 3
        WHEN r.strength = 'Strong' THEN 5
        ELSE COALESCE(r.strength::int, 3)
      END
    FROM relationships r
    INNER JOIN path_search ps ON ps.to_entity_id = r.from_entity_id
    WHERE 
      ps.depth < max_depth
      AND r.from_entity_id <> ALL(ps.visited)
      AND r.to_entity_id NOT IN (SELECT unnest(ps.visited))
  )
  SELECT jsonb_agg(
    jsonb_build_object(
      'path', path,
      'degrees', depth,
      'total_strength', LEAST(strength_value / depth, 5)
    )
    ORDER BY depth ASC, strength_value DESC
  )
  INTO result
  FROM path_search
  WHERE to_entity_id = target_entity_id;
  
  RETURN COALESCE(result, '[]'::jsonb);
END;
$$;

COMMENT ON FUNCTION find_nexus_paths(uuid, uuid, int) IS 'Finds connection paths between a user and target entity through the relationship graph, supporting multi-hop pathfinding up to specified depth';
