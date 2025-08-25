-- 1. EXTENSIONS
-- Enable the pgcrypto extension for generating UUIDs.
CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";


-- 2. HELPER FUNCTIONS AND TRIGGERS
-- Create a helper function to check if the current user is an admin.
-- This function will be used in RLS policies for easier maintenance.
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true
  );
END;
$$;

-- Trigger function to automatically update 'updated_at' columns.
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = timezone('utc', now());
  RETURN NEW;
END;
$$;

-- Trigger function to create a profile entry when a new user signs up in auth.users.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.profiles (id, username, email, nickname, invitation_code, inviter_id, credit_score, is_test_user, is_admin, avatar_url)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data ->> 'username',
    NEW.email,
    NEW.raw_user_meta_data ->> 'nickname',
    NEW.raw_user_meta_data ->> 'invitation_code',
    (NEW.raw_user_meta_data ->> 'inviter_id')::uuid,
    (NEW.raw_user_meta_data ->> 'credit_score')::integer,
    (NEW.raw_user_meta_data ->> 'is_test_user')::boolean,
    (NEW.raw_user_meta_data ->> 'is_admin')::boolean,
    NEW.raw_user_meta_data ->> 'avatar_url'
  );
  RETURN NEW;
END;
$$;

-- Trigger that executes 'handle_new_user' after a new user is created.
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- 3. TABLES
-- Create PROFILES table to store public user data.
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username text NOT NULL UNIQUE,
  nickname text,
  email text,
  avatar_url text,
  is_admin boolean DEFAULT false,
  is_test_user boolean DEFAULT false,
  is_frozen boolean DEFAULT false,
  credit_score integer DEFAULT 100,
  invitation_code text UNIQUE,
  inviter_id uuid REFERENCES public.profiles(id),
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);

-- Create BALANCES table for user assets.
CREATE TABLE IF NOT EXISTS public.balances (
    id bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    asset text NOT NULL,
    available_balance numeric(36, 18) DEFAULT 0.0,
    frozen_balance numeric(36, 18) DEFAULT 0.0,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
    UNIQUE(user_id, asset)
);

-- Create TRADES table for user trade history.
CREATE TABLE IF NOT EXISTS public.trades (
    id bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    trading_pair text NOT NULL,
    orderType text NOT NULL, -- 'spot' or 'contract'
    type text NOT NULL, -- 'buy' or 'sell'
    status text NOT NULL, -- 'active', 'settled', 'filled', 'cancelled'
    amount numeric(36, 18) NOT NULL,
    price numeric(36, 18), -- Entry price for contract, fill price for spot
    total numeric(36, 18), -- For spot trades (amount * price)
    period integer, -- For contract trades (in seconds)
    profit_rate numeric(10, 4), -- For contract trades
    settlement_time timestamp with time zone, -- For contract trades
    settlement_price numeric(36, 18), -- For contract trades
    outcome text, -- 'win' or 'loss' for contract trades
    profit numeric(36, 18), -- For contract trades
    base_asset text, -- For spot trades
    quote_asset text, -- For spot trades
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);

-- Create REQUESTS table for deposits, withdrawals, etc.
CREATE TABLE IF NOT EXISTS public.requests (
    id bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    type text NOT NULL, -- 'deposit', 'withdrawal', 'password_reset'
    asset text,
    amount numeric(36, 18),
    address text,
    transaction_hash text,
    new_password text,
    status text NOT NULL DEFAULT 'pending',
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);

-- Create INVESTMENTS table.
CREATE TABLE IF NOT EXISTS public.investments (
    id bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    product_name text NOT NULL,
    amount numeric(36, 18) NOT NULL,
    status text NOT NULL DEFAULT 'active', -- 'active', 'settled'
    productType text, -- 'daily', 'hourly'
    category text, -- 'staking', 'finance'
    profit numeric(36, 18),
    daily_rate numeric(10, 8),
    period integer,
    duration_hours integer,
    hourly_rate numeric(10, 8),
    stakingAsset text,
    stakingAmount numeric(36, 18),
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
    settlement_date timestamp with time zone NOT NULL
);

-- Create REWARD_LOGS table.
CREATE TABLE IF NOT EXISTS public.reward_logs (
    id bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    type text NOT NULL, -- 'dailyTask', 'team', 'event', 'system'
    amount numeric(36, 18) NOT NULL,
    asset text NOT NULL,
    source_id text,
    source_username text,
    source_level integer,
    description text,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);

-- Create USER_TASK_STATES table.
CREATE TABLE IF NOT EXISTS public.user_task_states (
    id bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    taskId text NOT NULL,
    date date NOT NULL,
    completed boolean DEFAULT false,
    UNIQUE(user_id, taskId, date)
);

-- Create SWAP_ORDERS table.
CREATE TABLE IF NOT EXISTS public.swap_orders (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    username text NOT NULL,
    from_asset text NOT NULL,
    from_amount numeric(36, 18) NOT NULL,
    to_asset text NOT NULL,
    to_amount numeric(36, 18) NOT NULL,
    status text NOT NULL, -- 'open', 'pending_payment', etc.
    taker_id uuid REFERENCES public.profiles(id),
    taker_username text,
    payment_proof_url text,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);

-- Tables for system content, generally managed by admins.
CREATE TABLE IF NOT EXISTS public.daily_tasks (
    id bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    title text NOT NULL,
    description text,
    reward numeric(36, 18) NOT NULL,
    reward_type text NOT NULL, -- 'usdt' or 'credit_score'
    link text,
    imgSrc text,
    status text NOT NULL, -- 'published' or 'draft'
    trigger text NOT NULL -- 'contract_trade', 'spot_trade', 'investment'
);

CREATE TABLE IF NOT EXISTS public.activities (
    id bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    title text NOT NULL,
    description text,
    rewardRule text,
    howToClaim text,
    expiresAt timestamp with time zone NOT NULL,
    imgSrc text,
    status text NOT NULL, -- 'published' or 'draft'
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.announcements (
    id bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    type text NOT NULL, -- 'personal_message', 'carousel', 'horn'
    user_id uuid REFERENCES public.profiles(id), -- Null for global announcements
    title text,
    content jsonb, -- Flexible content for different types
    theme text, -- For horn announcements
    priority integer, -- For horn announcements
    expires_at timestamp with time zone,
    is_read boolean DEFAULT false,
    date timestamp with time zone DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.investment_products (
    id bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    name text NOT NULL,
    price numeric(36, 18) NOT NULL,
    dailyRate numeric(10, 8),
    period integer,
    maxPurchase integer NOT NULL,
    imgSrc text,
    category text NOT NULL, -- 'staking' or 'finance'
    productType text,
    activeStartTime text,
    activeEndTime text,
    hourlyTiers jsonb,
    stakingAsset text,
    stakingAmount numeric(36, 18)
);

CREATE TABLE IF NOT EXISTS public.action_logs (
    id bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    entity_type text,
    entity_id text,
    action text,
    operator_id uuid,
    operator_username text,
    details text,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);

-- Market data tables (no user_id, public or admin-writable)
CREATE TABLE IF NOT EXISTS public.market_summary_data (
    pair text PRIMARY KEY,
    price numeric(36, 18) DEFAULT 0.0,
    change numeric(10, 4) DEFAULT 0.0,
    volume numeric(36, 18) DEFAULT 0.0,
    high numeric(36, 18) DEFAULT 0.0,
    low numeric(36, 18) DEFAULT 0.0,
    icon text,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.market_kline_data (
    id bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    trading_pair text NOT NULL,
    time timestamp with time zone NOT NULL,
    open numeric(36, 18) NOT NULL,
    high numeric(36, 18) NOT NULL,
    low numeric(36, 18) NOT NULL,
    close numeric(36, 18) NOT NULL,
    UNIQUE(trading_pair, time)
);

-- System settings table (singleton)
CREATE TABLE IF NOT EXISTS public.system_settings (
    id integer PRIMARY KEY,
    settings jsonb
);

-- 4. TRIGGERS for updated_at
DROP TRIGGER IF EXISTS handle_updated_at ON public.profiles;
CREATE TRIGGER handle_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
DROP TRIGGER IF EXISTS handle_updated_at ON public.balances;
CREATE TRIGGER handle_updated_at BEFORE UPDATE ON public.balances FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
DROP TRIGGER IF EXISTS handle_updated_at ON public.requests;
CREATE TRIGGER handle_updated_at BEFORE UPDATE ON public.requests FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
DROP TRIGGER IF EXISTS handle_updated_at ON public.swap_orders;
CREATE TRIGGER handle_updated_at BEFORE UPDATE ON public.swap_orders FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
DROP TRIGGER IF EXISTS handle_updated_at ON public.market_summary_data;
CREATE TRIGGER handle_updated_at BEFORE UPDATE ON public.market_summary_data FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- 5. INDEXES
CREATE INDEX IF NOT EXISTS idx_balances_user_id ON public.balances(user_id);
CREATE INDEX IF NOT EXISTS idx_trades_user_id ON public.trades(user_id);
CREATE INDEX IF NOT EXISTS idx_requests_user_id ON public.requests(user_id);
CREATE INDEX IF NOT EXISTS idx_requests_status ON public.requests(status);
CREATE INDEX IF NOT EXISTS idx_investments_user_id ON public.investments(user_id);
CREATE INDEX IF NOT EXISTS idx_investments_status ON public.investments(status);
CREATE INDEX IF NOT EXISTS idx_reward_logs_user_id ON public.reward_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_user_task_states_user_id ON public.user_task_states(user_id);
CREATE INDEX IF NOT EXISTS idx_swap_orders_user_id ON public.swap_orders(user_id);
CREATE INDEX IF NOT EXISTS idx_swap_orders_status ON public.swap_orders(status);
CREATE INDEX IF NOT EXISTS idx_market_kline_data_pair_time ON public.market_kline_data(trading_pair, time DESC);


-- 6. RPC FUNCTIONS
-- Function to get all downline users recursively
DROP FUNCTION IF EXISTS public.get_downline(uuid);
CREATE OR REPLACE FUNCTION public.get_downline(p_user_id uuid)
RETURNS TABLE (
    id uuid,
    username text,
    nickname text,
    email text,
    avatar_url text,
    is_admin boolean,
    is_test_user boolean,
    is_frozen boolean,
    credit_score integer,
    invitation_code text,
    inviter_id uuid,
    created_at timestamptz,
    level int
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  WITH RECURSIVE downline_cte AS (
    SELECT p.id, p.username, p.nickname, p.email, p.avatar_url, p.is_admin, p.is_test_user, p.is_frozen, p.credit_score, p.invitation_code, p.inviter_id, p.created_at, 1 AS level
    FROM public.profiles p
    WHERE p.inviter_id = p_user_id
    UNION ALL
    SELECT p.id, p.username, p.nickname, p.email, p.avatar_url, p.is_admin, p.is_test_user, p.is_frozen, p.credit_score, p.invitation_code, p.inviter_id, p.created_at, d.level + 1
    FROM public.profiles p
    JOIN downline_cte d ON p.inviter_id = d.id
  )
  SELECT * FROM downline_cte;
END;
$$;


-- Function to adjust user balances safely
CREATE OR REPLACE FUNCTION public.adjust_balance(p_user_id uuid, p_asset text, p_amount numeric, p_is_frozen boolean DEFAULT false)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
    current_available numeric;
    current_frozen numeric;
BEGIN
    IF p_is_frozen THEN
        INSERT INTO public.balances (user_id, asset, frozen_balance)
        VALUES (p_user_id, p_asset, p_amount)
        ON CONFLICT (user_id, asset)
        DO UPDATE SET frozen_balance = public.balances.frozen_balance + p_amount;
    ELSE
        INSERT INTO public.balances (user_id, asset, available_balance)
        VALUES (p_user_id, p_asset, p_amount)
        ON CONFLICT (user_id, asset)
        DO UPDATE SET available_balance = public.balances.available_balance + p_amount;
    END IF;

    -- Ensure available balance is not negative after adjustment
    SELECT available_balance, frozen_balance INTO current_available, current_frozen
    FROM public.balances WHERE user_id = p_user_id AND asset = p_asset;

    IF current_available < 0 THEN
      RAISE EXCEPTION 'Insufficient available balance for user %, asset %', p_user_id, p_asset;
    END IF;
     IF current_frozen < 0 THEN
      RAISE EXCEPTION 'Insufficient frozen balance for user %, asset %', p_user_id, p_asset;
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


-- 7. DEFAULT DATA SEEDING (optional, for initial setup)
-- Insert a placeholder row into system_settings if it doesn't exist
INSERT INTO public.system_settings (id, settings)
VALUES (1, '{}'::jsonb)
ON CONFLICT (id) DO NOTHING;

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
ALTER TABLE public.daily_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.investment_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.action_logs ENABLE ROW LEVEL SECURITY;


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
DROP POLICY IF EXISTS "Admins can manage content tables (daily_tasks)" ON public.daily_tasks;

DROP POLICY IF EXISTS "Public can read activities" ON public.activities;
DROP POLICY IF EXISTS "Admins can manage content tables (activities)" ON public.activities;

DROP POLICY IF EXISTS "Public can read announcements" ON public.announcements;
DROP POLICY IF EXISTS "Admins can manage content tables (announcements)" ON public.announcements;

DROP POLICY IF EXISTS "Public can read investment products" ON public.investment_products;
DROP POLICY IF EXISTS "Admins can manage content tables (investment_products)" ON public.investment_products;

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

-- RLS Policies for public content tables
CREATE POLICY "Public can read daily tasks" ON public.daily_tasks FOR SELECT USING (true);
CREATE POLICY "Public can read activities" ON public.activities FOR SELECT USING (true);
CREATE POLICY "Public can read announcements" ON public.announcements FOR SELECT USING (true);
CREATE POLICY "Public can read investment products" ON public.investment_products FOR SELECT USING (true);

-- RLS Policies for admin management of content
CREATE POLICY "Admins can manage content tables (daily_tasks)" ON public.daily_tasks FOR ALL USING (public.is_admin());
CREATE POLICY "Admins can manage content tables (activities)" ON public.activities FOR ALL USING (public.is_admin());
CREATE POLICY "Admins can manage content tables (announcements)" ON public.announcements FOR ALL USING (public.is_admin());
CREATE POLICY "Admins can manage content tables (investment_products)" ON public.investment_products FOR ALL USING (public.is_admin());
CREATE POLICY "Admins can manage logs" ON public.action_logs FOR ALL USING (public.is_admin());


-- 9. PUBLICATION FOR REALTIME
-- Drop existing publications if they exist
DROP PUBLICATION IF EXISTS supabase_realtime;

-- Create a new publication for all tables that need realtime updates on the client.
CREATE PUBLICATION supabase_realtime FOR TABLE public.market_summary_data, public.market_kline_data, public.swap_orders;
