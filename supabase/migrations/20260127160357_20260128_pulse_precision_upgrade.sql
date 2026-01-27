/*
  # Pulse Precision Hunter Upgrade

  1. Schema Changes
    - Add confidence_score (0-100) to market_news
    - Add inferred_mw for AI-calculated solar potential
    - Add calculation_logic to show "shadow math"
    - Add rapport_hook and sales_script for tactical guidance
    - Add decay_last_viewed_at for engagement tracking

  2. New Tables
    - `nexus_claims` - Elite 30 claim system for intel ownership
      - Links news to claiming user
      - Supports delegation via assigned_to
      - Status tracking (ACTIVE, RELEASED, CONVERTED)

  3. Gamification
    - Award +15 Watts for claiming intel
    - Automatic tracking via trigger

  4. Security
    - RLS enabled on nexus_claims
    - Policies for viewing and managing claims
*/

-- 1. Upgrade Market News Table
ALTER TABLE market_news
ADD COLUMN IF NOT EXISTS confidence_score INT DEFAULT 0 CHECK (confidence_score >= 0 AND confidence_score <= 100),
ADD COLUMN IF NOT EXISTS inferred_mw NUMERIC CHECK (inferred_mw >= 0),
ADD COLUMN IF NOT EXISTS calculation_logic TEXT,
ADD COLUMN IF NOT EXISTS rapport_hook TEXT,
ADD COLUMN IF NOT EXISTS sales_script TEXT,
ADD COLUMN IF NOT EXISTS decay_last_viewed_at TIMESTAMPTZ DEFAULT NOW();

-- Create index for sorting by confidence
CREATE INDEX IF NOT EXISTS idx_market_news_confidence ON market_news(confidence_score DESC);

-- 2. Create Claim System (The Elite 30)
CREATE TABLE IF NOT EXISTS nexus_claims (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  news_id UUID REFERENCES market_news(id) ON DELETE CASCADE NOT NULL,
  claimed_by UUID REFERENCES crm_users(id) NOT NULL,
  assigned_to UUID REFERENCES crm_users(id),
  claimed_at TIMESTAMPTZ DEFAULT NOW(),
  status TEXT DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'RELEASED', 'CONVERTED')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(news_id)
);

-- Enable RLS on nexus_claims
ALTER TABLE nexus_claims ENABLE ROW LEVEL SECURITY;

-- RLS Policies for Claims
CREATE POLICY "Anyone can view claims"
  ON nexus_claims FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create claims"
  ON nexus_claims FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = claimed_by);

CREATE POLICY "Owner or assignee can update claims"
  ON nexus_claims FOR UPDATE
  TO authenticated
  USING (auth.uid() = claimed_by OR auth.uid() = assigned_to);

CREATE POLICY "Owner can delete claims"
  ON nexus_claims FOR DELETE
  TO authenticated
  USING (auth.uid() = claimed_by);

-- 3. Trigger: Award Watts for Claiming Intel (+15)
CREATE OR REPLACE FUNCTION award_claim_watts()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Award 15 Watts for claiming intel
  INSERT INTO watts_ledger (user_id, amount, description, category, metadata)
  VALUES (
    NEW.claimed_by,
    15,
    'Claimed Market Intel',
    'intel',
    jsonb_build_object('news_id', NEW.news_id, 'claim_id', NEW.id)
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_intel_claim ON nexus_claims;
CREATE TRIGGER on_intel_claim
  AFTER INSERT ON nexus_claims
  FOR EACH ROW
  EXECUTE FUNCTION award_claim_watts();

-- 4. Function: Get Claimed News with User Info
CREATE OR REPLACE FUNCTION get_claimed_news()
RETURNS TABLE (
  news_id UUID,
  claimed_by UUID,
  claimed_by_name TEXT,
  claimed_by_avatar TEXT,
  assigned_to UUID,
  assigned_to_name TEXT,
  status TEXT,
  claimed_at TIMESTAMPTZ
)
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    nc.news_id,
    nc.claimed_by,
    claimer.name as claimed_by_name,
    claimer.avatar_url as claimed_by_avatar,
    nc.assigned_to,
    assignee.name as assigned_to_name,
    nc.status,
    nc.claimed_at
  FROM nexus_claims nc
  LEFT JOIN crm_users claimer ON claimer.id = nc.claimed_by
  LEFT JOIN crm_users assignee ON assignee.id = nc.assigned_to
  WHERE nc.status = 'ACTIVE';
END;
$$ LANGUAGE plpgsql;

-- 5. Update timestamps trigger for nexus_claims
CREATE OR REPLACE FUNCTION update_nexus_claims_timestamp()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_nexus_claims_timestamp ON nexus_claims;
CREATE TRIGGER update_nexus_claims_timestamp
  BEFORE UPDATE ON nexus_claims
  FOR EACH ROW
  EXECUTE FUNCTION update_nexus_claims_timestamp();