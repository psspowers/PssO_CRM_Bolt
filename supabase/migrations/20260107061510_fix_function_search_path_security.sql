/*
  # Fix Function Search Path Security

  Add explicit search_path to all SECURITY DEFINER functions
  to prevent search_path hijacking attacks.
*/

-- ============================================================================
-- get_mw_hustle function
-- ============================================================================

CREATE OR REPLACE FUNCTION get_mw_hustle(
  start_date timestamp with time zone,
  end_date timestamp with time zone,
  user_id_filter uuid DEFAULT NULL
)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  total_moved numeric;
BEGIN
  SELECT COALESCE(SUM(mw_volume), 0)
  INTO total_moved
  FROM opportunity_stage_history h
  LEFT JOIN opportunities o ON h.opportunity_id = o.id
  WHERE h.created_at >= start_date 
    AND h.created_at <= end_date
    AND h.old_stage IS NOT NULL 
    AND (user_id_filter IS NULL OR o.owner_id = user_id_filter);
  
  RETURN total_moved;
END;
$$;

-- ============================================================================
-- log_stage_change trigger function
-- ============================================================================

CREATE OR REPLACE FUNCTION log_stage_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF (TG_OP = 'INSERT') OR (OLD.stage IS DISTINCT FROM NEW.stage) THEN
    INSERT INTO opportunity_stage_history (
      opportunity_id,
      user_id,
      old_stage,
      new_stage,
      mw_volume
    ) VALUES (
      NEW.id,
      (SELECT id FROM crm_users WHERE id = auth.uid()), 
      CASE WHEN TG_OP = 'INSERT' THEN NULL ELSE OLD.stage END,
      NEW.stage,
      COALESCE(NEW.target_capacity, 0)
    );
  END IF;
  RETURN NEW;
END;
$$;

-- ============================================================================
-- calculate_relationship_strength function (returns integer, not text)
-- ============================================================================

CREATE OR REPLACE FUNCTION calculate_relationship_strength(rel_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  interaction_count integer;
  recent_interaction_count integer;
  calculated_strength integer;
BEGIN
  SELECT COUNT(*) INTO interaction_count
  FROM relationship_interaction_log
  WHERE relationship_id = rel_id;
  
  SELECT COUNT(*) INTO recent_interaction_count
  FROM relationship_interaction_log
  WHERE relationship_id = rel_id
    AND interaction_date > CURRENT_DATE - INTERVAL '90 days';
  
  calculated_strength := LEAST(
    GREATEST(
      1 + (recent_interaction_count / 2) + (interaction_count / 10),
      1
    ),
    5
  );
  
  RETURN calculated_strength;
END;
$$;

-- ============================================================================
-- update_relationship_strength_on_interaction trigger function
-- ============================================================================

CREATE OR REPLACE FUNCTION update_relationship_strength_on_interaction()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  UPDATE entity_relationships
  SET
    strength = calculate_relationship_strength(NEW.relationship_id),
    updated_at = now()
  WHERE id = NEW.relationship_id;
  
  RETURN NEW;
END;
$$;

-- ============================================================================
-- update_entity_relationship_timestamp trigger function
-- ============================================================================

CREATE OR REPLACE FUNCTION update_entity_relationship_timestamp()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- ============================================================================
-- find_nexus_paths function
-- ============================================================================

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
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
WITH RECURSIVE search_graph (
  last_id,
  path_ids,
  path_objects,
  current_depth,
  total_strength
) AS (
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
ORDER BY total_strength DESC
LIMIT 5;
$$;

-- ============================================================================
-- refresh_user_hierarchy function
-- ============================================================================

CREATE OR REPLACE FUNCTION refresh_user_hierarchy()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  DELETE FROM user_hierarchy WHERE 1=1; 
  
  INSERT INTO user_hierarchy (manager_id, subordinate_id, depth)
  SELECT reports_to, id, 1
  FROM crm_users
  WHERE reports_to IS NOT NULL;
  
  INSERT INTO user_hierarchy (manager_id, subordinate_id, depth)
  SELECT 
    managers.manager_id,
    subordinates.subordinate_id,
    managers.depth + subordinates.depth
  FROM user_hierarchy managers
  JOIN user_hierarchy subordinates ON managers.subordinate_id = subordinates.manager_id
  WHERE NOT EXISTS (
    SELECT 1 
    FROM user_hierarchy existing 
    WHERE existing.manager_id = managers.manager_id 
      AND existing.subordinate_id = subordinates.subordinate_id
  );
END;
$$;