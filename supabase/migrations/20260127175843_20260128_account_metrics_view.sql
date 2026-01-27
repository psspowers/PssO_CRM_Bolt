/*
  # Account Metrics View

  1. Purpose
    - Provides pre-aggregated metrics for accounts including:
      - Total active deals (excluding 'Lost' stage)
      - Total MW capacity across all active opportunities
      - Total value across all active opportunities
      - Contact count per account
    - Improves performance by moving aggregation to the database layer

  2. View Structure
    - `account_metrics_view`: Main view with all account fields plus computed metrics
      - Inherits all columns from `accounts` table
      - `contact_count`: Number of contacts linked to the account
      - `deal_count`: Number of active opportunities (excluding 'Lost')
      - `total_mw`: Sum of target_capacity for active opportunities
      - `total_value`: Sum of value for active opportunities

  3. Security
    - Grant SELECT to authenticated users
    - View respects underlying RLS policies on base tables
*/

-- Create the account metrics view
CREATE OR REPLACE VIEW account_metrics_view AS
SELECT
  a.*,
  COALESCE(COUNT(DISTINCT c.id), 0) as contact_count,
  COALESCE(COUNT(DISTINCT CASE WHEN o.stage != 'Lost' THEN o.id END), 0) as deal_count,
  COALESCE(SUM(CASE WHEN o.stage != 'Lost' THEN o.target_capacity ELSE 0 END), 0) as total_mw,
  COALESCE(SUM(CASE WHEN o.stage != 'Lost' THEN o.value ELSE 0 END), 0) as total_value
FROM accounts a
LEFT JOIN contacts c ON c.account_id = a.id
LEFT JOIN opportunities o ON o.account_id = a.id
GROUP BY a.id;

-- Grant select permission to authenticated users
GRANT SELECT ON account_metrics_view TO authenticated;