/*
  # Fix Analyst Rotation Function for NULL State Values

  1. Changes
    - Update fetch_daily_scan_targets to handle NULL state values
    - Include accounts where state is NULL or not 'Archived'
*/

CREATE OR REPLACE FUNCTION fetch_daily_scan_targets(batch_size int DEFAULT 30)
RETURNS TABLE (name text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  selected_ids uuid[];
BEGIN
  SELECT array_agg(id) INTO selected_ids
  FROM (
    SELECT id
    FROM accounts
    WHERE (state IS NULL OR state != 'Archived')
    ORDER BY last_market_scan_at ASC NULLS FIRST
    LIMIT batch_size
  ) sub;

  IF selected_ids IS NULL THEN
    RETURN;
  END IF;

  UPDATE accounts
  SET last_market_scan_at = now()
  WHERE id = ANY(selected_ids);

  RETURN QUERY
  SELECT a.name
  FROM accounts a
  WHERE a.id = ANY(selected_ids)
  ORDER BY a.last_market_scan_at ASC NULLS FIRST;
END;
$$;
