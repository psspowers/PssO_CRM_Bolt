/*
  # Add Capacity, Financial, and Partner Classification Fields

  1. Changes to Partners Table
    - `partner_type` (text) - Type of partner (EPC, O&M, Developer, etc.)
    - `company_name` (text) - Official legal registered name of partner company

  2. Changes to Opportunities Table
    - `max_capacity` (numeric) - Customer's theoretical maximum consumption capacity in MW
    - `target_capacity` - Already exists, represents what PSS is willing to offer
    - `ppa_term` (numeric) - PPA contract duration in years
    - `epc_cost` (numeric) - Total EPC costs in THB
    - `manual_probability` (numeric 0-100) - Leader's manual probability assessment (%)
    - Removed unused `probability` field (was never implemented in UI)

  3. Notes
    - Max Capacity: Customer's theoretical max consumption (input data)
    - Target Capacity: What PSS offers (may be lower to reduce curtailment risk)
    - Manual Probability: Leader's commitment percentage for PPA signing
    - All new fields are optional to maintain backward compatibility
*/

-- 1. PARTNERS: Add Type and Legal Name
ALTER TABLE partners
ADD COLUMN IF NOT EXISTS partner_type text,
ADD COLUMN IF NOT EXISTS company_name text;

-- 2. OPPORTUNITIES: Add Technical & Financial Fields
ALTER TABLE opportunities
ADD COLUMN IF NOT EXISTS max_capacity numeric,
ADD COLUMN IF NOT EXISTS ppa_term numeric,
ADD COLUMN IF NOT EXISTS epc_cost numeric;

-- 3. OPPORTUNITIES: Replace unused probability with manual_probability
ALTER TABLE opportunities DROP COLUMN IF EXISTS probability;
ALTER TABLE opportunities
ADD COLUMN IF NOT EXISTS manual_probability numeric CHECK (manual_probability >= 0 AND manual_probability <= 100);

-- 4. REFRESH CACHE
NOTIFY pgrst, 'reload config';