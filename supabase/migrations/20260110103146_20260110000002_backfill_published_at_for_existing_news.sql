/*
  # Backfill published_at for Existing News
  
  1. Updates
    - Set published_at = created_at for all existing news that has NULL published_at
    - This ensures old news remains visible after the drip-feed upgrade
  
  2. Notes
    - Existing news will appear immediately (not drip-fed)
    - Only new CSV imports will use the drip-feed timing
*/

-- Backfill published_at for existing news entries
UPDATE market_news 
SET published_at = created_at 
WHERE published_at IS NULL;