
-- 1. EXTENSIONS
-- Enable pg_cron for scheduled tasks
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;

-- Enable pgcrypto for UUID generation if not already enabled
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;


-- 2. TABLES
-- Create a table for public user profiles
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid NOT NULL PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  updated_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  username text UNIQUE,
  nickname text,
  avatar_url text,
  email text UNIQUE,
  invitation_code text UNIQUE,
  inviter_id uuid REFERENCES public.profiles(id),
  is_admin boolean DEFAULT false,
  is_test_user boolean DEFAULT true,
  is_frozen boolean DEFAULT false,
  credit_score integer DEFAULT 100
);
-- Add comments to tables and columns
COMMENT ON TABLE public.profiles IS 'Public profile information for each user.';
COMMENT ON COLUMN public.profiles.id IS 'References the internal Supabase auth user.';

-- Create a table for user balances
CREATE TABLE IF NOT EXISTS public.balances (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  asset text NOT NULL,
  available_balance numeric NOT NULL DEFAULT 0,
  frozen_balance numeric NOT NULL DEFAULT 0,
  updated_at timestamp with time zone,
  UNIQUE(user_id, asset)
);
COMMENT ON TABLE public.balances IS 'Stores the available and frozen balances for each asset a user holds.';

-- Create a table for trades
CREATE TABLE IF NOT EXISTS public.trades (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    trading_pair text NOT NULL,
    type text NOT NULL CHECK (type IN ('buy', 'sell')),
    status text NOT NULL,
    orderType text NOT NULL,
    amount numeric NOT NULL,
    entry_price numeric,
    settlement_time timestamp with time zone,
    period integer,
    profit_rate numeric,
    settlement_price numeric,
    outcome text,
    profit numeric,
    base_asset text,
    quote_asset text,
    total numeric,
    price numeric,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);
COMMENT ON TABLE public.trades IS 'Records all user trades, both spot and contract.';

-- Create a table for user requests (deposits, withdrawals, etc.)
CREATE TABLE IF NOT EXISTS public.requests (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    type text NOT NULL,
    asset text,
    amount numeric,
    address text,
    transaction_hash text,
    new_password text,
    status text NOT NULL DEFAULT 'pending',
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);
COMMENT ON TABLE public.requests IS 'Manages user requests like deposits, withdrawals, and password resets.';

-- Create a table for investments
CREATE TABLE IF NOT EXISTS public.investments (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    product_name text NOT NULL,
    amount numeric NOT NULL,
    status text NOT NULL,
    category text,
    productType text,
    daily_rate numeric,
    period integer,
    duration_hours integer,
    hourly_rate numeric,
    staking_asset text,
    staking_amount numeric,
    profit numeric,
    settlement_date timestamp with time zone,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);
COMMENT ON TABLE public.investments IS 'Tracks user investments in various financial products.';

-- Create a table for reward logs
CREATE TABLE IF NOT EXISTS public.reward_logs (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    type text NOT NULL,
    amount numeric NOT NULL,
    asset text NOT NULL,
    source_id text,
    source_username text,
    source_level integer,
    description text,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);
COMMENT ON TABLE public.reward_logs IS 'Logs all rewards and commissions credited to users.';

-- Create a table for user task states
CREATE TABLE IF NOT EXISTS public.user_task_states (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    taskId text NOT NULL,
    date date NOT NULL,
    completed boolean DEFAULT false,
    UNIQUE(user_id, taskId, date)
);
COMMENT ON TABLE public.user_task_states IS 'Tracks daily task completion for each user.';

-- Create a table for P2P swap orders
CREATE TABLE IF NOT EXISTS public.swap_orders (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    username text NOT NULL,
    from_asset text NOT NULL,
    from_amount numeric NOT NULL,
    to_asset text NOT NULL,
    to_amount numeric NOT NULL,
    status text NOT NULL,
    taker_id uuid REFERENCES public.profiles(id),
    taker_username text,
    payment_proof_url text,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);
COMMENT ON TABLE public.swap_orders IS 'Stores peer-to-peer asset swap orders.';

-- Create tables for system content and settings (publicly readable)
CREATE TABLE IF NOT EXISTS public.daily_tasks (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    title text NOT NULL,
    description text,
    reward numeric NOT NULL,
    reward_type text,
    link text,
    status text,
    trigger text,
    imgSrc text
);

CREATE TABLE IF NOT EXISTS public.activities (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    title text NOT NULL,
    description text,
    rewardRule text,
    howToClaim text,
    expiresAt timestamp with time zone,
    imgSrc text,
    status text,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.announcements (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    type text NOT NULL,
    content jsonb,
    title text,
    user_id uuid REFERENCES public.profiles(id),
    date timestamp with time zone DEFAULT timezone('utc'::text, now()),
    is_read boolean,
    theme text,
    priority integer,
    expires_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS public.investment_products (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    name text NOT NULL,
    price numeric,
    dailyRate numeric,
    period integer,
    maxPurchase integer,
    imgSrc text,
    category text,
    productType text,
    activeStartTime text,
    activeEndTime text,
    hourlyTiers jsonb,
    stakingAsset text,
    stakingAmount numeric
);

CREATE TABLE IF NOT EXISTS public.action_logs (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    entity_type text,
    entity_id text,
    action text,
    operator_id uuid,
    operator_username text,
    details text,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.system_settings (
    id integer NOT NULL PRIMARY KEY,
    settings jsonb NOT NULL
);

-- Realtime Market Data Tables (no RLS, public access)
CREATE TABLE IF NOT EXISTS public.market_summary_data (
    pair text NOT NULL PRIMARY KEY,
    price numeric,
    change numeric,
    volume numeric,
    high numeric,
    low numeric,
    icon text,
    updated_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS public.market_kline_data (
    id BIGSERIAL PRIMARY KEY,
    trading_pair text NOT NULL,
    time timestamp with time zone NOT NULL,
    open numeric NOT NULL,
    high numeric NOT NULL,
    low numeric NOT NULL,
    close numeric NOT NULL,
    UNIQUE(trading_pair, time)
);


-- 3. INDEXES
-- Create indexes for foreign keys and commonly queried columns
CREATE INDEX IF NOT EXISTS idx_balances_user_id ON public.balances(user_id);
CREATE INDEX IF NOT EXISTS idx_trades_user_id ON public.trades(user_id);
CREATE INDEX IF NOT EXISTS idx_requests_user_id ON public.requests(user_id);
CREATE INDEX IF NOT EXISTS idx_investments_user_id ON public.investments(user_id);
CREATE INDEX IF NOT EXISTS idx_reward_logs_user_id ON public.reward_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_user_task_states_user_id ON public.user_task_states(user_id);
CREATE INDEX IF NOT EXISTS idx_swap_orders_user_id ON public.swap_orders(user_id);
CREATE INDEX IF NOT EXISTS idx_swap_orders_status ON public.swap_orders(status);
CREATE INDEX IF NOT EXISTS idx_market_kline_data_pair_time ON public.market_kline_data(trading_pair, time DESC);


-- 4. FUNCTIONS
-- Function to automatically create a public profile for a new user
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.profiles (id, username, nickname, email, invitation_code, inviter_id, is_admin, is_test_user, credit_score, avatar_url)
  VALUES (
    new.id,
    new.raw_user_meta_data->>'username',
    new.raw_user_meta_data->>'nickname',
    new.email,
    new.raw_user_meta_data->>'invitation_code',
    (new.raw_user_meta_data->>'inviter_id')::uuid,
    (new.raw_user_meta_data->>'is_admin')::boolean,
    (new.raw_user_meta_data->>'is_test_user')::boolean,
    (new.raw_user_meta_data->>'credit_score')::integer,
    new.raw_user_meta_data->>'avatar_url'
  );
  RETURN new;
END;
$$;

-- Function to handle automatic timestamp updates
CREATE OR REPLACE FUNCTION public.set_current_timestamp_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Function to adjust user balances
CREATE OR REPLACE FUNCTION public.adjust_balance(
  p_user_id uuid,
  p_asset text,
  p_amount numeric,
  p_is_frozen boolean DEFAULT false
)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO public.balances(user_id, asset, available_balance, frozen_balance)
  VALUES (p_user_id, p_asset, 0, 0)
  ON CONFLICT (user_id, asset) DO NOTHING;

  IF p_is_frozen THEN
    UPDATE public.balances
    SET frozen_balance = frozen_balance + p_amount
    WHERE user_id = p_user_id AND asset = p_asset;
  ELSE
    UPDATE public.balances
    SET available_balance = available_balance + p_amount
    WHERE user_id = p_user_id AND asset = p_asset;
  END IF;
END;
$$;

-- Function to get the total platform balance
CREATE OR REPLACE FUNCTION public.get_total_platform_balance()
RETURNS numeric
LANGUAGE sql
AS $$
  SELECT COALESCE(SUM(available_balance), 0) FROM public.balances;
$$;

-- Function to get a user's downline
DROP FUNCTION IF EXISTS public.get_downline(uuid);
CREATE OR REPLACE FUNCTION public.get_downline(p_user_id uuid)
RETURNS TABLE(id uuid, username text, email text, nickname text, is_admin boolean, is_test_user boolean, is_frozen boolean, invitation_code text, inviter_id uuid, created_at timestamp with time zone, credit_score integer, avatar_url text, level int)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  WITH RECURSIVE downline_cte AS (
    SELECT p.id, p.username, p.email, p.nickname, p.is_admin, p.is_test_user, p.is_frozen, p.invitation_code, p.inviter_id, p.created_at, p.credit_score, p.avatar_url, 1 AS level
    FROM public.profiles p
    WHERE p.inviter_id = p_user_id

    UNION ALL

    SELECT p.id, p.username, p.email, p.nickname, p.is_admin, p.is_test_user, p.is_frozen, p.invitation_code, p.inviter_id, p.created_at, p.credit_score, p.avatar_url, d.level + 1
    FROM public.profiles p
    JOIN downline_cte d ON p.inviter_id = d.id
    WHERE d.level < 3
  )
  SELECT * FROM downline_cte;
END;
$$;

-- Function to settle due records
CREATE OR REPLACE FUNCTION public.settle_due_records()
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
    trade_record record;
    investment_record record;
    profit_amount numeric;
BEGIN
    -- Settle due contract trades
    FOR trade_record IN
        SELECT * FROM public.trades
        WHERE status = 'active' AND orderType = 'contract' AND settlement_time <= now()
        FOR UPDATE
    LOOP
        -- Calculate profit/loss (simplified logic)
        profit_amount := CASE
            WHEN (trade_record.type = 'buy' AND (SELECT price FROM public.market_summary_data WHERE pair = trade_record.trading_pair) > trade_record.entry_price) THEN trade_record.amount * trade_record.profit_rate
            WHEN (trade_record.type = 'sell' AND (SELECT price FROM public.market_summary_data WHERE pair = trade_record.trading_pair) < trade_record.entry_price) THEN trade_record.amount * trade_record.profit_rate
            ELSE -trade_record.amount
        END;

        -- Update trade status and profit
        UPDATE public.trades
        SET status = 'settled', profit = profit_amount, outcome = CASE WHEN profit_amount > 0 THEN 'win' ELSE 'loss' END
        WHERE id = trade_record.id;

        -- Return principal and profit/loss to user's balance
        PERFORM public.adjust_balance(trade_record.user_id, (string_to_array(trade_record.trading_pair, '/'))[2], trade_record.amount + profit_amount);
    END LOOP;

    -- Settle due investments
    FOR investment_record IN
        SELECT * FROM public.investments
        WHERE status = 'active' AND settlement_date <= now()
        FOR UPDATE
    LOOP
        -- Calculate profit
        profit_amount := investment_record.amount * COALESCE(investment_record.daily_rate, 0) * COALESCE(investment_record.period, 0) + investment_record.amount * COALESCE(investment_record.hourly_rate, 0) * COALESCE(investment_record.duration_hours, 0);
        
        -- Update investment status
        UPDATE public.investments
        SET status = 'settled', profit = profit_amount
        WHERE id = investment_record.id;

        -- Return principal and profit
        PERFORM public.adjust_balance(investment_record.user_id, 'USDT', investment_record.amount + profit_amount);

        -- If it was a staking investment with a frozen balance, unfreeze it
        IF investment_record.staking_asset IS NOT NULL AND investment_record.staking_amount IS NOT NULL THEN
            PERFORM public.adjust_balance(investment_record.user_id, investment_record.staking_asset, investment_record.staking_amount, false);
            PERFORM public.adjust_balance(investment_record.user_id, investment_record.staking_asset, -investment_record.staking_amount, true);
        END IF;

    END LOOP;
END;
$$;

-- Function to distribute commissions up the chain
CREATE OR REPLACE FUNCTION public.distribute_trade_commissions()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
    inviter1_id uuid;
    inviter2_id uuid;
    inviter3_id uuid;
    trader_profile public.profiles;
    commission_amount numeric;
BEGIN
    -- Get the trader's profile
    SELECT * INTO trader_profile FROM public.profiles WHERE id = NEW.user_id;

    -- Level 1
    inviter1_id := trader_profile.inviter_id;
    IF inviter1_id IS NOT NULL THEN
        commission_amount := NEW.amount * 0.08;
        PERFORM public.adjust_balance(inviter1_id, 'USDT', commission_amount);
        INSERT INTO public.reward_logs(user_id, type, amount, asset, source_user_id, source_username, source_level, description)
        VALUES (inviter1_id, 'team', commission_amount, 'USDT', NEW.user_id, trader_profile.username, 1, 'Level 1 commission from ' || trader_profile.username);

        -- Level 2
        SELECT inviter_id INTO inviter2_id FROM public.profiles WHERE id = inviter1_id;
        IF inviter2_id IS NOT NULL THEN
            commission_amount := NEW.amount * 0.05;
            PERFORM public.adjust_balance(inviter2_id, 'USDT', commission_amount);
            INSERT INTO public.reward_logs(user_id, type, amount, asset, source_user_id, source_username, source_level, description)
            VALUES (inviter2_id, 'team', commission_amount, 'USDT', NEW.user_id, trader_profile.username, 2, 'Level 2 commission from ' || trader_profile.username);

            -- Level 3
            SELECT inviter_id INTO inviter3_id FROM public.profiles WHERE id = inviter2_id;
            IF inviter3_id IS NOT NULL THEN
                commission_amount := NEW.amount * 0.02;
                PERFORM public.adjust_balance(inviter3_id, 'USDT', commission_amount);
                INSERT INTO public.reward_logs(user_id, type, amount, asset, source_user_id, source_username, source_level, description)
                VALUES (inviter3_id, 'team', commission_amount, 'USDT', NEW.user_id, trader_profile.username, 3, 'Level 3 commission from ' || trader_profile.username);
            END IF;
        END IF;
    END IF;
    RETURN NEW;
END;
$$;

-- Helper function to check for admin privileges
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN (
    SELECT is_admin
    FROM public.profiles
    WHERE id = auth.uid()
  );
END;
$$;


-- 5. TRIGGERS
-- Trigger to create a profile when a new user signs up
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Trigger to update the 'updated_at' timestamp
DROP TRIGGER IF EXISTS handle_updated_at ON public.profiles;
CREATE TRIGGER handle_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE PROCEDURE public.set_current_timestamp_updated_at();

-- Trigger to distribute commissions after a trade
DROP TRIGGER IF EXISTS on_trade_insert_distribute_commission ON public.trades;
CREATE TRIGGER on_trade_insert_distribute_commission
  AFTER INSERT ON public.trades
  FOR EACH ROW
  WHEN (NEW.orderType = 'contract' AND NEW.status = 'active')
  EXECUTE FUNCTION public.distribute_trade_commissions();


-- 6. CRON JOBS
-- Schedule the settlement function to run every minute
SELECT cron.schedule('settle-due-records', '*/1 * * * *', 'SELECT public.settle_due_records()');


-- 7. ROW-LEVEL SECURITY (RLS)
-- Enable RLS for all user-specific tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.investments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reward_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_task_states ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.swap_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.action_logs ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Users can view their own profile." ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile." ON public.profiles;
DROP POLICY IF EXISTS "Admins can manage all profiles." ON public.profiles;

DROP POLICY IF EXISTS "Users can view their own balances." ON public.balances;
DROP POLICY IF EXISTS "Admins can manage all balances." ON public.balances;

DROP POLICY IF EXISTS "Users can view their own trades." ON public.trades;
DROP POLICY IF EXISTS "Admins can view all trades." ON public.trades;

DROP POLICY IF EXISTS "Users can manage their own requests." ON public.requests;
DROP POLICY IF EXISTS "Admins can manage all requests." ON public.requests;

DROP POLICY IF EXISTS "Users can view their own investments." ON public.investments;
DROP POLICY IF EXISTS "Admins can view all investments." ON public.investments;

DROP POLICY IF EXISTS "Users can view their own reward logs." ON public.reward_logs;
DROP POLICY IF EXISTS "Admins can view all reward logs." ON public.reward_logs;

DROP POLICY IF EXISTS "Users can manage their own task states." ON public.user_task_states;
DROP POLICY IF EXISTS "Admins can manage all task states." ON public.user_task_states;

DROP POLICY IF EXISTS "Users can manage their own swap orders." ON public.swap_orders;
DROP POLICY IF EXISTS "Users can view open swap orders." ON public.swap_orders;
DROP POLICY IF EXISTS "Admins can manage all swap orders." ON public.swap_orders;

DROP POLICY IF EXISTS "Admins can manage logs" ON public.action_logs;


-- RLS Policies for PROFILES
CREATE POLICY "Users can view their own profile." ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update their own profile." ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Admins can manage all profiles." ON public.profiles FOR ALL USING (public.is_admin());

-- RLS Policies for BALANCES
CREATE POLICY "Users can view their own balances." ON public.balances FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage all balances." ON public.balances FOR ALL USING (public.is_admin());

-- RLS Policies for TRADES
CREATE POLICY "Users can view their own trades." ON public.trades FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all trades." ON public.trades FOR ALL USING (public.is_admin());

-- RLS Policies for REQUESTS
CREATE POLICY "Users can manage their own requests." ON public.requests FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage all requests." ON public.requests FOR ALL USING (public.is_admin());

-- RLS Policies for INVESTMENTS
CREATE POLICY "Users can view their own investments." ON public.investments FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all investments." ON public.investments FOR ALL USING (public.is_admin());

-- RLS Policies for REWARD_LOGS
CREATE POLICY "Users can view their own reward logs." ON public.reward_logs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all reward logs." ON public.reward_logs FOR ALL USING (public.is_admin());

-- RLS Policies for USER_TASK_STATES
CREATE POLICY "Users can manage their own task states." ON public.user_task_states FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage all task states." ON public.user_task_states FOR ALL USING (public.is_admin());

-- RLS Policies for SWAP_ORDERS
CREATE POLICY "Users can manage their own swap orders." ON public.swap_orders FOR ALL USING (auth.uid() = user_id OR auth.uid() = taker_id);
CREATE POLICY "Users can view open swap orders." ON public.swap_orders FOR SELECT USING (status = 'open');
CREATE POLICY "Admins can manage all swap orders." ON public.swap_orders FOR ALL USING (public.is_admin());

-- RLS Policies for ACTION_LOGS
CREATE POLICY "Admins can manage logs" ON public.action_logs FOR ALL USING (public.is_admin());


-- 8. PUBLICATION FOR REALTIME
-- Drop existing publications if they exist to ensure a clean state
DROP PUBLICATION IF EXISTS supabase_realtime;

-- Create a new publication for all tables to enable realtime functionality
CREATE PUBLICATION supabase_realtime FOR ALL TABLES;
