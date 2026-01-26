/*
  # Create Watts Ledger Table

  1. New Tables
    - `watts_ledger`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to crm_users)
      - `amount` (integer, can be positive or negative)
      - `description` (text)
      - `category` (text, enum-like: Deal, Bonus, Redemption, Adjustment)
      - `created_at` (timestamptz)
  
  2. Security
    - Enable RLS on `watts_ledger` table
    - Users can only read their own transactions
    - Only admins can insert/update/delete transactions
*/

CREATE TABLE IF NOT EXISTS watts_ledger (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES crm_users(id) ON DELETE CASCADE,
  amount integer NOT NULL,
  description text NOT NULL,
  category text NOT NULL CHECK (category IN ('Deal', 'Bonus', 'Redemption', 'Adjustment')),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE watts_ledger ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own watts transactions"
  ON watts_ledger
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Super admins can insert watts transactions"
  ON watts_ledger
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM crm_users
      WHERE id = auth.uid()
      AND role = 'super_admin'
    )
  );

CREATE POLICY "Super admins can update watts transactions"
  ON watts_ledger
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM crm_users
      WHERE id = auth.uid()
      AND role = 'super_admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM crm_users
      WHERE id = auth.uid()
      AND role = 'super_admin'
    )
  );

CREATE POLICY "Super admins can delete watts transactions"
  ON watts_ledger
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM crm_users
      WHERE id = auth.uid()
      AND role = 'super_admin'
    )
  );

CREATE INDEX IF NOT EXISTS idx_watts_ledger_user_id ON watts_ledger(user_id);
CREATE INDEX IF NOT EXISTS idx_watts_ledger_created_at ON watts_ledger(created_at DESC);
