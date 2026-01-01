-- ==========================================
-- PART 5: FINAL GAP-FILLER SCRIPT (CORRECTED)
-- This fixes ALL missing items identified in the audit
-- Run this AFTER Parts 1-4
-- ==========================================

-- ==========================================
-- 1. MISSING JOIN TABLES
-- ==========================================

-- Account <-> Partners (from your original Part 5)
CREATE TABLE IF NOT EXISTS public.account_partners (
  account_id uuid REFERENCES public.accounts(id) ON DELETE CASCADE,
  partner_id uuid REFERENCES public.partners(id) ON DELETE CASCADE,
  PRIMARY KEY (account_id, partner_id)
);

ALTER TABLE public.account_partners ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Manage account partners" ON public.account_partners
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.accounts WHERE id = account_partners.account_id AND owner_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.crm_users WHERE id = auth.uid() AND role IN ('admin', 'internal'))
  );

-- Opportunity <-> Partners (from your original Part 5)
CREATE TABLE IF NOT EXISTS public.opportunity_partners (
  opportunity_id uuid REFERENCES public.opportunities(id) ON DELETE CASCADE,
  partner_id uuid REFERENCES public.partners(id) ON DELETE CASCADE,
  PRIMARY KEY (opportunity_id, partner_id)
);

ALTER TABLE public.opportunity_partners ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Manage deal partners" ON public.opportunity_partners
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.opportunities WHERE id = opportunity_partners.opportunity_id AND owner_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.crm_users WHERE id = auth.uid() AND role IN ('admin', 'internal'))
  );

-- *** CRITICAL MISSING: Project <-> Partners ***
CREATE TABLE IF NOT EXISTS public.project_partners (
  project_id uuid REFERENCES public.projects(id) ON DELETE CASCADE,
  partner_id uuid REFERENCES public.partners(id) ON DELETE CASCADE,
  PRIMARY KEY (project_id, partner_id)
);

ALTER TABLE public.project_partners ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Manage project partners" ON public.project_partners
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.projects WHERE id = project_partners.project_id AND owner_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.crm_users WHERE id = auth.uid() AND role IN ('admin', 'internal'))
  );

-- ==========================================
-- 2. FIX trusted_devices TABLE (Missing Columns)
-- ==========================================

-- Add missing columns if they don't exist
DO $$
BEGIN
  -- device_fingerprint for identifying unique devices
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'trusted_devices' AND column_name = 'device_fingerprint') THEN
    ALTER TABLE public.trusted_devices ADD COLUMN device_fingerprint text;
  END IF;
  
  -- revoked_at for tracking when device was revoked
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'trusted_devices' AND column_name = 'revoked_at') THEN
    ALTER TABLE public.trusted_devices ADD COLUMN revoked_at timestamptz;
  END IF;
  
  -- is_trusted flag
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'trusted_devices' AND column_name = 'is_trusted') THEN
    ALTER TABLE public.trusted_devices ADD COLUMN is_trusted boolean DEFAULT true;
  END IF;
  
  -- user_agent for full UA string
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'trusted_devices' AND column_name = 'user_agent') THEN
    ALTER TABLE public.trusted_devices ADD COLUMN user_agent text;
  END IF;
END
$$;

-- ==========================================
-- 3. FIX user_2fa_settings TABLE
-- ==========================================

CREATE TABLE IF NOT EXISTS public.user_2fa_settings (
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  totp_secret text,              -- TOTP Secret (edge function uses this name)
  backup_codes text[],           -- Recovery codes
  is_enabled boolean DEFAULT false,
  method text DEFAULT 'email',   -- 'email' or 'authenticator'
  email_otp_code text,           -- For email-based 2FA
  email_otp_expires_at timestamptz, -- Expiry for email OTP
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.user_2fa_settings ENABLE ROW LEVEL SECURITY;

-- Users can manage their own 2FA settings
CREATE POLICY "Manage own 2FA" ON public.user_2fa_settings
  FOR ALL USING (auth.uid() = user_id);

-- *** CRITICAL: Service role policy for edge functions ***
CREATE POLICY "Service role manages 2FA" ON public.user_2fa_settings
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ==========================================
-- 4. FIX activities TABLE (Task Fields)
-- ==========================================

DO $$
BEGIN
  -- is_task flag
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'activities' AND column_name = 'is_task') THEN
    ALTER TABLE public.activities ADD COLUMN is_task boolean DEFAULT false;
  END IF;
  
  -- assigned_to_id for task assignment
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'activities' AND column_name = 'assigned_to_id') THEN
    ALTER TABLE public.activities ADD COLUMN assigned_to_id uuid REFERENCES auth.users(id);
  END IF;
  
  -- due_date for tasks
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'activities' AND column_name = 'due_date') THEN
    ALTER TABLE public.activities ADD COLUMN due_date timestamptz;
  END IF;
  
  -- task_status (Pending/Completed)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'activities' AND column_name = 'task_status') THEN
    ALTER TABLE public.activities ADD COLUMN task_status text CHECK (task_status IN ('Pending', 'Completed'));
  END IF;
  
  -- priority (Low/Medium/High)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'activities' AND column_name = 'priority') THEN
    ALTER TABLE public.activities ADD COLUMN priority text CHECK (priority IN ('Low', 'Medium', 'High'));
  END IF;
END
$$;

-- ==========================================
-- 5. SERVICE ROLE POLICIES FOR EDGE FUNCTIONS
-- ==========================================

-- login_history: Edge function needs to INSERT records
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'login_history' AND policyname = 'Service role inserts login history') THEN
    CREATE POLICY "Service role inserts login history" ON public.login_history
      FOR INSERT TO service_role WITH CHECK (true);
  END IF;
END
$$;

-- trusted_devices: Edge function needs full access
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'trusted_devices' AND policyname = 'Service role manages devices') THEN
    CREATE POLICY "Service role manages devices" ON public.trusted_devices
      FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
END
$$;

-- ==========================================
-- 6. NOTIFICATION PREFERENCES TABLE
-- ==========================================

CREATE TABLE IF NOT EXISTS public.notification_preferences (
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email_new_activity boolean DEFAULT true,
  email_mentions boolean DEFAULT true,
  email_task_reminders boolean DEFAULT true,
  email_deal_updates boolean DEFAULT false,
  email_partner_updates boolean DEFAULT false,
  push_enabled boolean DEFAULT true,
  push_new_activity boolean DEFAULT true,
  push_mentions boolean DEFAULT true,
  push_task_reminders boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Manage own preferences" ON public.notification_preferences
  FOR ALL USING (auth.uid() = user_id);

-- ==========================================
-- 7. FIX NOTIFICATIONS TABLE (Service Role Insert)
-- ==========================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'notifications' AND policyname = 'Service role inserts notifications') THEN
    CREATE POLICY "Service role inserts notifications" ON public.notifications
      FOR INSERT TO service_role WITH CHECK (true);
  END IF;
END
$$;

-- ==========================================
-- 8. VERIFY crm_users EXISTS
-- ==========================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'crm_users') THEN
    RAISE NOTICE 'Creating crm_users table...';
    CREATE TABLE public.crm_users (
      id uuid REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
      email text NOT NULL,
      name text,
      role text DEFAULT 'external' CHECK (role IN ('admin', 'internal', 'external')),
      avatar text,
      badges text[] DEFAULT '{}',
      is_active boolean DEFAULT true,
      created_at timestamptz DEFAULT now(),
      updated_at timestamptz DEFAULT now()
    );
    ALTER TABLE public.crm_users ENABLE ROW LEVEL SECURITY;
    CREATE POLICY "Read access" ON public.crm_users FOR SELECT USING (true);
    CREATE POLICY "Update own" ON public.crm_users FOR UPDATE USING (auth.uid() = id);
    CREATE POLICY "Insert own" ON public.crm_users FOR INSERT WITH CHECK (auth.uid() = id);
  END IF;
END
$$;

-- ==========================================
-- 9. PERFORMANCE INDEXES
-- ==========================================

-- Join tables
CREATE INDEX IF NOT EXISTS idx_account_partners_lookup 
  ON public.account_partners(account_id, partner_id);

CREATE INDEX IF NOT EXISTS idx_opp_partners_lookup 
  ON public.opportunity_partners(opportunity_id, partner_id);

CREATE INDEX IF NOT EXISTS idx_project_partners_lookup 
  ON public.project_partners(project_id, partner_id);

-- Notifications
CREATE INDEX IF NOT EXISTS idx_notifications_user_read 
  ON public.notifications(user_id, is_read, created_at);

-- Activities - Task queries
CREATE INDEX IF NOT EXISTS idx_activities_is_task 
  ON public.activities(is_task) WHERE is_task = true;

CREATE INDEX IF NOT EXISTS idx_activities_assigned 
  ON public.activities(assigned_to_id, task_status) WHERE is_task = true;

-- Trusted devices
CREATE INDEX IF NOT EXISTS idx_trusted_devices_fingerprint 
  ON public.trusted_devices(user_id, device_fingerprint);

-- ==========================================
-- 10. UPDATED_AT TRIGGERS
-- ==========================================

-- Generic updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to tables with updated_at
DO $$
DECLARE
  tbl text;
BEGIN
  FOR tbl IN SELECT unnest(ARRAY['crm_users', 'user_2fa_settings', 'notification_preferences'])
  LOOP
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_' || tbl || '_updated_at') THEN
      EXECUTE format('CREATE TRIGGER update_%s_updated_at BEFORE UPDATE ON public.%s FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()', tbl, tbl);
    END IF;
  END LOOP;
END
$$;

-- ==========================================
-- VERIFICATION QUERIES (Run to check)
-- ==========================================

-- Check all tables exist
-- SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;

-- Check trusted_devices columns
-- SELECT column_name FROM information_schema.columns WHERE table_name = 'trusted_devices';

-- Check activities columns
-- SELECT column_name FROM information_schema.columns WHERE table_name = 'activities';

-- Check RLS policies
-- SELECT tablename, policyname FROM pg_policies WHERE schemaname = 'public' ORDER BY tablename;
