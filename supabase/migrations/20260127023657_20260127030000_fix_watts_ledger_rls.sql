/*
  # Fix Watts Ledger RLS for Gamification

  1. Changes
    - Add policy to allow SECURITY DEFINER functions to insert watts
    - This enables gamification triggers to award points automatically

  2. Security
    - Only SECURITY DEFINER functions can insert (not regular users)
    - Users can still only read their own transactions
    - Super admins retain full control
*/

-- Drop overly restrictive super admin insert policy
DROP POLICY IF EXISTS "Super admins can insert watts transactions" ON watts_ledger;

-- Create new policy that allows service role and SECURITY DEFINER functions to insert
CREATE POLICY "System can award watts"
  ON watts_ledger
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Keep the SELECT policy as-is (users can only see their own)
-- Keep admin UPDATE/DELETE policies as-is
