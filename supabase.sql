-- TradeFlow Supabase SQL Initialization Script
-- Version: 1.2
-- Description: A complete, idempotent script to set up the entire database schema,
-- including tables, functions, triggers, and row-level security policies.
-- This script can be run safely on a new or existing database.

-- 1. EXTENSIONS
-- Enable the pgcrypto extension for generating UUIDs, if not already enabled.
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";


-- 2. PROFILES TABLE
-- Stores public-facing user data, linked to Supabase's auth.users table.
CREATE TABLE IF NOT EXISTS public.profiles (
    id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    username text UNIQUE NOT NULL,
    nickname text,
    email text UNIQUE,
    inviter_id uuid REFERENCES public.profiles(id),
    is_admin boolean DEFAULT false NOT NULL,
    is_test_user boolean DEFAULT true NOT NULL,
    is_frozen boolean DEFAULT false NOT NULL,
    invitation_code text UNIQUE NOT NULL,
    credit_score integer DEFAULT 100 NOT NULL,
    avatar_url text,
    last_login_at timestamptz,
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz
);

-- Comments for profiles table
COMMENT ON TABLE public.profiles IS 'Stores public user profile information.';
COMMENT ON COLUMN public.profiles.id IS 'Links to auth.users table.';


-- 3. TRIGGER TO HANDLE NEW USER PROFILE CREATION
-- This function automatically creates a profile entry when a new user signs up.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, username, nickname, email, is_admin, is_test_user, credit_score, invitation_code, inviter_id, avatar_url)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'username',
    NEW.raw_user_meta_data->>'nickname',
    NEW.email,
    (NEW.raw_user_meta_data->>'is_admin')::boolean,
    (NEW.raw_user_meta_data->>'is_test_user')::boolean,
    (NEW.raw_user_meta_data->>'credit_score')::integer,
    NEW.raw_user_meta_data->>'invitation_code',
    (NEW.raw_user_meta_data->>'inviter_id')::uuid,
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$;

-- Drop the trigger if it exists, then create it.
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- 4. BALANCES TABLE
-- Stores asset balances for each user.
CREATE TABLE IF NOT EXISTS public.balances (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    asset text NOT NULL,
    available_balance numeric(30, 8) DEFAULT 0.00 NOT NULL,
    frozen_balance numeric(30, 8) DEFAULT 0.00 NOT NULL,
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz,
    UNIQUE(user_id, asset)
);

-- Comments for balances table
COMMENT ON TABLE public.balances IS 'Stores user asset balances.';


-- 5. TRADES TABLE
-- Stores records of all spot and contract trades.
CREATE TABLE IF NOT EXISTS public.trades (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    trading_pair text NOT NULL,
    type text NOT NULL, -- 'buy' or 'sell'
    orderType text NOT NULL, -- 'spot' or 'contract'
    status text NOT NULL, -- 'active', 'settled', 'filled', 'cancelled'
    amount numeric(30, 8) NOT NULL,
    price numeric(30, 8), -- entry_price for contract, exec price for spot
    total numeric(30, 8), -- For spot trades (amount * price)
    created_at timestamptz DEFAULT now() NOT NULL,
    -- Contract-specific fields
    settlement_time timestamptz,
    period integer,
    profit_rate numeric(10, 4),
    settlement_price numeric(30, 8),
    outcome text, -- 'win' or 'loss'
    profit numeric(30, 8),
    -- Spot-specific fields
    base_asset text,
    quote_asset text
);

-- Comments for trades table
COMMENT ON TABLE public.trades IS 'Logs all user spot and contract trades.';


-- 6. INVESTMENTS TABLE
-- Stores user investments in various products.
CREATE TABLE IF NOT EXISTS public.investments (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    product_name text NOT NULL,
    amount numeric(30, 8) NOT NULL,
    status text NOT NULL, -- 'active' or 'settled'
    category text, -- 'staking' or 'finance'
    profit numeric(30, 8),
    created_at timestamptz DEFAULT now() NOT NULL,
    settlement_date timestamptz NOT NULL,
    -- Product-specific snapshot
    productType text, -- 'daily' or 'hourly'
    daily_rate numeric(10, 4),
    period integer,
    duration_hours integer,
    hourly_rate numeric(10, 4),
    stakingAsset text,
    stakingAmount numeric(30, 8)
);

COMMENT ON TABLE public.investments IS 'Records user investments and their status.';


-- 7. REQUESTS TABLE
-- For user-submitted requests like deposits, withdrawals, etc.
CREATE TABLE IF NOT EXISTS public.requests (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    type text NOT NULL, -- 'deposit', 'withdrawal', 'password_reset'
    status text DEFAULT 'pending' NOT NULL, -- 'pending', 'approved', 'rejected'
    amount numeric(30, 8),
    asset text,
    address text,
    transaction_hash text,
    new_password text, -- For password resets
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz
);

COMMENT ON TABLE public.requests IS 'Manages user requests for admin approval.';


-- 8. SWAP ORDERS TABLE
CREATE TABLE IF NOT EXISTS public.swap_orders (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    "userId" uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    username text NOT NULL,
    "fromAsset" text NOT NULL,
    "fromAmount" numeric(30, 8) NOT NULL,
    "toAsset" text NOT NULL,
    "toAmount" numeric(30, 8) NOT NULL,
    status text NOT NULL,
    "createdAt" timestamptz DEFAULT now() NOT NULL,
    "takerId" uuid REFERENCES public.profiles(id),
    "takerUsername" text,
    "paymentProofUrl" text
);
COMMENT ON TABLE public.swap_orders IS 'Stores P2P swap orders.';


-- 9. OTHER DATA TABLES
-- These tables store system-wide data, not directly tied to a single user's core data.

-- Reward logs
CREATE TABLE IF NOT EXISTS public.reward_logs (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    type text NOT NULL, -- 'dailyTask', 'team', 'event', 'system'
    amount numeric(30, 8) NOT NULL,
    asset text NOT NULL,
    source_id text,
    source_username text,
    source_level integer,
    description text,
    created_at timestamptz DEFAULT now() NOT NULL
);

-- User task completion states
CREATE TABLE IF NOT EXISTS public.user_task_states (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    "taskId" uuid NOT NULL, -- References daily_tasks(id)
    date date NOT NULL,
    completed boolean DEFAULT false NOT NULL,
    created_at timestamptz DEFAULT now() NOT NULL,
    UNIQUE(user_id, "taskId", date)
);

-- Daily Tasks definitions (content managed by admin)
CREATE TABLE IF NOT EXISTS public.daily_tasks (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    title text NOT NULL,
    description text,
    reward numeric(30, 8) NOT NULL,
    reward_type text NOT NULL, -- 'usdt' or 'credit_score'
    link text,
    "imgSrc" text,
    status text DEFAULT 'draft' NOT NULL, -- 'published' or 'draft'
    trigger text UNIQUE NOT NULL
);

-- Limited Time Activities (content managed by admin)
CREATE TABLE IF NOT EXISTS public.activities (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    title text NOT NULL,
    description text,
    "rewardRule" text,
    "howToClaim" text,
    "expiresAt" timestamptz NOT NULL,
    "imgSrc" text,
    status text DEFAULT 'draft' NOT NULL,
    "createdAt" timestamptz DEFAULT now() NOT NULL
);

-- Announcements (carousel, horn, personal messages)
CREATE TABLE IF NOT EXISTS public.announcements (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    type text NOT NULL, -- 'carousel', 'horn', 'personal_message', 'platform'
    content jsonb, -- For structured data like carousel items
    title text, -- For simple announcements
    user_id uuid REFERENCES public.profiles(id), -- For personal messages
    theme text, -- For horn announcements
    priority integer, -- For horn announcements
    expires_at timestamptz, -- For horn announcements
    is_read boolean DEFAULT false,
    created_at timestamptz DEFAULT now() NOT NULL,
    UNIQUE(type)
);

-- Investment Products (content managed by admin)
CREATE TABLE IF NOT EXISTS public.investment_products (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    name text NOT NULL,
    price numeric(30, 8) NOT NULL,
    "dailyRate" numeric(10, 4),
    period integer,
    "maxPurchase" integer NOT NULL,
    "imgSrc" text,
    category text NOT NULL,
    "productType" text,
    "activeStartTime" text,
    "activeEndTime" text,
    "hourlyTiers" jsonb,
    "stakingAsset" text,
    "stakingAmount" numeric(30, 8)
);

-- Admin Action Logs
CREATE TABLE IF NOT EXISTS public.action_logs (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    entity_type text NOT NULL,
    entity_id text NOT NULL,
    action text NOT NULL,
    operator_id uuid NOT NULL REFERENCES public.profiles(id),
    operator_username text NOT NULL,
    details text,
    created_at timestamptz DEFAULT now() NOT NULL
);

-- System-wide Settings
CREATE TABLE IF NOT EXISTS public.system_settings (
    id integer PRIMARY KEY,
    settings jsonb NOT NULL
);

-- Market Data Tables (written to by backend jobs, read by clients)
CREATE TABLE IF NOT EXISTS public.market_summary_data (
    pair text PRIMARY KEY,
    price numeric(30, 8) NOT NULL,
    change numeric(10, 4) NOT NULL,
    volume numeric(30, 8) NOT NULL,
    high numeric(30, 8),
    low numeric(30, 8),
    icon text,
    updated_at timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.market_kline_data (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    trading_pair text NOT NULL,
    time timestamptz NOT NULL,
    open numeric(30, 8) NOT NULL,
    high numeric(30, 8) NOT NULL,
    low numeric(30, 8) NOT NULL,
    close numeric(30, 8) NOT NULL,
    UNIQUE(trading_pair, time)
);
CREATE INDEX IF NOT EXISTS market_kline_data_time_idx ON public.market_kline_data (time DESC);


-- 10. FUNCTIONS AND PROCEDURES

-- GET DOWNLINE (Recursive CTE)
-- Drop the function first to ensure it can be recreated even if the signature changes.
DROP FUNCTION IF EXISTS public.get_downline(uuid);
CREATE OR REPLACE FUNCTION public.get_downline(p_user_id uuid)
RETURNS TABLE(id uuid, username text, nickname text, email text, inviter_id uuid, is_admin boolean, is_test_user boolean, is_frozen boolean, invitation_code text, credit_score integer, avatar_url text, last_login_at timestamptz, created_at timestamptz, level int)
LANGUAGE sql
AS $$
  WITH RECURSIVE downline_cte AS (
    SELECT p.id, p.username, p.nickname, p.email, p.inviter_id, p.is_admin, p.is_test_user, p.is_frozen, p.invitation_code, p.credit_score, p.avatar_url, p.last_login_at, p.created_at, 1 AS level
    FROM public.profiles p
    WHERE p.inviter_id = p_user_id
    UNION ALL
    SELECT p.id, p.username, p.nickname, p.email, p.inviter_id, p.is_admin, p.is_test_user, p.is_frozen, p.invitation_code, p.credit_score, p.avatar_url, p.last_login_at, p.created_at, dct.level + 1
    FROM public.profiles p
    JOIN downline_cte dct ON p.inviter_id = dct.id
    WHERE dct.level < 3
  )
  SELECT * FROM downline_cte;
$$;


-- ADJUST BALANCE
CREATE OR REPLACE FUNCTION public.adjust_balance(p_user_id uuid, p_asset text, p_amount numeric, p_is_frozen boolean DEFAULT false)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  IF p_is_frozen THEN
    INSERT INTO public.balances(user_id, asset, frozen_balance)
    VALUES(p_user_id, p_asset, p_amount)
    ON CONFLICT (user_id, asset)
    DO UPDATE SET frozen_balance = public.balances.frozen_balance + p_amount;
  ELSE
    INSERT INTO public.balances(user_id, asset, available_balance)
    VALUES(p_user_id, p_asset, p_amount)
    ON CONFLICT (user_id, asset)
    DO UPDATE SET available_balance = public.balances.available_balance + p_amount;
  END IF;
END;
$$;

-- GET TOTAL PLATFORM BALANCE
DROP FUNCTION IF EXISTS public.get_total_platform_balance();
CREATE OR REPLACE FUNCTION public.get_total_platform_balance()
RETURNS numeric
LANGUAGE sql
AS $$
  SELECT COALESCE(SUM(available_balance), 0) FROM public.balances WHERE asset = 'USDT';
$$;


-- 11. ROW-LEVEL SECURITY (RLS)
-- Enable RLS for all tables that store user-specific or sensitive data.
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.investments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reward_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_task_states ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.swap_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.action_logs ENABLE ROW LEVEL SECURITY;

-- Drop existing policies before creating new ones to avoid conflicts.
DROP POLICY IF EXISTS "Allow admin full access" ON public.profiles;
DROP POLICY IF EXISTS "Users can view their own profile." ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile." ON public.profiles;

DROP POLICY IF EXISTS "Allow admin full access" ON public.balances;
DROP POLICY IF EXISTS "Users can view their own balances." ON public.balances;

DROP POLICY IF EXISTS "Allow admin full access" ON public.trades;
DROP POLICY IF EXISTS "Users can view their own trades." ON public.trades;

DROP POLICY IF EXISTS "Allow admin full access" ON public.requests;
DROP POLICY IF EXISTS "Users can manage their own requests." ON public.requests;

DROP POLICY IF EXISTS "Allow admin full access" ON public.investments;
DROP POLICY IF EXISTS "Users can view their own investments." ON public.investments;

DROP POLICY IF EXISTS "Allow admin full access" ON public.reward_logs;
DROP POLICY IF EXISTS "Users can view their own reward logs." ON public.reward_logs;

DROP POLICY IF EXISTS "Allow admin full access" ON public.user_task_states;
DROP POLICY IF EXISTS "Users can manage their own task states." ON public.user_task_states;

DROP POLICY IF EXISTS "Allow admin full access" ON public.swap_orders;
DROP POLICY IF EXISTS "Authenticated users can view open swap orders." ON public.swap_orders;
DROP POLICY IF EXISTS "Users can manage their own swap orders." ON public.swap_orders;

DROP POLICY IF EXISTS "Allow admin full access" ON public.action_logs;

-- Policies for PROFILES
CREATE POLICY "Allow admin full access" ON public.profiles FOR ALL USING ((SELECT is_admin FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "Users can view their own profile." ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update their own profile." ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Policies for BALANCES
CREATE POLICY "Allow admin full access" ON public.balances FOR ALL USING ((SELECT is_admin FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "Users can view their own balances." ON public.balances FOR SELECT USING (auth.uid() = user_id);

-- Policies for TRADES
CREATE POLICY "Allow admin full access" ON public.trades FOR ALL USING ((SELECT is_admin FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "Users can view their own trades." ON public.trades FOR SELECT USING (auth.uid() = user_id);

-- Policies for REQUESTS
CREATE POLICY "Allow admin full access" ON public.requests FOR ALL USING ((SELECT is_admin FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "Users can manage their own requests." ON public.requests FOR ALL USING (auth.uid() = user_id);

-- Policies for INVESTMENTS
CREATE POLICY "Allow admin full access" ON public.investments FOR ALL USING ((SELECT is_admin FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "Users can view their own investments." ON public.investments FOR SELECT USING (auth.uid() = user_id);

-- Policies for REWARD_LOGS
CREATE POLICY "Allow admin full access" ON public.reward_logs FOR ALL USING ((SELECT is_admin FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "Users can view their own reward logs." ON public.reward_logs FOR SELECT USING (auth.uid() = user_id);

-- Policies for USER_TASK_STATES
CREATE POLICY "Allow admin full access" ON public.user_task_states FOR ALL USING ((SELECT is_admin FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "Users can manage their own task states." ON public.user_task_states FOR ALL USING (auth.uid() = user_id);

-- Policies for SWAP_ORDERS
CREATE POLICY "Allow admin full access" ON public.swap_orders FOR ALL USING ((SELECT is_admin FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "Authenticated users can view open swap orders." ON public.swap_orders FOR SELECT USING (status = 'open' and auth.role() = 'authenticated');
CREATE POLICY "Users can manage their own swap orders." ON public.swap_orders FOR ALL USING (auth.uid() = "userId" OR auth.uid() = "takerId");

-- Policies for ACTION_LOGS (Admin only)
CREATE POLICY "Allow admin full access" ON public.action_logs FOR ALL USING ((SELECT is_admin FROM public.profiles WHERE id = auth.uid()));

-- Policies for Content and Settings tables (Public read, Admin manage)
-- Enable RLS first
ALTER TABLE public.daily_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.investment_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.market_summary_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.market_kline_data ENABLE ROW LEVEL SECURITY;

-- Drop policies
DROP POLICY IF EXISTS "Public can read" ON public.daily_tasks;
DROP POLICY IF EXISTS "Admins can manage" ON public.daily_tasks;
DROP POLICY IF EXISTS "Public can read" ON public.activities;
DROP POLICY IF EXISTS "Admins can manage" ON public.activities;
DROP POLICY IF EXISTS "Public can read" ON public.announcements;
DROP POLICY IF EXISTS "Admins can manage" ON public.announcements;
DROP POLICY IF EXISTS "Public can read" ON public.investment_products;
DROP POLICY IF EXISTS "Admins can manage" ON public.investment_products;
DROP POLICY IF EXISTS "Public can read" ON public.system_settings;
DROP POLICY IF EXISTS "Admins can manage" ON public.system_settings;
DROP POLICY IF EXISTS "Public can read" ON public.market_summary_data;
DROP POLICY IF EXISTS "Public can read" ON public.market_kline_data;

-- Create policies
CREATE POLICY "Public can read" ON public.daily_tasks FOR SELECT USING (true);
CREATE POLICY "Admins can manage" ON public.daily_tasks FOR ALL USING ((SELECT is_admin FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Public can read" ON public.activities FOR SELECT USING (true);
CREATE POLICY "Admins can manage" ON public.activities FOR ALL USING ((SELECT is_admin FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Public can read" ON public.announcements FOR SELECT USING (true);
CREATE POLICY "Admins can manage" ON public.announcements FOR ALL USING ((SELECT is_admin FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Public can read" ON public.investment_products FOR SELECT USING (true);
CREATE POLICY "Admins can manage" ON public.investment_products FOR ALL USING ((SELECT is_admin FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Public can read" ON public.system_settings FOR SELECT USING (true);
CREATE POLICY "Admins can manage" ON public.system_settings FOR ALL USING ((SELECT is_admin FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Public can read" ON public.market_summary_data FOR SELECT USING (true);
CREATE POLICY "Public can read" ON public.market_kline_data FOR SELECT USING (true);


-- 12. PUBLICATION FOR REALTIME
-- Drop existing publication to ensure a clean state, then create it for the tables that need realtime updates.
DROP PUBLICATION IF EXISTS supabase_realtime;
CREATE PUBLICATION supabase_realtime FOR TABLE public.market_summary_data, public.market_kline_data, public.swap_orders;
