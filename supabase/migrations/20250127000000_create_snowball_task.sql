--
-- Migration for "Snowball" (滚雪球) Task
--

-- Step 0: Ensure the reward_type enum exists.
-- This is included here to guarantee the dependency is met, even if migrations are run in a batch.
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'reward_type') THEN
        CREATE TYPE public.reward_type AS ENUM (
            'initial_investment_experience', -- For the '理财体验' task
            'market_prediction_success',     -- For the '市场预测' task
            'snowball_tier_1',               -- For '滚雪球' 500 USDT tier
            'snowball_tier_2',               -- For '滚雪球' 1500 USDT tier
            'snowball_tier_3'                -- For '滚雪球' 5000 USDT tier
        );
    END IF;
END$$;

--
-- This script creates a database function to allow users to claim rewards
-- for reaching cumulative deposit milestones.
--
-- ASSUMPTION:
-- This function assumes a table named `transactions` exists with at least
-- the following columns:
--   - user_id UUID: Foreign key to the users table.
--   - type TEXT: The type of transaction, e.g., 'deposit', 'withdrawal'.
--   - amount NUMERIC: The value of the transaction.
-- If this table has a different name or structure, this function will need to be adapted.
--

CREATE OR REPLACE FUNCTION public.claim_snowball_reward(p_tier INT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_wallet_id UUID;
    v_total_deposits NUMERIC;
    v_tier_threshold NUMERIC;
    v_reward_amount NUMERIC;
    v_reward_type_text TEXT;
    v_reward_type reward_type;
    v_already_claimed BOOLEAN;
    v_highest_claimed_tier INT;
BEGIN
    -- Step 1: Define tier thresholds and rewards
    CASE p_tier
        WHEN 1 THEN
            v_tier_threshold := 500;
            v_reward_amount := 5; -- 5 USDT Reward
            v_reward_type_text := 'snowball_tier_1';
        WHEN 2 THEN
            v_tier_threshold := 1500;
            v_reward_amount := 15; -- 15 USDT Reward
            v_reward_type_text := 'snowball_tier_2';
        WHEN 3 THEN
            v_tier_threshold := 5000;
            v_reward_amount := 50; -- 50 USDT Reward
            v_reward_type_text := 'snowball_tier_3';
        ELSE
            RAISE EXCEPTION 'Invalid tier specified. Must be 1, 2, or 3.';
    END CASE;

    v_reward_type := v_reward_type_text::reward_type;

    -- Step 2: Check if this specific reward has already been claimed
    SELECT EXISTS (
        SELECT 1 FROM user_rewards WHERE user_id = v_user_id AND reward_type = v_reward_type
    ) INTO v_already_claimed;

    IF v_already_claimed THEN
        RAISE EXCEPTION '您已经领取过当前等级的奖励。';
    END IF;

    -- Step 3: Prevent claiming a lower tier if a higher one is already claimed
    SELECT MAX(
        CASE
            WHEN reward_type = 'snowball_tier_1' THEN 1
            WHEN reward_type = 'snowball_tier_2' THEN 2
            WHEN reward_type = 'snowball_tier_3' THEN 3
            ELSE 0
        END
    ) INTO v_highest_claimed_tier
    FROM user_rewards WHERE user_id = v_user_id AND reward_type IN ('snowball_tier_1', 'snowball_tier_2', 'snowball_tier_3');

    IF v_highest_claimed_tier IS NOT NULL AND p_tier < v_highest_claimed_tier THEN
        RAISE EXCEPTION '不能在领取高等级奖励后，再领取低等级的奖励。';
    END IF;

    -- Step 4: Calculate user's total deposits from the assumed `transactions` table
    SELECT COALESCE(SUM(amount), 0)
    INTO v_total_deposits
    FROM transactions
    WHERE user_id = v_user_id AND type = 'deposit';

    -- Step 5: Check if the user meets the threshold
    IF v_total_deposits < v_tier_threshold THEN
        RAISE EXCEPTION '您的累计充值金额 % 未达到等级 % 的要求 (需要 %)。', v_total_deposits, p_tier, v_tier_threshold;
    END IF;

    -- Step 6: Grant the reward
    SELECT id INTO v_wallet_id FROM wallets WHERE user_id = v_user_id;
    IF v_wallet_id IS NULL THEN RAISE EXCEPTION '用户钱包不存在。'; END IF;

    UPDATE wallets SET balance = balance + v_reward_amount WHERE id = v_wallet_id;

    INSERT INTO user_rewards (user_id, reward_type, amount_awarded, details)
    VALUES (v_user_id, v_reward_type, v_reward_amount, jsonb_build_object('total_deposits_at_claim', v_total_deposits));

    INSERT INTO action_logs (user_id, action_type, details)
    VALUES (v_user_id, 'reward_claim', jsonb_build_object('reward_type', v_reward_type_text, 'amount', v_reward_amount));

    RETURN jsonb_build_object('success', true, 'message', '成功领取 ' || v_reward_amount || ' USDT 的等级' || p_tier || '奖励！');
END;
$$;
