-- 1. EXTENSIONS
-- Enable pg_cron for scheduled jobs and pgcrypto for UUID generation if not already enabled.
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pgcrypto;


-- 2. TABLES
-- User Profiles table
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid NOT NULL PRIMARY KEY,
  updated_at timestamp with time zone,
  username text UNIQUE,
  nickname text,
  avatar_url text,
  email text UNIQUE,
  inviter_id uuid,
  is_admin boolean DEFAULT false,
  is_test_user boolean DEFAULT false,
  is_frozen boolean DEFAULT false,
  invitation_code text UNIQUE,
  credit_score integer DEFAULT 100,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  CONSTRAINT username_length CHECK (char_length(username) >= 3)
);

-- User Balances table
CREATE TABLE IF NOT EXISTS public.balances (
  id bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  asset text NOT NULL,
  available_balance numeric NOT NULL DEFAULT 0,
  frozen_balance numeric NOT NULL DEFAULT 0,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  UNIQUE (user_id, asset)
);

-- Trades table (for both spot and contract trades)
CREATE TABLE IF NOT EXISTS public.trades (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  trading_pair text NOT NULL,
  orderType text NOT NULL, -- 'spot' or 'contract'
  type text NOT NULL, -- 'buy' or 'sell'
  status text NOT NULL, -- 'active', 'settled', 'filled', 'cancelled'
  amount numeric NOT NULL,
  price numeric, -- For spot trades
  total numeric, -- For spot trades
  entry_price numeric, -- For contract trades
  settlement_time timestamptz, -- For contract trades
  period integer, -- For contract trades
  profit_rate numeric, -- For contract trades
  settlement_price numeric, -- For contract trades
  outcome text, -- 'win' or 'loss'
  profit numeric,
  base_asset text, -- For spot trades
  quote_asset text, -- For spot trades
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);
CREATE INDEX IF NOT EXISTS trades_user_id_idx ON public.trades(user_id);
CREATE INDEX IF NOT EXISTS trades_status_idx ON public.trades(status);
CREATE INDEX IF NOT EXISTS trades_settlement_time_idx ON public.trades(settlement_time) WHERE status = 'active';


-- Requests table (deposits, withdrawals, password resets)
CREATE TABLE IF NOT EXISTS public.requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type text NOT NULL, -- 'deposit', 'withdrawal', 'password_reset'
  asset text,
  amount numeric,
  address text,
  transaction_hash text,
  new_password text,
  status text NOT NULL DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);
CREATE INDEX IF NOT EXISTS requests_user_id_idx ON public.requests(user_id);
CREATE INDEX IF NOT EXISTS requests_status_idx ON public.requests(status);


-- Investments table
CREATE TABLE IF NOT EXISTS public.investments (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    product_name text NOT NULL,
    amount numeric NOT NULL,
    status text NOT NULL, -- 'active' or 'settled'
    category text, -- 'staking' or 'finance'
    productType text, -- 'daily' or 'hourly'
    daily_rate numeric,
    period integer,
    hourly_rate numeric,
    duration_hours integer,
    profit numeric,
    staking_asset text,
    staking_amount numeric,
    created_at timestamptz DEFAULT now() NOT NULL,
    settlement_date timestamptz NOT NULL
);
CREATE INDEX IF NOT EXISTS investments_user_id_idx ON public.investments(user_id);
CREATE INDEX IF NOT EXISTS investments_status_idx ON public.investments(status);
CREATE INDEX IF NOT EXISTS investments_settlement_date_idx ON public.investments(settlement_date) WHERE status = 'active';


-- Reward Logs table
CREATE TABLE IF NOT EXISTS public.reward_logs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    type text NOT NULL, -- 'dailyTask', 'team', 'event', 'system'
    amount numeric NOT NULL,
    asset text NOT NULL,
    source_id text,
    source_username text,
    source_level integer,
    description text,
    created_at timestamptz DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS reward_logs_user_id_idx ON public.reward_logs(user_id);


-- User Task States table
CREATE TABLE IF NOT EXISTS public.user_task_states (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    taskId text NOT NULL,
    date date NOT NULL,
    completed boolean DEFAULT false,
    UNIQUE(user_id, taskId, date)
);
CREATE INDEX IF NOT EXISTS user_task_states_user_id_date_idx ON public.user_task_states(user_id, date);


-- Swap Orders table
CREATE TABLE IF NOT EXISTS public.swap_orders (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    username text,
    from_asset text NOT NULL,
    from_amount numeric NOT NULL,
    to_asset text NOT NULL,
    to_amount numeric NOT NULL,
    status text NOT NULL,
    taker_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
    taker_username text,
    payment_proof_url text,
    created_at timestamptz DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS swap_orders_status_idx ON public.swap_orders(status);
CREATE INDEX IF NOT EXISTS swap_orders_user_id_idx ON public.swap_orders(user_id);

-- Action Logs table (for admin auditing)
CREATE TABLE IF NOT EXISTS public.action_logs (
    id bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    entity_type text,
    entity_id text,
    action text,
    operator_id uuid,
    operator_username text,
    details text
);

-- Content Tables (publicly readable, admin managed)
CREATE TABLE IF NOT EXISTS public.daily_tasks (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    title text,
    description text,
    reward numeric,
    reward_type text,
    link text,
    status text,
    trigger text,
    imgSrc text
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
    createdAt timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.announcements (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    type text NOT NULL, -- 'horn', 'personal_message', 'carousel'
    title text,
    content jsonb, -- For carousel items
    theme text, -- For horn
    priority integer, -- For horn
    expires_at timestamptz, -- For horn
    user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE, -- For personal messages
    UNIQUE (type) WHERE (type = 'carousel')
);

CREATE TABLE IF NOT EXISTS public.investment_products (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    price numeric NOT NULL,
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

-- System Settings table (singleton)
CREATE TABLE IF NOT EXISTS public.system_settings (
    id integer PRIMARY KEY,
    settings jsonb,
    updated_at timestamptz DEFAULT now() NOT NULL
);


-- Market Data Tables
CREATE TABLE IF NOT EXISTS public.market_summary_data (
    pair text PRIMARY KEY,
    price numeric,
    change numeric,
    volume numeric,
    high numeric,
    low numeric,
    icon text,
    updated_at timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.market_kline_data (
    id bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    trading_pair text NOT NULL,
    time timestamptz NOT NULL,
    open numeric,
    high numeric,
    low numeric,
    close numeric,
    UNIQUE (trading_pair, time)
);
CREATE INDEX IF NOT EXISTS market_kline_data_trading_pair_time_idx ON public.market_kline_data(trading_pair, time DESC);


-- 3. HELPER FUNCTIONS & TRIGGERS

-- Function to create a user profile when a new user signs up in auth.users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
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
$$;
-- Trigger for the function
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();


-- Function to automatically update the `updated_at` timestamp on relevant tables
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = now();
   RETURN NEW;
END;
$$ LANGUAGE plpgsql;
-- Triggers for updated_at
DROP TRIGGER IF EXISTS handle_profiles_update ON public.profiles;
CREATE TRIGGER handle_profiles_update BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();
DROP TRIGGER IF EXISTS handle_balances_update ON public.balances;
CREATE TRIGGER handle_balances_update BEFORE UPDATE ON public.balances FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();
DROP TRIGGER IF EXISTS handle_requests_update ON public.requests;
CREATE TRIGGER handle_requests_update BEFORE UPDATE ON public.requests FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();
DROP TRIGGER IF EXISTS handle_system_settings_update ON public.system_settings;
CREATE TRIGGER handle_system_settings_update BEFORE UPDATE ON public.system_settings FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();


-- 4. RPC FUNCTIONS
-- Function to adjust user balances safely
CREATE OR REPLACE FUNCTION public.adjust_balance(p_user_id uuid, p_asset text, p_amount numeric, p_is_frozen boolean DEFAULT false)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
    IF p_is_frozen THEN
        INSERT INTO public.balances(user_id, asset, frozen_balance)
        VALUES (p_user_id, p_asset, p_amount)
        ON CONFLICT (user_id, asset)
        DO UPDATE SET frozen_balance = public.balances.frozen_balance + p_amount;
    ELSE
        INSERT INTO public.balances(user_id, asset, available_balance)
        VALUES (p_user_id, p_asset, p_amount)
        ON CONFLICT (user_id, asset)
        DO UPDATE SET available_balance = public.balances.available_balance + p_amount;
    END IF;
END;
$$;

-- Function to get the total platform balance
DROP FUNCTION IF EXISTS public.get_total_platform_balance();
CREATE OR REPLACE FUNCTION public.get_total_platform_balance()
RETURNS numeric
LANGUAGE sql
AS $$
  SELECT COALESCE(SUM(available_balance), 0) FROM public.balances;
$$;

-- Function to recursively get all downline members
DROP FUNCTION IF EXISTS public.get_downline(uuid);
CREATE OR REPLACE FUNCTION public.get_downline(p_user_id uuid)
RETURNS TABLE (
    id uuid,
    username text,
    nickname text,
    email text,
    inviter_id uuid,
    is_admin boolean,
    is_test_user boolean,
    is_frozen boolean,
    invitation_code text,
    credit_score integer,
    created_at timestamptz,
    last_login_at timestamptz,
    avatar_url text,
    level int
) AS $$
BEGIN
    RETURN QUERY
    WITH RECURSIVE downline_cte AS (
        SELECT
            p.id,
            p.username,
            p.nickname,
            p.email,
            p.inviter_id,
            p.is_admin,
            p.is_test_user,
            p.is_frozen,
            p.invitation_code,
            p.credit_score,
            p.created_at,
            p.last_login_at,
            p.avatar_url,
            1 AS level
        FROM public.profiles p
        WHERE p.inviter_id = p_user_id

        UNION ALL

        SELECT
            p.id,
            p.username,
            p.nickname,
            p.email,
            p.inviter_id,
            p.is_admin,
            p.is_test_user,
            p.is_frozen,
            p.invitation_code,
            p.credit_score,
            p.created_at,
            p.last_login_at,
            p.avatar_url,
            d.level + 1
        FROM public.profiles p
        JOIN downline_cte d ON p.inviter_id = d.id
        WHERE d.level < 3
    )
    SELECT * FROM downline_cte;
END;
$$ LANGUAGE plpgsql;

-- 5. FUNCTION & TRIGGER FOR SETTLEMENTS
DROP FUNCTION IF EXISTS public.settle_due_records();
CREATE OR REPLACE FUNCTION public.settle_due_records()
RETURNS void AS $$
DECLARE
    trade_record RECORD;
    investment_record RECORD;
    profit numeric;
    settlement_price numeric;
    outcome text;
BEGIN
    -- Settle due contract trades
    FOR trade_record IN
        SELECT * FROM public.trades
        WHERE status = 'active' AND orderType = 'contract' AND settlement_time <= now()
        FOR UPDATE
    LOOP
        -- In a real scenario, you'd fetch the latest price from a reliable source.
        -- For this simulation, we'll use a placeholder or the entry price for simplicity.
        SELECT price INTO settlement_price FROM public.market_summary_data WHERE pair = trade_record.trading_pair;
        IF settlement_price IS NULL THEN
            settlement_price := trade_record.entry_price; -- Fallback
        END IF;

        IF trade_record.type = 'buy' THEN
            outcome := CASE WHEN settlement_price > trade_record.entry_price THEN 'win' ELSE 'loss' END;
        ELSE -- 'sell'
            outcome := CASE WHEN settlement_price < trade_record.entry_price THEN 'win' ELSE 'loss' END;
        END IF;

        profit := CASE WHEN outcome = 'win' THEN trade_record.amount * trade_record.profit_rate ELSE -trade_record.amount END;

        UPDATE public.trades
        SET status = 'settled',
            settlement_price = settlement_price,
            outcome = outcome,
            profit = profit
        WHERE id = trade_record.id;

        -- Adjust balances
        PERFORM public.adjust_balance(trade_record.user_id, trade_record.quote_asset, -trade_record.amount, true); -- Unfreeze
        IF outcome = 'win' THEN
            PERFORM public.adjust_balance(trade_record.user_id, trade_record.quote_asset, trade_record.amount + profit); -- Return principal + profit
        END IF; -- If loss, principal is lost, so nothing is returned to available.
    END LOOP;

    -- Settle due investments
    FOR investment_record IN
        SELECT * FROM public.investments
        WHERE status = 'active' AND settlement_date <= now()
        FOR UPDATE
    LOOP
        IF investment_record.productType = 'daily' THEN
            profit := investment_record.amount * investment_record.daily_rate * investment_record.period;
        ELSE -- 'hourly'
            profit := investment_record.amount * investment_record.hourly_rate;
        END IF;
        
        UPDATE public.investments
        SET status = 'settled', profit = profit
        WHERE id = investment_record.id;

        -- Return principal and profit
        PERFORM public.adjust_balance(investment_record.user_id, 'USDT', investment_record.amount + profit);

        -- Unfreeze staking asset if any
        IF investment_record.staking_asset IS NOT NULL AND investment_record.staking_amount > 0 THEN
            PERFORM public.adjust_balance(investment_record.user_id, investment_record.staking_asset, -investment_record.staking_amount, true);
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql;


-- 6. FUNCTION & TRIGGER FOR COMMISSION DISTRIBUTION
DROP FUNCTION IF EXISTS public.distribute_trade_commissions();
CREATE OR REPLACE FUNCTION public.distribute_trade_commissions()
RETURNS TRIGGER AS $$
DECLARE
    source_user public.profiles;
    upline_user public.profiles;
    level INT;
    commission_rate numeric;
    commission_amount numeric;
    current_inviter_id uuid;
BEGIN
    -- Only distribute for contract trades in USDT
    IF NEW.orderType = 'contract' AND NEW.quote_asset = 'USDT' THEN
        SELECT * INTO source_user FROM public.profiles WHERE id = NEW.user_id;
        
        IF source_user.inviter_id IS NOT NULL THEN
            current_inviter_id := source_user.inviter_id;
            
            FOR level IN 1..3 LOOP
                IF current_inviter_id IS NULL THEN
                    EXIT;
                END IF;

                SELECT * INTO upline_user FROM public.profiles WHERE id = current_inviter_id;
                
                IF upline_user IS NULL OR upline_user.is_frozen THEN
                    EXIT;
                END IF;

                commission_rate := CASE level
                    WHEN 1 THEN 0.08
                    WHEN 2 THEN 0.05
                    WHEN 3 THEN 0.02
                END;

                commission_amount := NEW.amount * commission_rate;

                -- Credit reward to upline user
                PERFORM public.adjust_balance(upline_user.id, 'USDT', commission_amount);

                -- Log the commission
                INSERT INTO public.reward_logs (user_id, type, amount, asset, source_id, source_username, source_level, description)
                VALUES (upline_user.id, 'team', commission_amount, 'USDT', NEW.id, source_user.username, level, 'Level ' || level || ' trade commission');
                
                -- Move to the next inviter
                current_inviter_id := upline_user.inviter_id;
            END LOOP;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_trade_insert_distribute_commission ON public.trades;
CREATE TRIGGER on_trade_insert_distribute_commission
    AFTER INSERT ON public.trades
    FOR EACH ROW
    EXECUTE FUNCTION public.distribute_trade_commissions();


-- 7. SCHEDULED JOBS (using pg_cron)
-- Cron job to run the settlement function every minute
SELECT cron.schedule('settle-records-job', '* * * * *', 'SELECT public.settle_due_records()');


-- 8. HELPER FUNCTION FOR RLS
-- A function to check if the current user is an admin.
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND is_admin = TRUE
    );
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


-- Allow public read access for non-user-specific content tables
ALTER TABLE public.daily_tasks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public can read daily tasks" ON public.daily_tasks;
CREATE POLICY "Public can read daily tasks" ON public.daily_tasks FOR SELECT USING (true);
DROP POLICY IF EXISTS "Admins can manage daily tasks" ON public.daily_tasks;
CREATE POLICY "Admins can manage daily tasks" ON public.daily_tasks FOR ALL USING (public.is_admin());

ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public can read activities" ON public.activities;
CREATE POLICY "Public can read activities" ON public.activities FOR SELECT USING (true);
DROP POLICY IF EXISTS "Admins can manage activities" ON public.activities;
CREATE POLICY "Admins can manage activities" ON public.activities FOR ALL USING (public.is_admin());

ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public can read announcements" ON public.announcements;
CREATE POLICY "Public can read announcements" ON public.announcements FOR SELECT USING (true);
DROP POLICY IF EXISTS "Admins can manage announcements" ON public.announcements;
CREATE POLICY "Admins can manage announcements" ON public.announcements FOR ALL USING (public.is_admin());

ALTER TABLE public.investment_products ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public can read investment products" ON public.investment_products;
CREATE POLICY "Public can read investment products" ON public.investment_products FOR SELECT USING (true);
DROP POLICY IF EXISTS "Admins can manage investment products" ON public.investment_products;
CREATE POLICY "Admins can manage investment products" ON public.investment_products FOR ALL USING (public.is_admin());


-- 10. PUBLICATION FOR REALTIME
-- Drop existing publications if they exist to ensure a clean state
DROP PUBLICATION IF EXISTS supabase_realtime;

-- Create a new publication for all tables that need realtime updates.
-- Supabase handles this automatically for tables with RLS, but being explicit ensures desired tables are included.
CREATE PUBLICATION supabase_realtime FOR TABLE public.market_summary_data, public.market_kline_data, public.swap_orders, public.trades, public.investments, public.balances;
