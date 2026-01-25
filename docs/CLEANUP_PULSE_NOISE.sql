/*
  # Pulse Feed Cleanup Script

  This script removes low-quality "noise" entries from the market_news table.

  ## What Gets Removed:
  - Entries marked as "neutral" impact
  - Containing phrases indicating lack of data:
    * "not found"
    * "no data"
    * "no public"
    * "unclear"
    * "limited"
    * "minimal"
    * "absent"
    * "data gaps"

  ## Safety:
  - Only removes neutral entries (preserves all opportunities/threats)
  - Uses case-insensitive matching (ILIKE)
  - Returns count of deleted rows

  ## Usage:
  Run this in Supabase SQL Editor or via execute_sql tool
*/

DELETE FROM market_news
WHERE impact_type = 'neutral'
AND (
  title ILIKE '%not found%' OR
  title ILIKE '%no data%' OR
  title ILIKE '%no public%' OR
  title ILIKE '%unclear%' OR
  title ILIKE '%limited%' OR
  summary ILIKE '%minimal%' OR
  summary ILIKE '%absent%' OR
  summary ILIKE '%data gaps%'
);
