-- supabase.sql
-- This script is designed to be idempotent, meaning it can be run multiple times safely.

-- 1. EXTENSIONS
-- Required for generating UUIDs
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. USER PROFILES TABLE
-- This table stores public user data and is linked to the authentication service.
CREATE TABLE IF NOT EXISTS public.profiles (
    id uuid NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    username text UNIQUE,
    nickname text,
    email text,
    inviter_id uuid REFERENCES public.profiles(id),
    is_admin boolean DEFAULT false,
    is_test_user boolean DEFAULT false,
    is_frozen boolean DEFAULT false,
    invitation_code text UNIQUE,
    credit_score integer DEFAULT 100,
    last_login_at timestamptz,
    avatar_url text,
    created_at timestamptz DEFAULT now()
);

-- Comments for profiles table
COMMENT ON TABLE public.profiles IS 'Stores public user data, linked to auth.users.';
COMMENT ON COLUMN public.profiles.id IS 'Links to auth.users.id';

-- 3. AUTO-CREATE PROFILE ON NEW USER SIGNUP
-- This trigger function automatically creates a new profile entry when a new user signs up.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, username, nickname, email, invitation_code, inviter_id, is_test_user, avatar_url, credit_score)
    VALUES (
        new.id,
        new.raw_user_meta_data->>'username',
        new.raw_user_meta_data->>'nickname',
        new.email,
        new.raw_user_meta_data->>'invitation_code',
        (new.raw_user_meta_data->>'inviter_id')::uuid,
        (new.raw_user_meta_data->>'is_test_user')::boolean,
        new.raw_user_meta_data->>'avatar_url',
        (new.raw_user_meta_data->>'credit_score')::integer
    );
    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop the trigger if it exists, then create it
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- 4. BALANCE AND TRANSACTION TABLES

CREATE TABLE IF NOT EXISTS public.balances (
    id uuid DEFAULT uuid_generate_v4() NOT NULL PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    asset text NOT NULL,
    available_balance numeric DEFAULT 0,
    frozen_balance numeric DEFAULT 0,
    UNIQUE (user_id, asset)
);
COMMENT ON TABLE public.balances IS 'Stores user asset balances.';

CREATE TABLE IF NOT EXISTS public.trades (
    id uuid DEFAULT uuid_generate_v4() NOT NULL PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    trading_pair text NOT NULL,
    type text NOT NULL, -- 'buy' or 'sell'
    orderType text NOT NULL, -- 'spot' or 'contract'
    status text NOT NULL, -- 'active', 'settled', 'filled', 'cancelled'
    amount numeric, -- For contract, this is the investment amount; for spot, it's the base asset amount
    total numeric, -- For spot, this is the quote asset total
    price numeric, -- For spot, execution price
    entry_price numeric, -- For contract
    settlement_price numeric, -- For contract
    settlement_time timestamptz, -- For contract
    period integer, -- For contract
    profit_rate numeric, -- For contract
    outcome text, -- 'win' or 'loss' for contract
    profit numeric, -- For contract
    base_asset text, -- For spot
    quote_asset text, -- For spot
    created_at timestamptz DEFAULT now()
);
COMMENT ON TABLE public.trades IS 'Records all spot and contract trades for users.';

CREATE TABLE IF NOT EXISTS public.requests (
    id uuid DEFAULT uuid_generate_v4() NOT NULL PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    type text NOT NULL, -- 'deposit', 'withdrawal', 'password_reset'
    asset text,
    amount numeric,
    status text DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
    address text,
    transaction_hash text,
    new_password text,
    created_at timestamptz DEFAULT now()
);
COMMENT ON TABLE public.requests IS 'Stores user requests for admin approval.';

CREATE TABLE IF NOT EXISTS public.reward_logs (
    id uuid DEFAULT uuid_generate_v4() NOT NULL PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    type text NOT NULL, -- 'dailyTask', 'team', 'event', 'system'
    amount numeric NOT NULL,
    asset text NOT NULL,
    source_id text,
    source_username text,
    source_level integer,
    description text,
    created_at timestamptz DEFAULT now()
);
COMMENT ON TABLE public.reward_logs IS 'Logs all rewards and commissions for users.';


-- 5. INVESTMENT AND CONTENT TABLES

CREATE TABLE IF NOT EXISTS public.investment_products (
    id uuid DEFAULT uuid_generate_v4() NOT NULL PRIMARY KEY,
    name text NOT NULL,
    price numeric NOT NULL,
    dailyRate numeric,
    period integer,
    maxPurchase integer NOT NULL,
    imgSrc text,
    category text, -- 'staking' or 'finance'
    productType text, -- 'daily' or 'hourly'
    activeStartTime text,
    activeEndTime text,
    hourlyTiers jsonb,
    stakingAsset text,
    stakingAmount numeric
);
COMMENT ON TABLE public.investment_products IS 'Stores definitions for investment products.';

CREATE TABLE IF NOT EXISTS public.investments (
    id uuid DEFAULT uuid_generate_v4() NOT NULL PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    product_name text NOT NULL,
    amount numeric NOT NULL,
    status text NOT NULL, -- 'active', 'settled'
    profit numeric,
    productType text,
    daily_rate numeric,
    period integer,
    duration_hours integer,
    hourly_rate numeric,
    stakingAsset text,
    stakingAmount numeric,
    category text,
    created_at timestamptz DEFAULT now(),
    settlement_date timestamptz NOT NULL
);
COMMENT ON TABLE public.investments IS 'Records user investments.';

CREATE TABLE IF NOT EXISTS public.daily_tasks (
    id uuid DEFAULT uuid_generate_v4() NOT NULL PRIMARY KEY,
    title text NOT NULL,
    description text,
    reward numeric NOT NULL,
    reward_type text NOT NULL, -- 'usdt' or 'credit_score'
    link text,
    status text, -- 'published' or 'draft'
    trigger text,
    imgSrc text
);
COMMENT ON TABLE public.daily_tasks IS 'Stores definitions for daily tasks.';

CREATE TABLE IF NOT EXISTS public.user_task_states (
    id uuid DEFAULT uuid_generate_v4() NOT NULL PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    taskId uuid NOT NULL REFERENCES public.daily_tasks(id) ON DELETE CASCADE,
    date date NOT NULL,
    completed boolean DEFAULT false,
    UNIQUE(user_id, taskId, date)
);
COMMENT ON TABLE public.user_task_states IS 'Tracks user daily task completion.';

CREATE TABLE IF NOT EXISTS public.activities (
    id uuid DEFAULT uuid_generate_v4() NOT NULL PRIMARY KEY,
    title text NOT NULL,
    description text,
    rewardRule text,
    howToClaim text,
    expiresAt timestamptz,
    imgSrc text,
    status text, -- 'published' or 'draft'
    created_at timestamptz DEFAULT now()
);
COMMENT ON TABLE public.activities IS 'Stores limited-time activities.';

CREATE TABLE IF NOT EXISTS public.announcements (
    id uuid DEFAULT uuid_generate_v4() NOT NULL PRIMARY KEY,
    type text NOT NULL, -- 'personal_message', 'carousel', 'horn'
    content jsonb,
    title text,
    user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
    theme text,
    priority integer,
    expires_at timestamptz,
    created_at timestamptz DEFAULT now(),
    UNIQUE(type)
);
-- Note: 'UNIQUE(type)' is good for singleton announcements like 'carousel',
-- but for multiple horn/personal messages, a different structure would be needed.
-- For this project's logic, this works. We will remove the unique constraint to allow multiple message types.
ALTER TABLE public.announcements DROP CONSTRAINT IF EXISTS announcements_type_key;


-- 6. ADMIN AND P2P SWAP TABLES

CREATE TABLE IF NOT EXISTS public.action_logs (
    id uuid DEFAULT uuid_generate_v4() NOT NULL PRIMARY KEY,
    entity_type text,
    entity_id text,
    action text,
    operator_id uuid,
    operator_username text,
    details text,
    created_at timestamptz DEFAULT now()
);
COMMENT ON TABLE public.action_logs IS 'Logs actions performed by administrators.';

CREATE TABLE IF NOT EXISTS public.swap_orders (
    id uuid DEFAULT uuid_generate_v4() NOT NULL PRIMARY KEY,
    "userId" uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    username text,
    "fromAsset" text NOT NULL,
    "fromAmount" numeric NOT NULL,
    "toAsset" text NOT NULL,
    "toAmount" numeric NOT NULL,
    status text NOT NULL, -- 'open', 'pending_payment', etc.
    "createdAt" timestamptz DEFAULT now(),
    "takerId" uuid,
    "takerUsername" text,
    "paymentProofUrl" text
);
COMMENT ON TABLE public.swap_orders IS 'Stores P2P swap orders.';

CREATE TABLE IF NOT EXISTS public.system_settings (
    id integer PRIMARY KEY,
    settings jsonb
);
COMMENT ON TABLE public.system_settings IS 'Stores global system settings as a single JSONB object.';


-- 7. MARKET DATA TABLES

CREATE TABLE IF NOT EXISTS public.market_summary_data (
    pair text PRIMARY KEY,
    price numeric,
    change numeric,
    volume numeric,
    high numeric,
    low numeric,
    icon text,
    updated_at timestamptz DEFAULT now()
);
COMMENT ON TABLE public.market_summary_data IS 'Stores the latest summary data for each market.';

CREATE TABLE IF NOT EXISTS public.market_kline_data (
    id uuid DEFAULT uuid_generate_v4() NOT NULL PRIMARY KEY,
    trading_pair text NOT NULL,
    time timestamptz NOT NULL,
    open numeric,
    high numeric,
    low numeric,
    close numeric,
    UNIQUE(trading_pair, time)
);
COMMENT ON TABLE public.market_kline_data IS 'Stores OHLC (candlestick) data for markets.';


-- 8. HELPER FUNCTIONS

-- Function to get a user's entire downline (levels 1, 2, 3)
CREATE OR REPLACE FUNCTION public.get_downline(p_user_id uuid)
RETURNS TABLE(id uuid, username text, nickname text, email text, inviter_id uuid, is_admin boolean, is_test_user boolean, is_frozen boolean, invitation_code text, credit_score integer, last_login_at timestamptz, avatar_url text, created_at timestamptz, level int)
LANGUAGE plpgsql
AS $$
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
$$;

-- Function to safely adjust a user's balance
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

-- Function to get the total platform balance (sum of all available balances)
CREATE OR REPLACE FUNCTION public.get_total_platform_balance()
RETURNS numeric
LANGUAGE plpgsql
AS $$
DECLARE
    total_balance numeric;
BEGIN
    SELECT COALESCE(SUM(available_balance), 0)
    INTO total_balance
    FROM public.balances
    WHERE asset = 'USDT'; -- Assuming we only care about USDT for platform total

    RETURN total_balance;
END;
$$;


-- 9. ROW-LEVEL SECURITY (RLS)
-- Enable RLS for all tables that store user-specific data.

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.investments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reward_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_task_states ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.swap_orders ENABLE ROW LEVEL SECURITY;

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
CREATE POLICY "Admins can manage all profiles." ON public.profiles FOR ALL USING ((SELECT is_admin FROM public.profiles WHERE id = auth.uid()));

-- RLS Policies for BALANCES
CREATE POLICY "Users can view their own balances." ON public.balances FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage all balances." ON public.balances FOR ALL USING ((SELECT is_admin FROM public.profiles WHERE id = auth.uid()));

-- RLS Policies for TRADES
CREATE POLICY "Users can view their own trades." ON public.trades FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all trades." ON public.trades FOR ALL USING ((SELECT is_admin FROM public.profiles WHERE id = auth.uid()));

-- RLS Policies for REQUESTS
CREATE POLICY "Users can manage their own requests." ON public.requests FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage all requests." ON public.requests FOR ALL USING ((SELECT is_admin FROM public.profiles WHERE id = auth.uid()));

-- RLS Policies for INVESTMENTS
CREATE POLICY "Users can view their own investments." ON public.investments FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all investments." ON public.investments FOR ALL USING ((SELECT is_admin FROM public.profiles WHERE id = auth.uid()));

-- RLS Policies for REWARD_LOGS
CREATE POLICY "Users can view their own reward logs." ON public.reward_logs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all reward logs." ON public.reward_logs FOR ALL USING ((SELECT is_admin FROM public.profiles WHERE id = auth.uid()));

-- RLS Policies for USER_TASK_STATES
CREATE POLICY "Users can manage their own task states." ON public.user_task_states FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage all task states." ON public.user_task_states FOR ALL USING ((SELECT is_admin FROM public.profiles WHERE id = auth.uid()));

-- RLS Policies for SWAP_ORDERS
CREATE POLICY "Users can manage their own swap orders." ON public.swap_orders FOR ALL USING (auth.uid() = "userId" OR auth.uid() = "takerId");
CREATE POLICY "Users can view open swap orders." ON public.swap_orders FOR SELECT USING (status = 'open');
CREATE POLICY "Admins can manage all swap orders." ON public.swap_orders FOR ALL USING ((SELECT is_admin FROM public.profiles WHERE id = auth.uid()));


-- Allow public read access for non-user-specific tables
DROP POLICY IF EXISTS "Public can read daily tasks" ON public.daily_tasks;
CREATE POLICY "Public can read daily tasks" ON public.daily_tasks FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public can read activities" ON public.activities;
CREATE POLICY "Public can read activities" ON public.activities FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public can read announcements" ON public.announcements;
CREATE POLICY "Public can read announcements" ON public.announcements FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public can read investment products" ON public.investment_products;
CREATE POLICY "Public can read investment products" ON public.investment_products FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins can manage content tables" ON public.daily_tasks;
CREATE POLICY "Admins can manage content tables" ON public.daily_tasks FOR ALL USING ((SELECT is_admin FROM public.profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Admins can manage content tables" ON public.activities;
CREATE POLICY "Admins can manage content tables" ON public.activities FOR ALL USING ((SELECT is_admin FROM public.profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Admins can manage content tables" ON public.announcements;
CREATE POLICY "Admins can manage content tables" ON public.announcements FOR ALL USING ((SELECT is_admin FROM public.profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Admins can manage content tables" ON public.investment_products;
CREATE POLICY "Admins can manage content tables" ON public.investment_products FOR ALL USING ((SELECT is_admin FROM public.profiles WHERE id = auth.uid()));

-- Allow admin access to logs
ALTER TABLE public.action_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins can manage logs" ON public.action_logs;
CREATE POLICY "Admins can manage logs" ON public.action_logs FOR ALL USING ((SELECT is_admin FROM public.profiles WHERE id = auth.uid()));


-- 10. PUBLICATION FOR REALTIME
-- Drop existing publications if they exist
DROP PUBLICATION IF EXISTS supabase_realtime;

-- Create a new publication for all tables to enable realtime functionality
-- Note: Supabase automatically handles this for tables with RLS, but being explicit can be helpful.
-- We will only add tables that need realtime updates on the client.
CREATE PUBLICATION supabase_realtime FOR TABLE public.market_summary_data, public.market_kline_data, public.swap_orders;
