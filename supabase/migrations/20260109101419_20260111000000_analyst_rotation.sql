/*
  # Smart Analyst Rotation System

  1. New Columns
    - `accounts.last_market_scan_at` (timestamptz)
      - Tracks when a company was last scanned by the analyst
      - NULL means never scanned (highest priority)

  2. New Functions
    - `fetch_daily_scan_targets(batch_size int)`
      - Selects top N accounts that haven't been scanned in longest time
      - Updates their timestamp to NOW() (sends them to back of queue)
      - Returns company names for the analyst prompt
      - Only selects non-archived accounts
      - Uses NULLS FIRST to prioritize never-scanned companies

  3. Security
    - Function granted to authenticated users
    - Uses SECURITY DEFINER for atomic update operation
*/

-- Add the last_market_scan_at column to track analyst scans
ALTER TABLE accounts
ADD COLUMN IF NOT EXISTS last_market_scan_at timestamptz;

-- Create the smart rotation function
CREATE OR REPLACE FUNCTION fetch_daily_scan_targets(batch_size int DEFAULT 30)
RETURNS TABLE (name text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  selected_ids uuid[];
BEGIN
  -- Step 1: Find the target accounts that need scanning
  -- Order by last_market_scan_at with NULLS FIRST (never scanned = highest priority)
  -- Exclude archived accounts
  SELECT array_agg(id) INTO selected_ids
  FROM (
    SELECT id
    FROM accounts
    WHERE status != 'Archived'
    ORDER BY last_market_scan_at ASC NULLS FIRST
    LIMIT batch_size
  ) sub;

  -- Handle edge case: no accounts found
  IF selected_ids IS NULL THEN
    RETURN;
  END IF;

  -- Step 2: Update the timestamp (atomic operation)
  -- This sends them to the back of the rotation queue
  UPDATE accounts
  SET last_market_scan_at = now()
  WHERE id = ANY(selected_ids);

  -- Step 3: Return the company names in order
  RETURN QUERY
  SELECT a.name
  FROM accounts a
  WHERE a.id = ANY(selected_ids)
  ORDER BY a.last_market_scan_at ASC NULLS FIRST;
END;
$$;

-- Grant execution permission to authenticated users
GRANT EXECUTE ON FUNCTION fetch_daily_scan_targets TO authenticated;

-- Add comment for documentation
COMMENT ON FUNCTION fetch_daily_scan_targets IS
'Fetches daily market scan targets using smart rotation. Returns company names and updates their scan timestamp.';
