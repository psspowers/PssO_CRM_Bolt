/*
  # Iron Dome RLS Policy for Opportunities Table

  ## Overview
  Implements hierarchical access control where users can only see opportunities they own
  or that belong to their subordinates. Admins (VP/Ops) and Super Admins have full visibility.

  ## Security Model
  - **Admins/Super Admins**: See all opportunities (God Mode via is_admin())
  - **Managers**: See their own opportunities + opportunities owned by anyone in their downline
  - **Individual Contributors**: See only their own opportunities
  - **NULL owner_id**: Hidden from everyone except admins

  ## Changes
  1. Refresh user_hierarchy to ensure accurate reporting structure
  2. Drop all existing wide-open policies
  3. Create restrictive hierarchy-based policies for SELECT, INSERT, UPDATE, DELETE
  4. Confirm RLS is enabled

  ## Performance
  - Leverages existing index: idx_opportunities_owner
  - Uses pre-computed user_hierarchy table for fast lookups
*/

-- Step 1: Refresh the hierarchy to ensure accurate data
SELECT refresh_user_hierarchy();

-- Step 2: Drop existing wide-open policies
DROP POLICY IF EXISTS "Authenticated users can view opportunities" ON opportunities;
DROP POLICY IF EXISTS "Authenticated users can create opportunities" ON opportunities;
DROP POLICY IF EXISTS "Authenticated users can update opportunities" ON opportunities;
DROP POLICY IF EXISTS "Authenticated users can delete opportunities" ON opportunities;

-- Step 3: Create Iron Dome READ Policy
CREATE POLICY "view_opportunities_hierarchy" 
ON opportunities
FOR SELECT 
USING (
  is_admin() -- Admins/Super Admins see everything
  OR 
  owner_id = auth.uid() -- I own this opportunity
  OR 
  owner_id IN ( -- Opportunity belongs to my downstream team
    SELECT subordinate_id 
    FROM user_hierarchy 
    WHERE manager_id = auth.uid()
  )
);

-- Step 4: Create INSERT Policy
CREATE POLICY "insert_opportunities" 
ON opportunities
FOR INSERT 
WITH CHECK (
  auth.uid() = owner_id -- Standard: You create it, you own it
  OR 
  is_admin() -- Admins can create opportunities for others
);

-- Step 5: Create UPDATE Policy
CREATE POLICY "update_opportunities_hierarchy" 
ON opportunities
FOR UPDATE 
USING (
  is_admin() -- Admins can update any opportunity
  OR 
  owner_id = auth.uid() -- I own this opportunity
  OR 
  owner_id IN ( -- Opportunity belongs to my downstream team
    SELECT subordinate_id 
    FROM user_hierarchy 
    WHERE manager_id = auth.uid()
  )
)
WITH CHECK (
  is_admin() -- Admins can change ownership
  OR 
  owner_id = auth.uid() -- Can only update to keep yourself as owner
  OR
  owner_id IN ( -- Can update to assign to your team members
    SELECT subordinate_id 
    FROM user_hierarchy 
    WHERE manager_id = auth.uid()
  )
);

-- Step 6: Create DELETE Policy
CREATE POLICY "delete_opportunities_hierarchy" 
ON opportunities
FOR DELETE 
USING (
  is_admin() -- Admins can delete any opportunity
  OR 
  owner_id = auth.uid() -- I own this opportunity
  OR 
  owner_id IN ( -- Opportunity belongs to my downstream team
    SELECT subordinate_id 
    FROM user_hierarchy 
    WHERE manager_id = auth.uid()
  )
);

-- Step 7: Ensure RLS is enabled
ALTER TABLE opportunities ENABLE ROW LEVEL SECURITY;
