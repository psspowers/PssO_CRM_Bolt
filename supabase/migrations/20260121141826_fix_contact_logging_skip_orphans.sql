/*
  # Fix Contact Logging - Skip Orphan Contacts

  1. Changes
    - Update `log_crm_changes()` function to skip logging contact insertions when account_id is NULL
    - This prevents orphan contacts (contacts without accounts) from appearing in the Pulse feed
    
  2. Rationale
    - Contacts without accounts are not relevant to the "For You" feed
    - They should only appear if they have a matching account in the system
    - This aligns with the business logic: Import data → Check Account → (Yes) Post, (No) Skip
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
    -- SKIP logging contact insertions without account_id
    IF TG_TABLE_NAME = 'contacts' AND (NEW.account_id IS NULL) THEN
      RETURN NEW;
    END IF;
    
    new_val := to_jsonb(NEW);
    INSERT INTO public.admin_activity_logs (user_id, user_email, action, entity_type, entity_id, details)
    VALUES (current_user_id, user_email, 'CREATE', TG_TABLE_NAME, NEW.id, new_val);
    RETURN NEW;
  END IF;
  
  RETURN NULL;
END;
$function$;
