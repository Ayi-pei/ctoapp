-- Supabase Migration: Create Daily Check-in Task (Table, Index, and Function)
-- This migration sets up the necessary database objects for the daily check-in feature.

-- Step 1: Create the `daily_check_ins` table to store check-in records.
CREATE TABLE IF NOT EXISTS public.daily_check_ins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    checked_in_at TIMESTAMPTZ NOT NULL DEFAULT (now() AT TIME ZONE 'utc'),
    streak_day INT NOT NULL CHECK (streak_day > 0),
    reward_awarded NUMERIC(10, 4) NOT NULL
);

-- Step 1.1: Create an index to quickly find a user's latest check-in.
CREATE INDEX IF NOT EXISTS idx_user_id_checked_in_at ON public.daily_check_ins(user_id, checked_in_at DESC);

-- Step 1.2: Add comment and RLS policies.
COMMENT ON TABLE public.daily_check_ins IS 'Tracks user daily check-in history and streaks.';
ALTER TABLE public.daily_check_ins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow users to see their own check-ins" ON public.daily_check_ins
    FOR SELECT USING (auth.uid() = user_id);

-- The `perform_daily_check_in` function is SECURITY DEFINER, so it bypasses RLS for inserts.
-- However, it's good practice to also have a restrictive INSERT policy for direct API access.
CREATE POLICY "Allow users to insert their own check-ins via function" ON public.daily_check_ins
    FOR INSERT WITH CHECK (false); -- Disallow direct inserts, force use of the function.

-- Step 2: Create the function to perform the check-in and return the reward details.
CREATE OR REPLACE FUNCTION public.perform_daily_check_in()
RETURNS JSONB
LANGUAGE plpgsql
-- SECURITY DEFINER allows the function to run with the privileges of the user who defined it,
-- ensuring consistent access to tables regardless of the calling user's RLS policies.
SECURITY DEFINER
-- Explicitly set the search path to prevent potential hijacking.
SET search_path = public
AS $$
DECLARE
    current_user_id UUID;
    last_check_in RECORD;
    new_streak_day INT;
    reward_amount NUMERIC(10, 4);
    base_reward NUMERIC(10, 4) := 0.5; -- Base reward for day 1, from frontend code
    multiplier NUMERIC(3, 1) := 1.5;   -- Multiplier for subsequent days, from frontend code
    max_streak INT := 7;
BEGIN
    -- Step 2.1: Get the current user's ID from the authentication context.
    current_user_id := auth.uid();
    IF current_user_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'User not authenticated.');
    END IF;

    -- Step 2.2: Get the user's most recent check-in to determine the streak.
    SELECT * INTO last_check_in
    FROM public.daily_check_ins
    WHERE user_id = current_user_id
    ORDER BY checked_in_at DESC
    LIMIT 1;

    -- Step 2.3: Determine the new streak day based on the last check-in.
    IF last_check_in IS NULL THEN
        -- This is the user's first-ever check-in.
        new_streak_day := 1;
    ELSE
        -- Check if the last check-in was today (in UTC).
        IF last_check_in.checked_in_at::date = (now() AT TIME ZONE 'utc')::date THEN
            RETURN jsonb_build_object('success', false, 'error', 'You have already checked in today.');
        END IF;

        -- Check if the last check-in was yesterday and if the 7-day cycle is not yet complete.
        IF last_check_in.checked_in_at::date = (now() AT TIME ZONE 'utc')::date - INTERVAL '1 day' AND last_check_in.streak_day < max_streak THEN
            -- The streak continues.
            new_streak_day := last_check_in.streak_day + 1;
        ELSE
            -- The streak is broken or a 7-day cycle is complete. Reset to day 1.
            new_streak_day := 1;
        END IF;
    END IF;

    -- Step 2.4: Calculate the reward for the new streak day.
    -- Formula: reward = base_reward * (multiplier ^ (streak_day - 1))
    reward_amount := round(base_reward * (multiplier ^ (new_streak_day - 1)), 4);

    -- Step 2.5: Insert the new check-in record into the history.
    INSERT INTO public.daily_check_ins (user_id, streak_day, reward_awarded)
    VALUES (current_user_id, new_streak_day, reward_amount);
    
    -- Step 2.6: Return the results to the calling API. The API will then handle crediting the user's balance.
    RETURN jsonb_build_object(
        'success', true,
        'reward', reward_amount,
        'streak_day', new_streak_day
    );

END;
$$;

-- Step 3: Grant execute permissions on the function to all authenticated users.
GRANT EXECUTE ON FUNCTION public.perform_daily_check_in() TO authenticated;
