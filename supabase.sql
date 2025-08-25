-- 1. EXTENSIONS
-- Enable pg_cron for scheduled jobs
CREATE EXTENSION IF NOT EXISTS "pg_cron" WITH SCHEMA "extensions";
-- Enable pgcrypto for generating random UUIDs
CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";

-- 2. HELPER FUNCTION - is_admin
-- Create a security definer function to check if the current user is an admin.
-- This is a robust way to reuse the admin check in RLS policies.
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if a profile exists for the current user and if they are an admin
  RETURN EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = auth.uid() AND is_admin = true
  );
END;
$$;

-- 3. TABLES
-- Create PROFILES table to store user data
CREATE TABLE IF NOT EXISTS public.profiles (
    id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    username text UNIQUE NOT NULL,
    nickname text,
    email text UNIQUE NOT NULL,
    inviter_id uuid REFERENCES public.profiles(id),
    is_admin boolean DEFAULT false,
    is_test_user boolean DEFAULT false,
    is_frozen boolean DEFAULT false,
    invitation_code text UNIQUE NOT NULL,
    credit_score integer DEFAULT 100,
    avatar_url text,
    last_login_at timestamptz,
    created_at timestamptz DEFAULT timezone('utc'::text, now()),
    updated_at timestamptz DEFAULT timezone('utc'::text, now()),

    CONSTRAINT username_length CHECK (char_length(username) >= 3 AND char_length(username) <= 50)
);
-- Add index on inviter_id for faster downline queries
CREATE INDEX IF NOT EXISTS idx_profiles_inviter_id ON public.profiles(inviter_id);

-- Create BALANCES table to store user asset balances
CREATE TABLE IF NOT EXISTS public.balances (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    asset text NOT NULL,
    available_balance numeric(30, 8) DEFAULT 0.00,
    frozen_balance numeric(30, 8) DEFAULT 0.00,
    updated_at timestamptz DEFAULT timezone('utc'::text, now()),

    UNIQUE (user_id, asset)
);
-- Add index on user_id for faster balance lookups
CREATE INDEX IF NOT EXISTS idx_balances_user_id ON public.balances(user_id);

-- Create TRADES table for both contract and spot trades
CREATE TABLE IF NOT EXISTS public.trades (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    trading_pair text NOT NULL,
    orderType text NOT NULL, -- 'contract' or 'spot'
    type text NOT NULL, -- 'buy' or 'sell'
    status text NOT NULL, -- 'active', 'settled', 'filled'
    amount numeric(30, 8) NOT NULL,
    entry_price numeric(30, 8),
    settlement_time timestamptz,
    period integer,
    profit_rate numeric(10, 4),
    settlement_price numeric(30, 8),
    outcome text,
    profit numeric(30, 8),
    total numeric(30, 8), -- for spot trades
    price numeric(30, 8), -- for spot trades
    base_asset text, -- for spot trades
    quote_asset text, -- for spot trades
    created_at timestamptz DEFAULT timezone('utc'::text, now())
);
-- Add indexes for common queries
CREATE INDEX IF NOT EXISTS idx_trades_user_id_status ON public.trades(user_id, status);
CREATE INDEX IF NOT EXISTS idx_trades_status ON public.trades(status);

-- Create REQUESTS table for deposits, withdrawals, etc.
CREATE TABLE IF NOT EXISTS public.requests (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    type text NOT NULL,
    asset text,
    amount numeric(30, 8),
    address text,
    transaction_hash text,
    new_password text,
    status text NOT NULL DEFAULT 'pending',
    created_at timestamptz DEFAULT timezone('utc'::text, now()),
    updated_at timestamptz DEFAULT timezone('utc'::text, now())
);
-- Add indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_requests_user_id ON public.requests(user_id);
CREATE INDEX IF NOT EXISTS idx_requests_status ON public.requests(status);


-- Create INVESTMENTS table
CREATE TABLE IF NOT EXISTS public.investments (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    product_name text NOT NULL,
    amount numeric(30, 8) NOT NULL,
    status text NOT NULL,
    category text,
    profit numeric(30, 8),
    productType text,
    daily_rate numeric(10, 4),
    period integer,
    staking_asset text,
    staking_amount numeric(30, 8),
    duration_hours integer,
    hourly_rate numeric(10, 4),
    settlement_date timestamptz NOT NULL,
    created_at timestamptz DEFAULT timezone('utc'::text, now()),
    updated_at timestamptz DEFAULT timezone('utc'::text, now())
);
-- Add indexes for common queries
CREATE INDEX IF NOT EXISTS idx_investments_user_id_status ON public.investments(user_id, status);
CREATE INDEX IF NOT EXISTS idx_investments_status_settlement_date ON public.investments(status, settlement_date);

-- Create REWARD_LOGS table for commissions and other rewards
CREATE TABLE IF NOT EXISTS public.reward_logs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    type text NOT NULL, -- 'team', 'dailyTask', etc.
    amount numeric(30, 8) NOT NULL,
    asset text NOT NULL,
    source_id text,
    source_username text,
    source_level integer,
    description text,
    created_at timestamptz DEFAULT timezone('utc'::text, now())
);
CREATE INDEX IF NOT EXISTS idx_reward_logs_user_id ON public.reward_logs(user_id);


-- Create USER_TASK_STATES table
CREATE TABLE IF NOT EXISTS public.user_task_states (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    taskId text NOT NULL,
    date date NOT NULL,
    completed boolean NOT NULL,

    UNIQUE(user_id, taskId, date)
);
CREATE INDEX IF NOT EXISTS idx_user_task_states_user_id_date ON public.user_task_states(user_id, date);

-- Create SWAP_ORDERS table for P2P swaps
CREATE TABLE IF NOT EXISTS public.swap_orders (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    username text,
    from_asset text NOT NULL,
    from_amount numeric(30, 8) NOT NULL,
    to_asset text NOT NULL,
    to_amount numeric(30, 8) NOT NULL,
    status text NOT NULL,
    taker_id uuid REFERENCES public.profiles(id),
    taker_username text,
    payment_proof_url text,
    created_at timestamptz DEFAULT timezone('utc'::text, now()),
    updated_at timestamptz DEFAULT timezone('utc'::text, now())
);
CREATE INDEX IF NOT EXISTS idx_swap_orders_status ON public.swap_orders(status);

-- Create tables for admin-managed content
CREATE TABLE IF NOT EXISTS public.daily_tasks (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    title text,
    description text,
    reward numeric(30, 8),
    reward_type text,
    link text,
    imgSrc text,
    status text,
    trigger text
);

CREATE TABLE IF NOT EXISTS public.activities (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    title text,
    description text,
    rewardRule text,
    howToClaim text,
    expiresAt timestamptz,
    imgSrc text,
    status text,
    createdAt timestamptz DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.announcements (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    type text NOT NULL, -- 'personal_message', 'carousel', 'horn'
    user_id uuid REFERENCES public.profiles(id),
    title text,
    content jsonb,
    theme text,
    priority integer,
    expires_at timestamptz,
    is_read boolean,
    date timestamptz DEFAULT timezone('utc'::text, now())
);
CREATE INDEX IF NOT EXISTS idx_announcements_type ON public.announcements(type);

CREATE TABLE IF NOT EXISTS public.investment_products (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text,
    price numeric(30, 8),
    dailyRate numeric(10, 4),
    period integer,
    maxPurchase integer,
    imgSrc text,
    category text,
    productType text,
    activeStartTime text,
    activeEndTime text,
    hourlyTiers jsonb,
    stakingAsset text,
    stakingAmount numeric(30, 8)
);

CREATE TABLE IF NOT EXISTS public.system_settings (
    id integer PRIMARY KEY,
    settings jsonb
);

CREATE TABLE IF NOT EXISTS public.action_logs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_type text,
    entity_id text,
    action text,
    operator_id uuid,
    operator_username text,
    details text,
    created_at timestamptz DEFAULT timezone('utc'::text, now())
);

-- Tables for market data storage
CREATE TABLE IF NOT EXISTS public.market_summary_data (
    pair text PRIMARY KEY,
    price numeric(30, 8) DEFAULT 0,
    change numeric(10, 4) DEFAULT 0,
    volume numeric(30, 8) DEFAULT 0,
    high numeric(30, 8) DEFAULT 0,
    low numeric(30, 8) DEFAULT 0,
    icon text,
    last_updated timestamptz DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.market_kline_data (
    trading_pair text NOT NULL,
    time timestamptz NOT NULL,
    open numeric(30, 8),
    high numeric(30, 8),
    low numeric(30, 8),
    close numeric(30, 8),
    PRIMARY KEY (trading_pair, time)
);
-- Create a hypertable for time-series data
SELECT create_hypertable('market_kline_data', 'time', if_not_exists => TRUE);
CREATE INDEX IF NOT EXISTS idx_market_kline_data_pair_time ON public.market_kline_data(trading_pair, time DESC);


-- 4. TRIGGERS
-- Create a function to automatically create a user profile upon new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.profiles (id, username, nickname, email, invitation_code, inviter_id, is_test_user, avatar_url, credit_score)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'username',
    NEW.raw_user_meta_data->>'nickname',
    NEW.email,
    NEW.raw_user_meta_data->>'invitation_code',
    (NEW.raw_user_meta_data->>'inviter_id')::uuid,
    (NEW.raw_user_meta_data->>'is_test_user')::boolean,
    NEW.raw_user_meta_data->>'avatar_url',
    (NEW.raw_user_meta_data->>'credit_score')::integer
  );
  RETURN NEW;
END;
$$;
-- Create the trigger on the auth.users table
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create a function to update the 'updated_at' timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$;
-- Apply the trigger to tables that need it
DROP TRIGGER IF EXISTS handle_profiles_update ON public.profiles;
CREATE TRIGGER handle_profiles_update BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
DROP TRIGGER IF EXISTS handle_requests_update ON public.requests;
CREATE TRIGGER handle_requests_update BEFORE UPDATE ON public.requests FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


-- 5. DATABASE FUNCTIONS
-- Function to adjust user balances (available or frozen)
CREATE OR REPLACE FUNCTION public.adjust_balance(p_user_id uuid, p_asset text, p_amount numeric, p_is_frozen boolean DEFAULT false, p_is_debit_frozen boolean DEFAULT false)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
    current_available numeric;
    current_frozen numeric;
BEGIN
    -- Ensure a balance record exists for the user and asset
    INSERT INTO public.balances (user_id, asset)
    VALUES (p_user_id, p_asset)
    ON CONFLICT (user_id, asset) DO NOTHING;

    -- Lock the row for update and get current balances
    SELECT available_balance, frozen_balance
    INTO current_available, current_frozen
    FROM public.balances
    WHERE user_id = p_user_id AND asset = p_asset
    FOR UPDATE;

    -- Perform the adjustment
    IF p_is_debit_frozen THEN
        -- This case is for debiting from the frozen balance (e.g., confirming a withdrawal)
        UPDATE public.balances
        SET frozen_balance = current_frozen + p_amount
        WHERE user_id = p_user_id AND asset = p_asset;
    ELSIF p_is_frozen THEN
        -- This case is for moving balance TO frozen (e.g., placing a trade, requesting a withdrawal)
        UPDATE public.balances
        SET available_balance = current_available - p_amount,
            frozen_balance = current_frozen + p_amount
        WHERE user_id = p_user_id AND asset = p_asset;
    ELSE
        -- This is a standard adjustment to the available balance
        UPDATE public.balances
        SET available_balance = current_available + p_amount
        WHERE user_id = p_user_id AND asset = p_asset;
    END IF;
END;
$$;


-- Function to get total platform balance (sum of all user USDT balances)
CREATE OR REPLACE FUNCTION public.get_total_platform_balance()
RETURNS numeric
LANGUAGE sql
AS $$
  SELECT COALESCE(SUM(available_balance + frozen_balance), 0)
  FROM public.balances
  WHERE asset = 'USDT';
$$;


-- Function to get a user's downline up to 3 levels
DROP FUNCTION IF EXISTS public.get_downline(uuid);
CREATE OR REPLACE FUNCTION public.get_downline(p_user_id uuid)
RETURNS TABLE(id uuid, username text, nickname text, email text, inviter_id uuid, is_admin boolean, is_test_user boolean, is_frozen boolean, invitation_code text, credit_score integer, avatar_url text, last_login_at timestamptz, created_at timestamptz, level int)
LANGUAGE sql
AS $$
  WITH RECURSIVE downline_cte AS (
    SELECT p.id, p.username, p.nickname, p.email, p.inviter_id, p.is_admin, p.is_test_user, p.is_frozen, p.invitation_code, p.credit_score, p.avatar_url, p.last_login_at, p.created_at, 1 as level
    FROM public.profiles p
    WHERE p.inviter_id = p_user_id

    UNION ALL

    SELECT p.id, p.username, p.nickname, p.email, p.inviter_id, p.is_admin, p.is_test_user, p.is_frozen, p.invitation_code, p.credit_score, p.avatar_url, p.last_login_at, p.created_at, d.level + 1
    FROM public.profiles p
    JOIN downline_cte d ON p.inviter_id = d.id
    WHERE d.level < 3
  )
  SELECT * FROM downline_cte;
$$;


-- 6. SETTLEMENT AND COMMISSION LOGIC
-- Function to settle all due trades and investments
CREATE OR REPLACE FUNCTION public.settle_due_records()
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
    due_trade RECORD;
    due_investment RECORD;
    settlement_profit numeric;
    latest_price numeric;
    outcome_result text;
BEGIN
    -- Settle due contract trades
    FOR due_trade IN
        SELECT * FROM public.trades
        WHERE status = 'active' AND settlement_time <= timezone('utc', now())
        FOR UPDATE
    LOOP
        -- Get the latest price from the summary table
        SELECT price INTO latest_price FROM public.market_summary_data WHERE pair = due_trade.trading_pair;

        -- Fallback if no summary price is available (should be rare)
        IF latest_price IS NULL THEN
            latest_price := due_trade.entry_price;
        END IF;

        IF due_trade.type = 'buy' THEN
            outcome_result := CASE WHEN latest_price > due_trade.entry_price THEN 'win' ELSE 'loss' END;
        ELSE -- 'sell'
            outcome_result := CASE WHEN latest_price < due_trade.entry_price THEN 'win' ELSE 'loss' END;
        END IF;

        settlement_profit := CASE WHEN outcome_result = 'win' THEN due_trade.amount * due_trade.profit_rate ELSE -due_trade.amount END;

        -- Update the trade record
        UPDATE public.trades
        SET status = 'settled',
            settlement_price = latest_price,
            outcome = outcome_result,
            profit = settlement_profit
        WHERE id = due_trade.id;

        -- Credit user's balance
        PERFORM public.adjust_balance(due_trade.user_id, due_trade.quote_asset, settlement_profit);
    END LOOP;

    -- Settle due investments
    FOR due_investment IN
        SELECT * FROM public.investments
        WHERE status = 'active' AND settlement_date <= timezone('utc', now())
        FOR UPDATE
    LOOP
        -- Calculate profit
        IF due_investment.productType = 'hourly' THEN
            settlement_profit := due_investment.amount * COALESCE(due_investment.hourly_rate, 0);
        ELSE -- daily
            settlement_profit := due_investment.amount * COALESCE(due_investment.daily_rate, 0) * COALESCE(due_investment.period, 1);
        END IF;

        -- Update the investment record
        UPDATE public.investments
        SET status = 'settled',
            profit = settlement_profit
        WHERE id = due_investment.id;

        -- Return principal + profit
        PERFORM public.adjust_balance(due_investment.user_id, 'USDT', due_investment.amount + settlement_profit);
        
        -- Unfreeze any staked assets
        IF due_investment.staking_asset IS NOT NULL AND due_investment.staking_amount > 0 THEN
             PERFORM public.adjust_balance(due_investment.user_id, due_investment.staking_asset, due_investment.staking_amount);
        END IF;

    END LOOP;

    RETURN;
END;
$$;


-- Function to distribute commissions up to 3 levels
CREATE OR REPLACE FUNCTION public.distribute_trade_commissions()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    v_inviter_id_l1 uuid;
    v_inviter_id_l2 uuid;
    v_inviter_id_l3 uuid;
    commission_amount_l1 numeric;
    commission_amount_l2 numeric;
    commission_amount_l3 numeric;
    COMMISSION_RATE_L1 numeric := 0.08;
    COMMISSION_RATE_L2 numeric := 0.05;
    COMMISSION_RATE_L3 numeric := 0.02;
    trade_amount numeric;
BEGIN
    -- Determine the amount to base commission on (total for spot, amount for contract)
    trade_amount := CASE WHEN NEW.orderType = 'spot' THEN NEW.total ELSE NEW.amount END;

    -- Find the 3 levels of inviters
    SELECT inviter_id INTO v_inviter_id_l1 FROM public.profiles WHERE id = NEW.user_id;
    IF v_inviter_id_l1 IS NOT NULL THEN
        SELECT inviter_id INTO v_inviter_id_l2 FROM public.profiles WHERE id = v_inviter_id_l1;
        IF v_inviter_id_l2 IS NOT NULL THEN
            SELECT inviter_id INTO v_inviter_id_l3 FROM public.profiles WHERE id = v_inviter_id_l2;
        END IF;
    END IF;

    -- Calculate and distribute commissions
    IF v_inviter_id_l1 IS NOT NULL THEN
        commission_amount_l1 := trade_amount * COMMISSION_RATE_L1;
        PERFORM public.adjust_balance(v_inviter_id_l1, 'USDT', commission_amount_l1);
        INSERT INTO public.reward_logs (user_id, type, amount, asset, source_id, source_username, source_level, description)
        VALUES (v_inviter_id_l1, 'team', commission_amount_l1, 'USDT', NEW.id::text, (SELECT username FROM public.profiles WHERE id = NEW.user_id), 1, 'Level 1 trade commission');
    END IF;

    IF v_inviter_id_l2 IS NOT NULL THEN
        commission_amount_l2 := trade_amount * COMMISSION_RATE_L2;
        PERFORM public.adjust_balance(v_inviter_id_l2, 'USDT', commission_amount_l2);
        INSERT INTO public.reward_logs (user_id, type, amount, asset, source_id, source_username, source_level, description)
        VALUES (v_inviter_id_l2, 'team', commission_amount_l2, 'USDT', NEW.id::text, (SELECT username FROM public.profiles WHERE id = NEW.user_id), 2, 'Level 2 trade commission');
    END IF;

    IF v_inviter_id_l3 IS NOT NULL THEN
        commission_amount_l3 := trade_amount * COMMISSION_RATE_L3;
        PERFORM public.adjust_balance(v_inviter_id_l3, 'USDT', commission_amount_l3);
        INSERT INTO public.reward_logs (user_id, type, amount, asset, source_id, source_username, source_level, description)
        VALUES (v_inviter_id_l3, 'team', commission_amount_l3, 'USDT', NEW.id::text, (SELECT username FROM public.profiles WHERE id = NEW.user_id), 3, 'Level 3 trade commission');
    END IF;

    RETURN NEW;
END;
$$;
-- Create the trigger to fire on new trades
DROP TRIGGER IF EXISTS on_new_trade_distribute_commissions ON public.trades;
CREATE TRIGGER on_new_trade_distribute_commissions
AFTER INSERT ON public.trades
FOR EACH ROW EXECUTE FUNCTION public.distribute_trade_commissions();


-- 7. SCHEDULED JOBS (CRON)
-- Schedule the settlement function to run every minute
SELECT cron.schedule(
    'settle-due-records-job',
    '* * * * *', -- every minute
    $$ SELECT public.settle_due_records() $$
);


-- 8. ROW-LEVEL SECURITY (RLS)
-- Enable RLS for all tables that store user-specific data.
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.investments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reward_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_task_states ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.swap_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.action_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.investment_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.market_summary_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.market_kline_data ENABLE ROW LEVEL SECURITY;

-- Drop existing policies before creating new ones to avoid conflicts.
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

-- POLICIES FOR PUBLIC & ADMIN-ONLY TABLES
DROP POLICY IF EXISTS "Public can read content tables" ON public.daily_tasks;
CREATE POLICY "Public can read content tables" ON public.daily_tasks FOR SELECT USING (true);
DROP POLICY IF EXISTS "Admins can manage content tables" ON public.daily_tasks;
CREATE POLICY "Admins can manage content tables" ON public.daily_tasks FOR ALL USING (public.is_admin());

DROP POLICY IF EXISTS "Public can read content tables" ON public.activities;
CREATE POLICY "Public can read content tables" ON public.activities FOR SELECT USING (true);
DROP POLICY IF EXISTS "Admins can manage content tables" ON public.activities;
CREATE POLICY "Admins can manage content tables" ON public.activities FOR ALL USING (public.is_admin());

DROP POLICY IF EXISTS "Public can read content tables" ON public.announcements;
CREATE POLICY "Public can read content tables" ON public.announcements FOR SELECT USING (true);
DROP POLICY IF EXISTS "Admins can manage content tables" ON public.announcements;
CREATE POLICY "Admins can manage content tables" ON public.announcements FOR ALL USING (public.is_admin());

DROP POLICY IF EXISTS "Public can read content tables" ON public.investment_products;
CREATE POLICY "Public can read content tables" ON public.investment_products FOR SELECT USING (true);
DROP POLICY IF EXISTS "Admins can manage content tables" ON public.investment_products;
CREATE POLICY "Admins can manage content tables" ON public.investment_products FOR ALL USING (public.is_admin());

DROP POLICY IF EXISTS "Public can read market data" ON public.market_summary_data;
CREATE POLICY "Public can read market data" ON public.market_summary_data FOR SELECT USING (true);
DROP POLICY IF EXISTS "Admins can manage market data" ON public.market_summary_data;
CREATE POLICY "Admins can manage market data" ON public.market_summary_data FOR ALL USING (public.is_admin());

DROP POLICY IF EXISTS "Public can read market data" ON public.market_kline_data;
CREATE POLICY "Public can read market data" ON public.market_kline_data FOR SELECT USING (true);
DROP POLICY IF EXISTS "Admins can manage market data" ON public.market_kline_data;
CREATE POLICY "Admins can manage market data" ON public.market_kline_data FOR ALL USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can manage system settings" ON public.system_settings;
CREATE POLICY "Admins can manage system settings" ON public.system_settings FOR ALL USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can manage logs" ON public.action_logs;
CREATE POLICY "Admins can manage logs" ON public.action_logs FOR ALL USING (public.is_admin());


-- 9. PUBLICATION FOR REALTIME
-- Drop existing publications if they exist
DROP PUBLICATION IF EXISTS supabase_realtime;

-- Create a new publication for all tables to enable realtime functionality
CREATE PUBLICATION supabase_realtime FOR ALL TABLES;
