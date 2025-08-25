
-- TradeFlow Supabase Schema
-- Version 2.0
-- This script is designed to be idempotent and can be run multiple times safely.

-- 1. EXTENSIONS
-- Enable the UUID extension if it's not already enabled.
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";


-- 2. TABLES
-- Create all tables with "IF NOT EXISTS" to prevent errors on re-runs.

-- Profiles table to store user data, linked to Supabase auth.
CREATE TABLE IF NOT EXISTS public.profiles (
    id uuid NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    username text UNIQUE,
    nickname text,
    email text UNIQUE,
    inviter_id uuid REFERENCES public.profiles(id),
    is_admin boolean DEFAULT false,
    is_test_user boolean DEFAULT true,
    is_frozen boolean DEFAULT false,
    invitation_code text UNIQUE,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    last_login_at timestamp with time zone,
    credit_score integer DEFAULT 100,
    avatar_url text
);
COMMENT ON TABLE public.profiles IS 'Stores public user profile information.';

-- Balances table for user assets.
CREATE TABLE IF NOT EXISTS public.balances (
    id uuid NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    asset text NOT NULL,
    available_balance numeric(30, 8) DEFAULT 0.00,
    frozen_balance numeric(30, 8) DEFAULT 0.00,
    CONSTRAINT unique_user_asset UNIQUE (user_id, asset)
);
COMMENT ON TABLE public.balances IS 'Stores available and frozen balances for each user and asset.';

-- Trades table for both spot and contract trades.
CREATE TABLE IF NOT EXISTS public.trades (
    id uuid NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    trading_pair text NOT NULL,
    type text NOT NULL CHECK (type IN ('buy', 'sell')),
    orderType text NOT NULL CHECK (orderType IN ('spot', 'contract')),
    status text NOT NULL,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    
    -- Spot specific
    base_asset text,
    quote_asset text,
    amount numeric(30, 8),
    total numeric(30, 8),

    -- Contract specific
    entry_price numeric(30, 8),
    settlement_time timestamp with time zone,
    period integer,
    profit_rate numeric(10, 4),
    settlement_price numeric(30, 8),
    outcome text,
    profit numeric(30, 8)
);
COMMENT ON TABLE public.trades IS 'Records all user spot and contract trades.';

-- Requests table for deposits, withdrawals, etc.
CREATE TABLE IF NOT EXISTS public.requests (
    id uuid NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    type text NOT NULL CHECK (type IN ('deposit', 'withdrawal', 'password_reset')),
    status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    
    -- Transaction specific
    asset text,
    amount numeric(30, 8),
    address text,
    transaction_hash text,
    
    -- Password reset specific
    new_password text
);
COMMENT ON TABLE public.requests IS 'Stores user requests like deposits, withdrawals, and password resets for admin approval.';

-- Investments table for financial products.
CREATE TABLE IF NOT EXISTS public.investments (
    id uuid NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    product_name text NOT NULL,
    amount numeric(30, 8) NOT NULL,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    settlement_date timestamp with time zone NOT NULL,
    status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'settled')),
    category text,
    profit numeric(30, 8),
    productType text,
    daily_rate numeric(10, 4),
    period integer,
    stakingAsset text,
    stakingAmount numeric(30, 8),
    duration_hours integer,
    hourly_rate numeric(10, 4)
);
COMMENT ON TABLE public.investments IS 'Tracks user investments in various financial products.';

-- Reward logs for commissions and other rewards.
CREATE TABLE IF NOT EXISTS public.reward_logs (
    id uuid NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    type text NOT NULL,
    amount numeric(30, 8) NOT NULL,
    asset text DEFAULT 'USDT',
    source_id text,
    source_username text,
    source_level integer,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    description text
);
COMMENT ON TABLE public.reward_logs IS 'Logs all rewards and commissions distributed to users.';

-- User task completion states.
CREATE TABLE IF NOT EXISTS public.user_task_states (
    id uuid NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    taskId text NOT NULL,
    date date NOT NULL,
    completed boolean DEFAULT false,
    CONSTRAINT unique_user_task_date UNIQUE (user_id, taskId, date)
);
COMMENT ON TABLE public.user_task_states IS 'Tracks daily task completion for each user.';

-- P2P swap orders.
CREATE TABLE IF NOT EXISTS public.swap_orders (
    id uuid NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
    "userId" uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    username text NOT NULL,
    "fromAsset" text NOT NULL,
    "fromAmount" numeric(30, 8) NOT NULL,
    "toAsset" text NOT NULL,
    "toAmount" numeric(30, 8) NOT NULL,
    status text NOT NULL,
    "createdAt" timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    "takerId" uuid REFERENCES public.profiles(id),
    "takerUsername" text,
    "paymentProofUrl" text
);
COMMENT ON TABLE public.swap_orders IS 'Stores peer-to-peer swap orders.';

-- Action logs for admin auditing.
CREATE TABLE IF NOT EXISTS public.action_logs (
    id uuid NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
    entity_type text,
    entity_id text,
    action text,
    operator_id uuid REFERENCES public.profiles(id),
    operator_username text,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    details text
);
COMMENT ON TABLE public.action_logs IS 'Records actions performed by administrators for auditing.';

-- Tables for content managed by admin (less strict schema).
CREATE TABLE IF NOT EXISTS public.daily_tasks (
    id uuid NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
    title text,
    description text,
    reward numeric,
    reward_type text,
    link text,
    status text,
    trigger text,
    "imgSrc" text
);

CREATE TABLE IF NOT EXISTS public.activities (
    id uuid NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
    title text,
    description text,
    "rewardRule" text,
    "howToClaim" text,
    "expiresAt" timestamp with time zone,
    status text,
    "imgSrc" text,
    "createdAt" timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.announcements (
    id uuid NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
    type text,
    user_id uuid REFERENCES public.profiles(id),
    title text,
    content jsonb, -- Can store horn announcements array, carousel text, or single message content
    date timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);
COMMENT ON TABLE public.announcements IS 'Flexible table for various types of announcements.';

CREATE TABLE IF NOT EXISTS public.investment_products (
    id uuid NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
    name text,
    price numeric,
    "dailyRate" numeric,
    period integer,
    "maxPurchase" integer,
    "imgSrc" text,
    category text,
    "productType" text,
    "activeStartTime" text,
    "activeEndTime" text,
    "hourlyTiers" jsonb,
    "stakingAsset" text,
    "stakingAmount" numeric
);

CREATE TABLE IF NOT EXISTS public.system_settings (
    id integer PRIMARY KEY,
    settings jsonb
);
COMMENT ON TABLE public.system_settings IS 'Stores all system-wide configurations in a single row.';

-- Tables for market data.
CREATE TABLE IF NOT EXISTS public.market_summary_data (
    pair text PRIMARY KEY,
    price numeric(30, 8),
    change numeric(10, 4),
    volume numeric(30, 8),
    high numeric(30, 8),
    low numeric(30, 8),
    icon text,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.market_kline_data (
    id uuid NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
    trading_pair text NOT NULL,
    time timestamp with time zone NOT NULL,
    open numeric(30, 8),
    high numeric(30, 8),
    low numeric(30, 8),
    close numeric(30, 8),
    CONSTRAINT unique_kline_point UNIQUE (trading_pair, time)
);


-- 3. TRIGGERS AND FUNCTIONS
-- Function to automatically create a profile when a new user signs up in Supabase Auth.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, username, nickname, invitation_code, inviter_id, is_test_user, avatar_url, credit_score)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'username',
    NEW.raw_user_meta_data->>'nickname',
    NEW.raw_user_meta_data->>'invitation_code',
    (NEW.raw_user_meta_data->>'inviter_id')::uuid,
    (NEW.raw_user_meta_data->>'is_test_user')::boolean,
    NEW.raw_user_meta_data->>'avatar_url',
    (NEW.raw_user_meta_data->>'credit_score')::integer
  );
  RETURN NEW;
END;
$$;

-- Trigger to call the function after a new user is created.
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to get all downline members for a given user.
CREATE OR REPLACE FUNCTION public.get_downline(p_user_id uuid)
RETURNS TABLE(id uuid, username text, nickname text, email text, inviter_id uuid, is_admin boolean, is_test_user boolean, is_frozen boolean, invitation_code text, created_at timestamp with time zone, last_login_at timestamp with time zone, credit_score integer, avatar_url text, level int)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    WITH RECURSIVE downline_cte AS (
        SELECT p.id, p.username, p.nickname, p.email, p.inviter_id, p.is_admin, p.is_test_user, p.is_frozen, p.invitation_code, p.created_at, p.last_login_at, p.credit_score, p.avatar_url, 1 AS level
        FROM public.profiles p
        WHERE p.inviter_id = p_user_id
        UNION ALL
        SELECT p.id, p.username, p.nickname, p.email, p.inviter_id, p.is_admin, p.is_test_user, p.is_frozen, p.invitation_code, p.created_at, p.last_login_at, p.credit_score, p.avatar_url, d.level + 1
        FROM public.profiles p
        JOIN downline_cte d ON p.inviter_id = d.id
    )
    SELECT * FROM downline_cte;
END;
$$;

-- Function to safely adjust user balances.
CREATE OR REPLACE FUNCTION public.adjust_balance(p_user_id uuid, p_asset text, p_amount numeric, p_is_frozen boolean DEFAULT false)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
    INSERT INTO public.balances (user_id, asset, available_balance, frozen_balance)
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

-- Function to get the total platform balance.
CREATE OR REPLACE FUNCTION public.get_total_platform_balance()
RETURNS numeric
LANGUAGE sql
AS $$
    SELECT COALESCE(SUM(available_balance), 0) FROM public.balances;
$$;


-- 4. INDEXES
-- Create indexes for frequently queried columns.
CREATE INDEX IF NOT EXISTS idx_profiles_invitation_code ON public.profiles(invitation_code);
CREATE INDEX IF NOT EXISTS idx_balances_user_id ON public.balances(user_id);
CREATE INDEX IF NOT EXISTS idx_trades_user_id ON public.trades(user_id);
CREATE INDEX IF NOT EXISTS idx_requests_user_id ON public.requests(user_id);
CREATE INDEX IF NOT EXISTS idx_investments_user_id ON public.investments(user_id);
CREATE INDEX IF NOT EXISTS idx_reward_logs_user_id ON public.reward_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_kline_data_pair_time ON public.market_kline_data(trading_pair, time DESC);


-- 5. ROW-LEVEL SECURITY (RLS)
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
DROP POLICY IF EXISTS "Public can read daily tasks" ON public.daily_tasks;
DROP POLICY IF EXISTS "Public can read activities" ON public.activities;
DROP POLICY IF EXISTS "Public can read announcements" ON public.announcements;
DROP POLICY IF EXISTS "Public can read investment products" ON public.investment_products;
DROP POLICY IF EXISTS "Admins can manage daily_tasks" ON public.daily_tasks;
DROP POLICY IF EXISTS "Admins can manage activities" ON public.activities;
DROP POLICY IF EXISTS "Admins can manage announcements" ON public.announcements;
DROP POLICY IF EXISTS "Admins can manage investment_products" ON public.investment_products;
DROP POLICY IF EXISTS "Admins can manage logs" ON public.action_logs;

-- Helper function to check admin status
CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT COALESCE((SELECT is_admin FROM public.profiles WHERE id = auth.uid()), false);
$$;

-- RLS Policies
CREATE POLICY "Users can view their own profile." ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update their own profile." ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Admins can manage all profiles." ON public.profiles FOR ALL USING (is_admin());

CREATE POLICY "Users can view their own balances." ON public.balances FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage all balances." ON public.balances FOR ALL USING (is_admin());

CREATE POLICY "Users can view their own trades." ON public.trades FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all trades." ON public.trades FOR ALL USING (is_admin());

CREATE POLICY "Users can manage their own requests." ON public.requests FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage all requests." ON public.requests FOR ALL USING (is_admin());

CREATE POLICY "Users can view their own investments." ON public.investments FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all investments." ON public.investments FOR ALL USING (is_admin());

CREATE POLICY "Users can view their own reward logs." ON public.reward_logs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all reward logs." ON public.reward_logs FOR ALL USING (is_admin());

CREATE POLICY "Users can manage their own task states." ON public.user_task_states FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage all task states." ON public.user_task_states FOR ALL USING (is_admin());

CREATE POLICY "Users can manage their own swap orders." ON public.swap_orders FOR ALL USING (auth.uid() = "userId" OR auth.uid() = "takerId");
CREATE POLICY "Users can view open swap orders." ON public.swap_orders FOR SELECT USING (status = 'open');
CREATE POLICY "Admins can manage all swap orders." ON public.swap_orders FOR ALL USING (is_admin());

CREATE POLICY "Public can read daily tasks" ON public.daily_tasks FOR SELECT USING (true);
CREATE POLICY "Public can read activities" ON public.activities FOR SELECT USING (true);
CREATE POLICY "Public can read announcements" ON public.announcements FOR SELECT USING (true);
CREATE POLICY "Public can read investment products" ON public.investment_products FOR SELECT USING (true);

CREATE POLICY "Admins can manage daily_tasks" ON public.daily_tasks FOR ALL USING (is_admin());
CREATE POLICY "Admins can manage activities" ON public.activities FOR ALL USING (is_admin());
CREATE POLICY "Admins can manage announcements" ON public.announcements FOR ALL USING (is_admin());
CREATE POLICY "Admins can manage investment_products" ON public.investment_products FOR ALL USING (is_admin());

CREATE POLICY "Admins can manage logs" ON public.action_logs FOR ALL USING (is_admin());


-- 6. PUBLICATION FOR REALTIME
-- Drop existing publications if they exist to avoid conflict.
DROP PUBLICATION IF EXISTS supabase_realtime;

-- Create a new publication for all tables to enable realtime functionality.
-- Supabase handles this automatically for tables with RLS enabled, 
-- but being explicit ensures all necessary tables are included.
CREATE PUBLICATION supabase_realtime FOR ALL TABLES;

-- Grant usage on schema to required roles
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;

-- Grant select on all tables to required roles
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon, authenticated;
