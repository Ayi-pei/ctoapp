-- supabase.sql
-- This script is designed to be idempotent and can be run multiple times safely.

-- 1. EXTENSIONS
-- Enable the uuid-ossp extension if it's not already enabled.
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA extensions;


-- 2. HELPER FUNCTIONS FOR RLS
-- Drop the function if it exists to ensure the latest version is created.
DROP FUNCTION IF EXISTS public.is_admin();
-- Create a function to check if the current user is an admin.
-- This is more secure and efficient than using subqueries in every policy.
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 3. TABLES CREATION
-- Create the profiles table to store user information.
-- This table is linked to the auth.users table via a trigger.
CREATE TABLE IF NOT EXISTS public.profiles (
    id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    username text NOT NULL UNIQUE CHECK (char_length(username) >= 4 AND char_length(username) <= 20),
    nickname text NOT NULL,
    email text NOT NULL,
    inviter_id uuid REFERENCES public.profiles(id),
    is_admin boolean DEFAULT false NOT NULL,
    is_test_user boolean DEFAULT true NOT NULL,
    is_frozen boolean DEFAULT false NOT NULL,
    invitation_code text UNIQUE,
    credit_score integer DEFAULT 100 NOT NULL CHECK (credit_score >= 0),
    last_login_at timestamptz,
    avatar_url text,
    created_at timestamptz DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamptz DEFAULT timezone('utc'::text, now()) NOT NULL
);
COMMENT ON TABLE public.profiles IS 'Stores public-facing user profile information.';

-- Create the balances table to store user asset balances.
CREATE TABLE IF NOT EXISTS public.balances (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    asset text NOT NULL,
    available_balance numeric(30, 15) DEFAULT 0 NOT NULL,
    frozen_balance numeric(30, 15) DEFAULT 0 NOT NULL,
    updated_at timestamptz DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(user_id, asset)
);
COMMENT ON TABLE public.balances IS 'Stores available and frozen balances for each user and asset.';

-- Create the trades table to store user trading history.
CREATE TABLE IF NOT EXISTS public.trades (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    trading_pair text NOT NULL,
    type text NOT NULL, -- 'buy' or 'sell'
    order_type text NOT NULL, -- 'spot' or 'contract'
    status text NOT NULL, -- 'active', 'settled', 'filled', 'cancelled'
    amount numeric(30, 15) NOT NULL,
    price numeric(30, 15),
    entry_price numeric(30, 15),
    settlement_price numeric(30, 15),
    total numeric(30, 15),
    period integer,
    profit_rate numeric(10, 4),
    outcome text, -- 'win' or 'loss'
    profit numeric(30, 15),
    settlement_time timestamptz,
    base_asset text,
    quote_asset text,
    created_at timestamptz DEFAULT timezone('utc'::text, now()) NOT NULL
);
COMMENT ON TABLE public.trades IS 'Logs all spot and contract trades for users.';

-- Create the requests table for deposits, withdrawals, etc.
CREATE TABLE IF NOT EXISTS public.requests (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    type text NOT NULL, -- 'deposit', 'withdrawal', 'password_reset'
    asset text,
    amount numeric(30, 15),
    status text NOT NULL DEFAULT 'pending',
    address text,
    transaction_hash text,
    new_password text,
    created_at timestamptz DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamptz DEFAULT timezone('utc'::text, now()) NOT NULL
);
COMMENT ON TABLE public.requests IS 'Manages user requests like deposits and withdrawals for admin approval.';

-- Create the investments table.
CREATE TABLE IF NOT EXISTS public.investments (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    product_name text NOT NULL,
    amount numeric(30, 15) NOT NULL,
    status text NOT NULL DEFAULT 'active', -- 'active' or 'settled'
    category text NOT NULL, -- 'staking' or 'finance'
    product_type text, -- 'daily' or 'hourly'
    daily_rate numeric(10, 5),
    period integer,
    duration_hours integer,
    hourly_rate numeric(10, 5),
    profit numeric(30, 15),
    staking_asset text,
    staking_amount numeric(30, 15),
    created_at timestamptz DEFAULT timezone('utc'::text, now()) NOT NULL,
    settlement_date timestamptz NOT NULL
);
COMMENT ON TABLE public.investments IS 'Stores user investments in various financial products.';

-- Create the reward_logs table.
CREATE TABLE IF NOT EXISTS public.reward_logs (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    type text NOT NULL, -- 'dailyTask', 'team', 'event', 'system'
    amount numeric(30, 15) NOT NULL,
    asset text NOT NULL,
    source_id text,
    source_username text,
    source_level integer,
    description text,
    created_at timestamptz DEFAULT timezone('utc'::text, now()) NOT NULL
);
COMMENT ON TABLE public.reward_logs IS 'Records all rewards and commissions distributed to users.';

-- Create the daily_tasks table for admin configuration.
CREATE TABLE IF NOT EXISTS public.daily_tasks (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    title text NOT NULL,
    description text,
    reward numeric(30, 15) NOT NULL,
    reward_type text NOT NULL, -- 'usdt' or 'credit_score'
    link text,
    img_src text,
    status text NOT NULL DEFAULT 'draft', -- 'published' or 'draft'
    trigger text NOT NULL, -- 'contract_trade', 'spot_trade', etc.
    created_at timestamptz DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create the user_task_states table.
CREATE TABLE IF NOT EXISTS public.user_task_states (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    task_id uuid NOT NULL REFERENCES public.daily_tasks(id) ON DELETE CASCADE,
    date date NOT NULL,
    completed boolean DEFAULT false NOT NULL,
    UNIQUE(user_id, task_id, date)
);
COMMENT ON TABLE public.user_task_states IS 'Tracks completion of daily tasks for each user.';

-- Create the activities table for limited-time events.
CREATE TABLE IF NOT EXISTS public.activities (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    title text NOT NULL,
    description text,
    reward_rule text,
    how_to_claim text,
    expires_at timestamptz NOT NULL,
    img_src text,
    status text NOT NULL DEFAULT 'draft',
    created_at timestamptz DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create the announcements table for various types of content.
CREATE TABLE IF NOT EXISTS public.announcements (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    type text NOT NULL, -- 'personal_message', 'carousel', 'horn'
    content jsonb NOT NULL,
    created_at timestamptz DEFAULT timezone('utc'::text, now()) NOT NULL
);
COMMENT ON TABLE public.announcements IS 'Stores dynamic content like carousel slides, horn announcements, and personal messages.';

-- Create the investment_products table.
CREATE TABLE IF NOT EXISTS public.investment_products (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    name text NOT NULL,
    price numeric(30, 15) NOT NULL,
    daily_rate numeric(10, 5),
    period integer,
    max_purchase integer NOT NULL,
    img_src text,
    category text NOT NULL,
    product_type text,
    active_start_time text,
    active_end_time text,
    hourly_tiers jsonb,
    staking_asset text,
    staking_amount numeric(30, 15)
);

-- Create the action_logs table for admin auditing.
CREATE TABLE IF NOT EXISTS public.action_logs (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    entity_type text,
    entity_id text,
    action text,
    operator_id uuid REFERENCES public.profiles(id),
    operator_username text,
    details text,
    created_at timestamptz DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create the swap_orders table for P2P trading.
CREATE TABLE IF NOT EXISTS public.swap_orders (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    username text,
    from_asset text NOT NULL,
    from_amount numeric(30, 15) NOT NULL,
    to_asset text NOT NULL,
    to_amount numeric(30, 15) NOT NULL,
    status text NOT NULL DEFAULT 'open',
    taker_id uuid REFERENCES public.profiles(id),
    taker_username text,
    payment_proof_url text,
    created_at timestamptz DEFAULT timezone('utc'::text, now()) NOT NULL
);
COMMENT ON TABLE public.swap_orders IS 'Manages peer-to-peer asset swap orders.';

-- Create tables for market data.
CREATE TABLE IF NOT EXISTS public.market_summary_data (
    pair text PRIMARY KEY,
    price double precision NOT NULL,
    change double precision NOT NULL,
    volume double precision NOT NULL,
    high double precision NOT NULL,
    low double precision NOT NULL,
    icon text,
    updated_at timestamptz DEFAULT timezone('utc'::text, now()) NOT NULL
);
CREATE TABLE IF NOT EXISTS public.market_kline_data (
    id bigint GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
    trading_pair text NOT NULL,
    time timestamptz NOT NULL,
    open double precision NOT NULL,
    high double precision NOT NULL,
    low double precision NOT NULL,
    close double precision NOT NULL
);
CREATE TABLE IF NOT EXISTS public.system_settings (
    id integer PRIMARY KEY,
    settings jsonb
);

-- 4. INDEXES
-- Create indexes on frequently queried columns to improve performance.
CREATE INDEX IF NOT EXISTS idx_balances_user_id ON public.balances(user_id);
CREATE INDEX IF NOT EXISTS idx_trades_user_id ON public.trades(user_id);
CREATE INDEX IF NOT EXISTS idx_trades_trading_pair ON public.trades(trading_pair);
CREATE INDEX IF NOT EXISTS idx_requests_user_id ON public.requests(user_id);
CREATE INDEX IF NOT EXISTS idx_requests_status ON public.requests(status);
CREATE INDEX IF NOT EXISTS idx_investments_user_id ON public.investments(user_id);
CREATE INDEX IF NOT EXISTS idx_investments_status ON public.investments(status);
CREATE INDEX IF NOT EXISTS idx_reward_logs_user_id ON public.reward_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_user_task_states_user_id ON public.user_task_states(user_id);
CREATE INDEX IF NOT EXISTS idx_swap_orders_user_id ON public.swap_orders(user_id);
CREATE INDEX IF NOT EXISTS idx_swap_orders_status ON public.swap_orders(status);
CREATE INDEX IF NOT EXISTS idx_market_kline_data_pair_time ON public.market_kline_data(trading_pair, time DESC);


-- 5. TRIGGERS AND FUNCTIONS
-- Drop the function if it exists to ensure it can be updated.
DROP FUNCTION IF EXISTS public.handle_new_user();
-- This trigger automatically creates a profile entry when a new user signs up in Supabase Auth.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, username, nickname, email, invitation_code, inviter_id, credit_score, is_test_user, avatar_url)
  VALUES (
    new.id,
    new.raw_user_meta_data->>'username',
    new.raw_user_meta_data->>'nickname',
    new.email,
    new.raw_user_meta_data->>'invitation_code',
    (new.raw_user_meta_data->>'inviter_id')::uuid,
    (new.raw_user_meta_data->>'credit_score')::integer,
    (new.raw_user_meta_data->>'is_test_user')::boolean,
    new.raw_user_meta_data->>'avatar_url'
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
-- Drop the trigger if it exists.
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
-- Create the trigger.
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- This trigger automatically updates the `updated_at` timestamp on row modification.
DROP FUNCTION IF EXISTS public.handle_updated_at();
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS trigger AS $$
BEGIN
  new.updated_at = timezone('utc'::text, now());
  RETURN new;
END;
$$ LANGUAGE plpgsql;
-- Drop and create triggers for all relevant tables.
DROP TRIGGER IF EXISTS on_profiles_updated ON public.profiles;
CREATE TRIGGER on_profiles_updated BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
DROP TRIGGER IF EXISTS on_balances_updated ON public.balances;
CREATE TRIGGER on_balances_updated BEFORE UPDATE ON public.balances FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
DROP TRIGGER IF EXISTS on_requests_updated ON public.requests;
CREATE TRIGGER on_requests_updated BEFORE UPDATE ON public.requests FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();


-- 6. RPC FUNCTIONS
-- Function to adjust user balance, creating a record if it doesn't exist.
DROP FUNCTION IF EXISTS public.adjust_balance(uuid, text, numeric, boolean);
CREATE OR REPLACE FUNCTION public.adjust_balance(p_user_id uuid, p_asset text, p_amount numeric, p_is_frozen boolean DEFAULT false)
RETURNS void AS $$
BEGIN
  IF p_is_frozen THEN
    INSERT INTO public.balances(user_id, asset, frozen_balance)
    VALUES(p_user_id, p_asset, p_amount)
    ON CONFLICT(user_id, asset) DO UPDATE
    SET frozen_balance = public.balances.frozen_balance + p_amount;
  ELSE
    INSERT INTO public.balances(user_id, asset, available_balance)
    VALUES(p_user_id, p_asset, p_amount)
    ON CONFLICT(user_id, asset) DO UPDATE
    SET available_balance = public.balances.available_balance + p_amount;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Function to recursively get a user's downline.
DROP FUNCTION IF EXISTS public.get_downline(uuid);
CREATE OR REPLACE FUNCTION public.get_downline(p_user_id uuid)
RETURNS TABLE(id uuid, username text, nickname text, email text, inviter_id uuid, is_admin boolean, is_test_user boolean, is_frozen boolean, invitation_code text, credit_score integer, last_login_at timestamptz, avatar_url text, created_at timestamptz, level int) AS $$
BEGIN
  RETURN QUERY
  WITH RECURSIVE downline_cte AS (
    SELECT p.id, p.username, p.nickname, p.email, p.inviter_id, p.is_admin, p.is_test_user, p.is_frozen, p.invitation_code, p.credit_score, p.last_login_at, p.avatar_url, p.created_at, 1 AS level
    FROM public.profiles p
    WHERE p.inviter_id = p_user_id

    UNION ALL

    SELECT p.id, p.username, p.nickname, p.email, p.inviter_id, p.is_admin, p.is_test_user, p.is_frozen, p.invitation_code, p.credit_score, p.last_login_at, p.avatar_url, p.created_at, d.level + 1
    FROM public.profiles p
    JOIN downline_cte d ON p.inviter_id = d.id
    WHERE d.level < 3
  )
  SELECT * FROM downline_cte;
END;
$$ LANGUAGE plpgsql;

-- Function to get total platform balance.
DROP FUNCTION IF EXISTS public.get_total_platform_balance();
CREATE OR REPLACE FUNCTION public.get_total_platform_balance()
RETURNS numeric AS $$
DECLARE
  total_balance numeric;
BEGIN
  SELECT COALESCE(SUM(available_balance), 0)
  INTO total_balance
  FROM public.balances
  WHERE asset = 'USDT'; -- Or whatever the main currency is
  RETURN total_balance;
END;
$$ LANGUAGE plpgsql;


-- 7. ROW-LEVEL SECURITY (RLS)
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

-- 8. RLS POLICIES
-- Drop existing policies before creating new ones to avoid conflicts.
DROP POLICY IF EXISTS "Allow authenticated users to read all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can view their own profile." ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile." ON public.profiles;
DROP POLICY IF EXISTS "Admins can manage all profiles." ON public.profiles;

DROP POLICY IF EXISTS "Users can view their own balances." ON public.balances;
DROP POLICY IF EXISTS "Admins can manage all balances." ON public.balances;

DROP POLICY IF EXISTS "Users can view their own trades." ON public.trades;
DROP POLICY IF EXISTS "Admins can manage all trades." ON public.trades;

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
DROP POLICY IF EXISTS "Public can read market data" ON public.market_summary_data;
DROP POLICY IF EXISTS "Public can read kline data" ON public.market_kline_data;
DROP POLICY IF EXISTS "Public can read system settings" ON public.system_settings;
DROP POLICY IF EXISTS "Admins can manage content tables" ON public.daily_tasks;
DROP POLICY IF EXISTS "Admins can manage content tables" ON public.activities;
DROP POLICY IF EXISTS "Admins can manage content tables" ON public.announcements;
DROP POLICY IF EXISTS "Admins can manage content tables" ON public.investment_products;
DROP POLICY IF EXISTS "Admins can manage logs" ON public.action_logs;


-- RLS Policies for PROFILES
CREATE POLICY "Allow authenticated users to read all profiles" ON public.profiles FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Users can update their own profile." ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Admins can manage all profiles." ON public.profiles FOR ALL USING (is_admin());

-- RLS Policies for BALANCES
CREATE POLICY "Users can view their own balances." ON public.balances FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage all balances." ON public.balances FOR ALL USING (is_admin());

-- RLS Policies for TRADES
CREATE POLICY "Users can view their own trades." ON public.trades FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all trades." ON public.trades FOR ALL USING (is_admin());

-- RLS Policies for REQUESTS
CREATE POLICY "Users can manage their own requests." ON public.requests FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage all requests." ON public.requests FOR ALL USING (is_admin());

-- RLS Policies for INVESTMENTS
CREATE POLICY "Users can view their own investments." ON public.investments FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all investments." ON public.investments FOR ALL USING (is_admin());

-- RLS Policies for REWARD_LOGS
CREATE POLICY "Users can view their own reward logs." ON public.reward_logs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all reward logs." ON public.reward_logs FOR ALL USING (is_admin());

-- RLS Policies for USER_TASK_STATES
CREATE POLICY "Users can manage their own task states." ON public.user_task_states FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage all task states." ON public.user_task_states FOR ALL USING (is_admin());

-- RLS Policies for SWAP_ORDERS
CREATE POLICY "Users can manage their own swap orders." ON public.swap_orders FOR ALL USING (auth.uid() = user_id OR auth.uid() = taker_id);
CREATE POLICY "Users can view open swap orders." ON public.swap_orders FOR SELECT USING (status = 'open');
CREATE POLICY "Admins can manage all swap orders." ON public.swap_orders FOR ALL USING (is_admin());


-- RLS Policies for PUBLIC and ADMIN-ONLY tables
ALTER TABLE public.daily_tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can read daily tasks" ON public.daily_tasks FOR SELECT USING (true);
CREATE POLICY "Admins can manage content tables" ON public.daily_tasks FOR ALL USING (is_admin());

ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can read activities" ON public.activities FOR SELECT USING (true);
CREATE POLICY "Admins can manage content tables" ON public.activities FOR ALL USING (is_admin());

ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can read announcements" ON public.announcements FOR SELECT USING (true);
CREATE POLICY "Admins can manage content tables" ON public.announcements FOR ALL USING (is_admin());

ALTER TABLE public.investment_products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can read investment products" ON public.investment_products FOR SELECT USING (true);
CREATE POLICY "Admins can manage content tables" ON public.investment_products FOR ALL USING (is_admin());

ALTER TABLE public.market_summary_data ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can read market data" ON public.market_summary_data FOR SELECT USING (true);

ALTER TABLE public.market_kline_data ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can read kline data" ON public.market_kline_data FOR SELECT USING (true);

ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can read system settings" ON public.system_settings FOR SELECT USING (true);
CREATE POLICY "Admins can manage system settings" ON public.system_settings FOR ALL USING (is_admin());

CREATE POLICY "Admins can manage logs" ON public.action_logs FOR ALL USING (is_admin());


-- 9. PUBLICATION FOR REALTIME
-- Drop existing publications if they exist to ensure a clean state.
DROP PUBLICATION IF EXISTS supabase_realtime;

-- Create a new publication for all tables to enable realtime functionality.
-- Supabase automatically adds tables with RLS enabled, but being explicit ensures clarity.
CREATE PUBLICATION supabase_realtime FOR ALL TABLES;
