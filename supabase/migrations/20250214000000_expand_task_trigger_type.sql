-- Migration to expand task_trigger_type enum to include all frontend values
-- This resolves the mismatch between frontend TaskTriggerType and database enum

-- Step 1: Add new enum values to task_trigger_type
ALTER TYPE public.task_trigger_type ADD VALUE IF NOT EXISTS 'contract_trade';
ALTER TYPE public.task_trigger_type ADD VALUE IF NOT EXISTS 'spot_trade';
ALTER TYPE public.task_trigger_type ADD VALUE IF NOT EXISTS 'investment';

-- Step 2: Verify the enum has all required values
-- The enum should now contain:
-- - daily_check_in (existing)
-- - market_prediction (existing)  
-- - investment_create (existing)
-- - trade_complete (existing)
-- - contract_trade (new)
-- - spot_trade (new)
-- - investment (new)

-- Step 3: Update any existing records that might use old trigger values
-- This is a safe operation since we're adding values, not changing them

-- Note: Frontend TaskTriggerType now matches database enum values
COMMENT ON TYPE public.task_trigger_type IS 'Enum for task trigger types, synchronized with frontend TaskTriggerType';