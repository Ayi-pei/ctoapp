-- 1. EXTENSIONS
-- Enable the required pgcrypto extension for gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS pgcrypto;


-- 2. TABLES
-- Create all tables with "IF NOT EXISTS" to ensure the script is re-runnable.
-- All user ID related columns are now correctly typed as UUID.

-- Profiles Table: Stores public user data, linked to auth.users
CREATE TABLE IF NOT EXISTS public.profiles (
    id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    username text UNIQUE NOT NULL,
    nickname text,
    email text UNIQUE,
    inviter_id uuid REFERENCES public.profiles(id),
    is_admin boolean DEFAULT false,
    is_test_user boolean DEFAULT true,
    is_frozen boolean DEFAULT false,
    invitation_code text UNIQUE NOT NULL,
    credit_score integer DEFAULT 100,
    last_login_at timestamp with time zone,
    avatar_url text,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
    CONSTRAINT username_length CHECK (char_length(username) >= 3 AND char_length(username) <= 50)
);

-- Balances Table: Stores asset balances for each user
CREATE TABLE IF NOT EXISTS public.balances (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    asset text NOT NULL,
    available_balance numeric NOT NULL DEFAULT 0,
    frozen_balance numeric NOT NULL DEFAULT 0,
    UNIQUE (user_id, asset)
);

-- Trades Table: Stores all spot and contract trades
CREATE TABLE IF NOT EXISTS public.trades (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    trading_pair text NOT NULL,
    type text NOT NULL, -- 'buy' or 'sell'
    status text NOT NULL, -- 'active', 'settled', 'filled', 'cancelled'
    orderType text NOT NULL, -- 'contract' or 'spot'
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

-- Requests Table: For deposits, withdrawals, password resets
CREATE TABLE IF NOT EXISTS public.requests (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
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

-- Investments Table: For staking and finance products
CREATE TABLE IF NOT EXISTS public.investments (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    product_name text NOT NULL,
    amount numeric NOT NULL,
    status text NOT NULL,
    category text,
    productType text,
    daily_rate numeric,
    period integer,
    hourly_rate numeric,
    duration_hours integer,
    stakingAsset text,
    stakingAmount numeric,
    profit numeric,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
    settlement_date timestamp with time zone NOT NULL
);

-- Reward Logs Table
CREATE TABLE IF NOT EXISTS public.reward_logs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
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

-- User Task States Table
CREATE TABLE IF NOT EXISTS public.user_task_states (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    taskId text NOT NULL,
    date date NOT NULL,
    completed boolean DEFAULT false,
    UNIQUE (user_id, taskId, date)
);

-- Swap Orders Table
CREATE TABLE IF NOT EXISTS public.swap_orders (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "userId" uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    username text NOT NULL,
    "fromAsset" text NOT NULL,
    "fromAmount" numeric NOT NULL,
    "toAsset" text NOT NULL,
    "toAmount" numeric NOT NULL,
    status text NOT NULL,
    "createdAt" timestamp with time zone DEFAULT timezone('utc'::text, now()),
    "takerId" uuid REFERENCES public.profiles(id),
    "takerUsername" text,
    "paymentProofUrl" text
);

-- Content Management Tables (publicly readable)
CREATE TABLE IF NOT EXISTS public.daily_tasks (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    title text NOT NULL,
    description text,
    reward numeric NOT NULL,
    reward_type text NOT NULL,
    link text,
    "imgSrc" text,
    status text,
    trigger text
);

CREATE TABLE IF NOT EXISTS public.activities (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    title text NOT NULL,
    description text,
    "rewardRule" text,
    "howToClaim" text,
    "expiresAt" timestamp with time zone,
    "imgSrc" text,
    status text,
    "createdAt" timestamp with time zone DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.announcements (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    type text NOT NULL,
    title text,
    content jsonb, -- Flexible for different announcement types
    theme text,
    priority integer,
    expires_at timestamp with time zone,
    user_id uuid REFERENCES public.profiles(id),
    UNIQUE (type)
);

CREATE TABLE IF NOT EXISTS public.investment_products (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    price numeric NOT NULL,
    "dailyRate" numeric,
    period integer,
    "maxPurchase" integer NOT NULL,
    "imgSrc" text,
    category text NOT NULL,
    "productType" text,
    "activeStartTime" text,
    "activeEndTime" text,
    "hourlyTiers" jsonb,
    "stakingAsset" text,
    "stakingAmount" numeric
);

-- Admin & System Tables
CREATE TABLE IF NOT EXISTS public.action_logs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_type text,
    entity_id text,
    action text,
    operator_id uuid,
    operator_username text,
    details text,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.system_settings (
    id integer PRIMARY KEY,
    settings jsonb,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);

-- Market Data Tables
CREATE TABLE IF NOT EXISTS public.market_summary_data (
    pair text PRIMARY KEY,
    price numeric NOT NULL,
    change numeric NOT NULL,
    volume numeric NOT NULL,
    high numeric,
    low numeric,
    icon text,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.market_kline_data (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    trading_pair text NOT NULL,
    time timestamp with time zone NOT NULL,
    open numeric NOT NULL,
    high numeric NOT NULL,
    low numeric NOT NULL,
    close numeric NOT NULL,
    UNIQUE (trading_pair, time)
);


-- 3. TRIGGERS AND FUNCTIONS
-- This function runs every time a new user signs up.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
    INSERT INTO public.profiles (id, username, nickname, email, invitation_code, inviter_id, is_test_user, credit_score, avatar_url)
    VALUES (
        new.id,
        new.raw_user_meta_data->>'username',
        new.raw_user_meta_data->>'nickname',
        new.email,
        new.raw_user_meta_data->>'invitation_code',
        (new.raw_user_meta_data->>'inviter_id')::uuid,
        (new.raw_user_meta_data->>'is_test_user')::boolean,
        (new.raw_user_meta_data->>'credit_score')::integer,
        new.raw_user_meta_data->>'avatar_url'
    );
    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to call the function after a new user is created in the auth schema
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
    
-- Function to update the `updated_at` timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = timezone('utc', now()); 
   RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to auto-update `updated_at` on profiles change
DROP TRIGGER IF EXISTS handle_profiles_update ON public.profiles;
CREATE TRIGGER handle_profiles_update
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Function to get all downline members recursively
-- Drop the function if it exists to allow for signature changes
DROP FUNCTION IF EXISTS public.get_downline(uuid);
CREATE OR REPLACE FUNCTION public.get_downline(p_user_id uuid)
RETURNS TABLE(id uuid, username text, nickname text, email text, inviter_id uuid, is_admin boolean, is_test_user boolean, is_frozen boolean, invitation_code text, created_at timestamp with time zone, credit_score integer, last_login_at timestamp with time zone, avatar_url text, level int) AS $$
BEGIN
    RETURN QUERY
    WITH RECURSIVE downline_cte AS (
        SELECT p.id, p.username, p.nickname, p.email, p.inviter_id, p.is_admin, p.is_test_user, p.is_frozen, p.invitation_code, p.created_at, p.credit_score, p.last_login_at, p.avatar_url, 1 AS level
        FROM public.profiles p
        WHERE p.inviter_id = p_user_id

        UNION ALL

        SELECT p.id, p.username, p.nickname, p.email, p.inviter_id, p.is_admin, p.is_test_user, p.is_frozen, p.invitation_code, p.created_at, p.credit_score, p.last_login_at, p.avatar_url, d.level + 1
        FROM public.profiles p
        JOIN downline_cte d ON p.inviter_id = d.id
    )
    SELECT id, username, nickname, email, inviter_id, is_admin, is_test_user, is_frozen, invitation_code, created_at, credit_score, last_login_at, avatar_url, level
    FROM downline_cte;
END;
$$ LANGUAGE plpgsql;


-- Function to adjust user balances safely
CREATE OR REPLACE FUNCTION public.adjust_balance(p_user_id uuid, p_asset text, p_amount numeric, p_is_frozen boolean DEFAULT false)
RETURNS void AS $$
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
END;
$$ LANGUAGE plpgsql;


-- Function to get the total balance of all users (for admin dashboard)
CREATE OR REPLACE FUNCTION public.get_total_platform_balance()
RETURNS numeric AS $$
DECLARE
    total_balance numeric;
BEGIN
    SELECT COALESCE(sum(available_balance), 0)
    INTO total_balance
    FROM public.balances;
    
    RETURN total_balance;
END;
$$ LANGUAGE plpgsql;


-- 4. INDEXES
-- Create indexes on frequently queried columns.
CREATE INDEX IF NOT EXISTS idx_profiles_invitation_code ON public.profiles(invitation_code);
CREATE INDEX IF NOT EXISTS idx_profiles_inviter_id ON public.profiles(inviter_id);
CREATE INDEX IF NOT EXISTS idx_balances_user_id ON public.balances(user_id);
CREATE INDEX IF NOT EXISTS idx_trades_user_id ON public.trades(user_id);
CREATE INDEX IF NOT EXISTS idx_requests_user_id ON public.requests(user_id);
CREATE INDEX IF NOT EXISTS idx_investments_user_id ON public.investments(user_id);
CREATE INDEX IF NOT EXISTS idx_reward_logs_user_id ON public.reward_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_user_task_states_user_id ON public.user_task_states(user_id);
CREATE INDEX IF NOT EXISTS idx_swap_orders_status ON public.swap_orders(status);


-- 5. ROW-LEVEL SECURITY (RLS)
-- Enable RLS for all tables that store user-specific or sensitive data.
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
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;


-- 6. RLS POLICIES
-- Drop existing policies before creating new ones to avoid conflicts.
-- This makes the script idempotent.

-- Policies for PROFILES
DROP POLICY IF EXISTS "Users can view their own profile." ON public.profiles;
CREATE POLICY "Users can view their own profile." ON public.profiles FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update their own profile." ON public.profiles;
CREATE POLICY "Users can update their own profile." ON public.profiles FOR UPDATE USING (auth.uid() = id);

DROP POLICY IF EXISTS "Admins can manage all profiles." ON public.profiles;
CREATE POLICY "Admins can manage all profiles." ON public.profiles FOR ALL USING ((SELECT is_admin FROM public.profiles WHERE id = auth.uid()));

-- Policies for BALANCES
DROP POLICY IF EXISTS "Users can view their own balances." ON public.balances;
CREATE POLICY "Users can view their own balances." ON public.balances FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can manage all balances." ON public.balances;
CREATE POLICY "Admins can manage all balances." ON public.balances FOR ALL USING ((SELECT is_admin FROM public.profiles WHERE id = auth.uid()));

-- Policies for TRADES
DROP POLICY IF EXISTS "Users can view their own trades." ON public.trades;
CREATE POLICY "Users can view their own trades." ON public.trades FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can view all trades." ON public.trades;
CREATE POLICY "Admins can view all trades." ON public.trades FOR ALL USING ((SELECT is_admin FROM public.profiles WHERE id = auth.uid()));

-- Policies for REQUESTS
DROP POLICY IF EXISTS "Users can manage their own requests." ON public.requests;
CREATE POLICY "Users can manage their own requests." ON public.requests FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can manage all requests." ON public.requests;
CREATE POLICY "Admins can manage all requests." ON public.requests FOR ALL USING ((SELECT is_admin FROM public.profiles WHERE id = auth.uid()));

-- Policies for INVESTMENTS
DROP POLICY IF EXISTS "Users can view their own investments." ON public.investments;
CREATE POLICY "Users can view their own investments." ON public.investments FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can view all investments." ON public.investments;
CREATE POLICY "Admins can view all investments." ON public.investments FOR ALL USING ((SELECT is_admin FROM public.profiles WHERE id = auth.uid()));

-- Policies for REWARD_LOGS
DROP POLICY IF EXISTS "Users can view their own reward logs." ON public.reward_logs;
CREATE POLICY "Users can view their own reward logs." ON public.reward_logs FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can view all reward logs." ON public.reward_logs;
CREATE POLICY "Admins can view all reward logs." ON public.reward_logs FOR ALL USING ((SELECT is_admin FROM public.profiles WHERE id = auth.uid()));

-- Policies for USER_TASK_STATES
DROP POLICY IF EXISTS "Users can manage their own task states." ON public.user_task_states;
CREATE POLICY "Users can manage their own task states." ON public.user_task_states FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can manage all task states." ON public.user_task_states;
CREATE POLICY "Admins can manage all task states." ON public.user_task_states FOR ALL USING ((SELECT is_admin FROM public.profiles WHERE id = auth.uid()));

-- Policies for SWAP_ORDERS
DROP POLICY IF EXISTS "Users can manage their own swap orders." ON public.swap_orders;
CREATE POLICY "Users can manage their own swap orders." ON public.swap_orders FOR ALL USING (auth.uid() = "userId" OR auth.uid() = "takerId");

DROP POLICY IF EXISTS "Users can view open swap orders." ON public.swap_orders;
CREATE POLICY "Users can view open swap orders." ON public.swap_orders FOR SELECT USING (status = 'open');

DROP POLICY IF EXISTS "Admins can manage all swap orders." ON public.swap_orders;
CREATE POLICY "Admins can manage all swap orders." ON public.swap_orders FOR ALL USING ((SELECT is_admin FROM public.profiles WHERE id = auth.uid()));

-- Policies for Content and Admin Tables
DROP POLICY IF EXISTS "Public can read content tables" ON public.daily_tasks;
CREATE POLICY "Public can read content tables" ON public.daily_tasks FOR SELECT USING (true);
DROP POLICY IF EXISTS "Admins can manage content tables" ON public.daily_tasks;
CREATE POLICY "Admins can manage content tables" ON public.daily_tasks FOR ALL USING ((SELECT is_admin FROM public.profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Public can read content tables" ON public.activities;
CREATE POLICY "Public can read content tables" ON public.activities FOR SELECT USING (true);
DROP POLICY IF EXISTS "Admins can manage content tables" ON public.activities;
CREATE POLICY "Admins can manage content tables" ON public.activities FOR ALL USING ((SELECT is_admin FROM public.profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Public can read content tables" ON public.announcements;
CREATE POLICY "Public can read content tables" ON public.announcements FOR SELECT USING (true);
DROP POLICY IF EXISTS "Admins can manage content tables" ON public.announcements;
CREATE POLICY "Admins can manage content tables" ON public.announcements FOR ALL USING ((SELECT is_admin FROM public.profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Public can read content tables" ON public.investment_products;
CREATE POLICY "Public can read content tables" ON public.investment_products FOR SELECT USING (true);
DROP POLICY IF EXISTS "Admins can manage content tables" ON public.investment_products;
CREATE POLICY "Admins can manage content tables" ON public.investment_products FOR ALL USING ((SELECT is_admin FROM public.profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Admins can manage logs" ON public.action_logs;
CREATE POLICY "Admins can manage logs" ON public.action_logs FOR ALL USING ((SELECT is_admin FROM public.profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Admins can manage system settings" ON public.system_settings;
CREATE POLICY "Admins can manage system settings" ON public.system_settings FOR ALL USING ((SELECT is_admin FROM public.profiles WHERE id = auth.uid()));


-- 7. PUBLICATION FOR REALTIME
-- Drop existing publication to ensure a clean slate
DROP PUBLICATION IF EXISTS supabase_realtime;

-- Create a publication for all tables that need realtime updates on the client.
-- Supabase handles this automatically for tables with RLS enabled and a primary key,
-- but explicitly creating it for specific tables can be a good practice for clarity.
CREATE PUBLICATION supabase_realtime FOR TABLE public.market_summary_data, public.market_kline_data, public.swap_orders;
