/*
  # Add News Date Column

  1. Changes
    - Add `news_date` column to `market_news` table to track when news actually happened
    - Default to CURRENT_DATE for existing and new records
  
  2. Notes
    - This field allows filtering and sorting news by actual publication date
    - Different from `created_at` which tracks when the record was inserted
*/

ALTER TABLE market_news 
ADD COLUMN IF NOT EXISTS news_date date DEFAULT CURRENT_DATE;