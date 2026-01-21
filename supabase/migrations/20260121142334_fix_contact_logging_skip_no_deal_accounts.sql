/*
  # Fix Contact Logging - Only Show Contacts from Accounts with Deals

  1. Changes
    - Update `log_crm_changes()` function to skip logging contact insertions when:
      - The contact has no account_id, OR
      - The account has no opportunities/deals attached to it
    
  2. Rationale
    - Only contacts from accounts with active opportunities are relevant to the Pulse feed
    - Business logic: Import Contact → Check Account has Deals → (Yes) Post, (No) Skip
    - This keeps the feed focused on actionable, deal-related contacts
*/

CREATE OR REPLACE FUNCTION public.log_crm_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  current_user_id uuid;
  user_email text;
  old_val jsonb;
  new_val jsonb;
  has_opportunities boolean;
BEGIN
  -- Get current user ID (if logged in)
  current_user_id := auth.uid();

  -- If system/service role, skip logging to avoid infinite loops
  IF current_user_id IS NULL THEN 
    RETURN COALESCE(NEW, OLD); 
  END IF;

  -- Get user email for readability
  SELECT email INTO user_email FROM auth.users WHERE id = current_user_id;

  IF (TG_OP = 'DELETE') THEN
    old_val := to_jsonb(OLD);
    INSERT INTO public.admin_activity_logs (user_id, user_email, action, entity_type, entity_id, details)
    VALUES (current_user_id, user_email, 'DELETE', TG_TABLE_NAME, OLD.id, old_val);
    RETURN OLD;
    
  ELSIF (TG_OP = 'UPDATE') THEN
    old_val := to_jsonb(OLD);
    new_val := to_jsonb(NEW);
    -- Only log if data actually changed
    IF old_val != new_val THEN
      INSERT INTO public.admin_activity_logs (user_id, user_email, action, entity_type, entity_id, details)
      VALUES (current_user_id, user_email, 'UPDATE', TG_TABLE_NAME, NEW.id, 
        jsonb_build_object('old', old_val, 'new', new_val));
    END IF;
    RETURN NEW;
    
  ELSIF (TG_OP = 'INSERT') THEN
    -- SKIP logging contact insertions without account_id OR without deals
    IF TG_TABLE_NAME = 'contacts' THEN
      -- Skip if no account
      IF NEW.account_id IS NULL THEN
        RETURN NEW;
      END IF;
      
      -- Check if the account has any opportunities
      SELECT EXISTS(
        SELECT 1 FROM opportunities WHERE account_id = NEW.account_id LIMIT 1
      ) INTO has_opportunities;
      
      -- Skip if account has no opportunities
      IF NOT has_opportunities THEN
        RETURN NEW;
      END IF;
    END IF;
    
    new_val := to_jsonb(NEW);
    INSERT INTO public.admin_activity_logs (user_id, user_email, action, entity_type, entity_id, details)
    VALUES (current_user_id, user_email, 'CREATE', TG_TABLE_NAME, NEW.id, new_val);
    RETURN NEW;
  END IF;
  
  RETURN NULL;
END;
$function$;
