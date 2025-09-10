-- Migration to create a unified tasks view and fix the activities table

-- Step 1: Add the howToClaim and imgSrc columns to the activities table
ALTER TABLE public.activities
ADD COLUMN IF NOT EXISTS "howToClaim" TEXT,
ADD COLUMN IF NOT EXISTS "imgSrc" TEXT;

-- Step 2: Create the v_daily_tasks view
CREATE OR REPLACE VIEW public.v_daily_tasks AS
SELECT
    id::text,
    title,
    description,
    reward,
    reward_type,
    link,
    imgSrc,
    status,
    trigger,
    NULL::timestamptz AS created_at
FROM public.daily_tasks
UNION ALL
SELECT
    id::text,
    'Daily Check-in' AS title,
    'Check in daily to earn rewards.' AS description,
    reward_awarded AS reward,
    'daily_check_in' AS reward_type,
    '/tasks' AS link,
    '/images/check-in.png' AS imgSrc,
    'published' AS status,
    'daily_check_in' AS trigger,
    checked_in_at AS created_at
FROM public.daily_check_ins
UNION ALL
SELECT
    id::text,
    'Market Prediction' AS title,
    'Predict the market to earn rewards.' AS description,
    3.00 AS reward, -- Assuming a fixed reward for now
    'market_prediction_success' AS reward_type,
    '/market' AS link,
    '/images/prediction.png' AS imgSrc,
    status,
    'market_prediction' AS trigger,
    created_at
FROM public.market_predictions;

-- Step 3: Grant access to the new view
GRANT SELECT ON public.v_daily_tasks TO authenticated;
