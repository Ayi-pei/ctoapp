--
-- FINAL, DESTRUCTIVE & RECONSTRUCTIVE MIGRATION (with Initial Investment Reward)
-- This script will first DROP any previous versions of the tables and functions
-- to ensure a clean slate, then create everything from scratch with the correct structure.
--

-- Step 1: Drop existing objects to ensure a clean slate.
DROP FUNCTION IF EXISTS public.create_investment(UUID, NUMERIC);
ALTER TABLE IF EXISTS public.investments DROP COLUMN IF EXISTS product_id;
DROP TABLE IF EXISTS public.investment_products;
DROP TABLE IF EXISTS public.investment_settings;

-- Step 2: Create the investment_settings table.
CREATE TABLE public.investment_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    min_investment_amount NUMERIC(15, 2) NOT NULL,
    max_investment_amount NUMERIC(15, 2) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Step 3: Create the investment_products table.
CREATE TABLE public.investment_products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    period INTEGER NOT NULL, -- Duration in days
    profit_rate NUMERIC(10, 5) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Step 4: Enable Row Level Security.
ALTER TABLE public.investment_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.investment_products ENABLE ROW LEVEL SECURITY;

-- Step 5: Define RLS policies.
CREATE POLICY "Allow admin full access on settings" ON public.investment_settings FOR ALL USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "Allow authenticated read on settings" ON public.investment_settings FOR SELECT TO authenticated USING (is_active = true);
CREATE POLICY "Allow admin full access on products" ON public.investment_products FOR ALL USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "Allow authenticated read on active products" ON public.investment_products FOR SELECT TO authenticated USING (is_active = true);

-- Step 6: Seed initial data.
INSERT INTO public.investment_settings (min_investment_amount, max_investment_amount) VALUES (100.00, 50000.00);
INSERT INTO public.investment_products (name, description, period, profit_rate) VALUES
('7日新手体验', '新手专享，超高年化回报', 7, 0.08500),
('30天稳健理财', '风险低，收益稳定', 30, 0.05500),
('90天进取计划', '更高收益，把握市场机遇', 90, 0.07200);

-- Step 7: Link investments to products.
ALTER TABLE public.investments ADD COLUMN product_id UUID REFERENCES public.investment_products(id);

-- Step 8: Create the create_investment function with integrated reward logic.
CREATE OR REPLACE FUNCTION public.create_investment(p_product_id UUID, p_amount NUMERIC)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_wallet_id UUID;
    v_product RECORD;
    v_settings RECORD;
    v_new_investment_id UUID;
    v_investment_count INT;
    v_reward_already_claimed BOOLEAN;
    v_experience_reward_amount NUMERIC(15, 2) := 1.00; -- Reward for first investment, e.g., 1 USDT
BEGIN
    -- Basic validations
    SELECT id INTO v_wallet_id FROM wallets WHERE user_id = v_user_id;
    IF v_wallet_id IS NULL THEN RAISE EXCEPTION 'User wallet not found'; END IF;
    SELECT * INTO v_product FROM investment_products WHERE id = p_product_id AND is_active = TRUE;
    IF v_product IS NULL THEN RAISE EXCEPTION 'Investment product not found or is not active'; END IF;
    SELECT * INTO v_settings FROM investment_settings WHERE is_active = TRUE LIMIT 1;
    IF v_settings IS NULL THEN RAISE EXCEPTION 'Global investment settings not found or are inactive'; END IF;
    IF p_amount < v_settings.min_investment_amount THEN RAISE EXCEPTION 'Amount is below minimum investment limit'; END IF;
    IF p_amount > v_settings.max_investment_amount THEN RAISE EXCEPTION 'Amount is above maximum investment limit'; END IF;
    IF (SELECT balance FROM wallets WHERE id = v_wallet_id) < p_amount THEN RAISE EXCEPTION 'Insufficient wallet balance'; END IF;

    -- Perform transaction
    UPDATE wallets SET balance = balance - p_amount WHERE id = v_wallet_id;
    INSERT INTO investments (user_id, product_id, amount, end_date, interest_rate, status)
    VALUES (v_user_id, p_product_id, p_amount, now() + (v_product.period * INTERVAL '1 day'), v_product.profit_rate, 'active')
    RETURNING id INTO v_new_investment_id;
    INSERT INTO action_logs (user_id, action_type, details)
    VALUES (v_user_id, 'investment_create', jsonb_build_object('investment_id', v_new_investment_id, 'product_id', p_product_id, 'amount', p_amount));

    -- --- "理财体验" Task Logic ---
    -- Check if this is the user's very first investment.
    SELECT count(*) INTO v_investment_count FROM investments WHERE user_id = v_user_id;

    IF v_investment_count = 1 THEN
        -- It is the first investment. Now, check if the reward was already claimed to be safe.
        SELECT EXISTS (
            SELECT 1 FROM user_rewards
            WHERE user_id = v_user_id AND reward_type = 'initial_investment_experience'
        ) INTO v_reward_already_claimed;

        IF NOT v_reward_already_claimed THEN
            -- Grant the reward by updating the wallet balance
            UPDATE wallets SET balance = balance + v_experience_reward_amount WHERE id = v_wallet_id;

            -- Record that the reward has been claimed
            INSERT INTO user_rewards (user_id, reward_type, amount_awarded, details)
            VALUES (v_user_id, 'initial_investment_experience', v_experience_reward_amount, jsonb_build_object('triggered_by_investment_id', v_new_investment_id));

            -- Log the reward action
            INSERT INTO action_logs (user_id, action_type, details)
            VALUES (v_user_id, 'reward_claim', jsonb_build_object(
                'reward_type', 'initial_investment_experience',
                'amount', v_experience_reward_amount
            ));
        END IF;
    END IF;
    -- --- End of Task Logic ---

    RETURN v_new_investment_id;
END;
$$;
