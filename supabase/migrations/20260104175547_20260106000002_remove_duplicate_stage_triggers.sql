/*
  # Remove Duplicate Stage Change Triggers

  1. Cleanup
    - Drop old trigger `trigger_log_stage_change` (conflicts with new trigger)
    - Drop old function `log_opportunity_stage_change()` (uses wrong schema)
    - Drop old function `get_recent_stage_transitions()` (references non-existent columns)
  
  2. Result
    - Only `on_opportunity_stage_change` trigger remains (correct implementation)
    - No more schema mismatch errors on stage updates
*/

-- Remove old duplicate trigger
DROP TRIGGER IF EXISTS trigger_log_stage_change ON opportunities;

-- Remove old functions with incorrect schema references
DROP FUNCTION IF EXISTS log_opportunity_stage_change();
DROP FUNCTION IF EXISTS get_recent_stage_transitions(integer);
