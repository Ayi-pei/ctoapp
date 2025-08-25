-- TradeFlow - Supabase SQL Setup
-- Version: 4.0
-- Description: Fully idempotent script with backend logic for settlement and commissions.

-- 1. EXTENSIONS
-- Enable pg_cron for scheduled jobs. Run this only once from the Supabase Dashboard.
-- We are commenting it out here as it requires dashboard interaction.
-- CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";


-- 2. TABLES
-- User Profiles
CREATE TABLE IF NOT EXISTS public.profiles (
    id uuid NOT NULL PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
    username text UNIQUE,
    nickname text,
    avatar_url text,
    email text UNIQUE,
    inviter_id uuid REFERENCES public.profiles(id),
    is_admin boolean DEFAULT false,
    is_test_user boolean DEFAULT false,
    is_frozen boolean DEFAULT false,
    invitation_code text UNIQUE,
    credit_score integer DEFAULT 100,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);
COMMENT ON TABLE public.profiles IS 'Stores public user profile information.';

-- Balances
CREATE TABLE IF NOT EXISTS public.balances (
    id uuid NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    asset text NOT NULL,
    available_balance numeric NOT NULL DEFAULT 0,
    frozen_balance numeric NOT NULL DEFAULT 0,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
    UNIQUE (user_id, asset)
);
COMMENT ON TABLE public.balances IS 'Stores user asset balances.';

-- Trades (Contract and Spot)
CREATE TABLE IF NOT EXISTS public.trades (
    id uuid NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    trading_pair text NOT NULL,
    orderType text NOT NULL, -- 'contract' or 'spot'
    type text NOT NULL, -- 'buy' or 'sell'
    status text NOT NULL, -- 'active', 'settled', 'filled', 'cancelled'
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
COMMENT ON TABLE public.trades IS 'Stores all user trades, both contract and spot.';

-- Requests (Deposit, Withdrawal, Password Reset)
CREATE TABLE IF NOT EXISTS public.requests (
    id uuid NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    type text NOT NULL,
    asset text,
    amount numeric,
    address text,
    transaction_hash text,
    new_password text,
    status text NOT NULL DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);
COMMENT ON TABLE public.requests IS 'Stores user requests for admin approval.';

-- Investments
CREATE TABLE IF NOT EXISTS public.investments (
    id uuid NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    product_name text NOT NULL,
    amount numeric NOT NULL,
    status text NOT NULL DEFAULT 'active', -- 'active', 'settled'
    profit numeric,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
    settlement_date timestamp with time zone,
    daily_rate numeric,
    period integer,
    productType text,
    duration_hours integer,
    hourly_rate numeric,
    category text,
    staking_asset text,
    staking_amount numeric
);
COMMENT ON TABLE public.investments IS 'Stores user investments in financial products.';

-- Reward Logs
CREATE TABLE IF NOT EXISTS public.reward_logs (
    id uuid NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    type text NOT NULL, -- 'dailyTask', 'team', 'event', 'system'
    amount numeric NOT NULL,
    asset text NOT NULL,
    source_id text,
    source_username text,
    source_level integer,
    description text,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);
COMMENT ON TABLE public.reward_logs IS 'Logs all rewards and commissions given to users.';

-- User Task States
CREATE TABLE IF NOT EXISTS public.user_task_states (
    id uuid NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    taskId text NOT NULL,
    date date NOT NULL,
    completed boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
    UNIQUE(user_id, taskId, date)
);
COMMENT ON TABLE public.user_task_states IS 'Tracks completion of daily tasks for each user.';

-- Swap Orders (P2P)
CREATE TABLE IF NOT EXISTS public.swap_orders (
    id uuid NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    username text,
    from_asset text NOT NULL,
    from_amount numeric NOT NULL,
    to_asset text NOT NULL,
    to_amount numeric NOT NULL,
    status text NOT NULL DEFAULT 'open',
    taker_id uuid REFERENCES public.profiles(id),
    taker_username text,
    payment_proof_url text,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);
COMMENT ON TABLE public.swap_orders IS 'Stores P2P swap orders.';

-- Action Logs (for Admin Auditing)
CREATE TABLE IF NOT EXISTS public.action_logs (
    id bigserial PRIMARY KEY,
    entity_type text,
    entity_id text,
    action text,
    operator_id uuid,
    operator_username text,
    details text,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);
COMMENT ON TABLE public.action_logs IS 'Audit trail for admin actions.';

-- Content Tables (Managed by Admin)
CREATE TABLE IF NOT EXISTS public.daily_tasks (
    id uuid NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
    title text,
    description text,
    reward numeric,
    reward_type text,
    link text,
    status text,
    trigger text,
    imgSrc text,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.activities (
    id uuid NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
    title text,
    description text,
    rewardRule text,
    howToClaim text,
    expiresAt timestamp with time zone,
    imgSrc text,
    status text,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.announcements (
    id uuid NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
    type text NOT NULL, -- 'personal_message', 'carousel', 'horn'
    content jsonb,
    title text,
    user_id uuid REFERENCES public.profiles(id),
    theme text,
    priority integer,
    expires_at timestamp with time zone,
    date timestamp with time zone DEFAULT timezone('utc'::text, now()),
    is_read boolean DEFAULT false
);
-- Ensure 'type' can be used as a unique key for singleton settings
ALTER TABLE public.announcements ADD CONSTRAINT announcements_type_unique UNIQUE (type);


CREATE TABLE IF NOT EXISTS public.investment_products (
    id uuid NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
    name text,
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

-- System Settings Table (Singleton)
CREATE TABLE IF NOT EXISTS public.system_settings (
    id integer PRIMARY KEY,
    settings jsonb
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
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.market_kline_data (
    id bigserial PRIMARY KEY,
    trading_pair text NOT NULL,
    time timestamp with time zone NOT NULL,
    open numeric,
    high numeric,
    low numeric,
    close numeric,
    UNIQUE(trading_pair, time)
);

-- 3. INDEXES
-- Create indexes for foreign keys and frequently queried columns.
CREATE INDEX IF NOT EXISTS idx_profiles_inviter_id ON public.profiles(inviter_id);
CREATE INDEX IF NOT EXISTS idx_balances_user_id ON public.balances(user_id);
CREATE INDEX IF NOT EXISTS idx_trades_user_id ON public.trades(user_id);
CREATE INDEX IF NOT EXISTS idx_trades_status ON public.trades(status);
CREATE INDEX IF NOT EXISTS idx_requests_user_id ON public.requests(user_id);
CREATE INDEX IF NOT EXISTS idx_requests_status ON public.requests(status);
CREATE INDEX IF NOT EXISTS idx_investments_user_id ON public.investments(user_id);
CREATE INDEX IF NOT EXISTS idx_investments_status ON public.investments(status);
CREATE INDEX IF NOT EXISTS idx_reward_logs_user_id ON public.reward_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_user_task_states_user_id ON public.user_task_states(user_id);
CREATE INDEX IF NOT EXISTS idx_swap_orders_user_id ON public.swap_orders(user_id);
CREATE INDEX IF NOT EXISTS idx_swap_orders_status ON public.swap_orders(status);
CREATE INDEX IF NOT EXISTS idx_market_kline_data_trading_pair_time ON public.market_kline_data(trading_pair, time DESC);


-- 4. FUNCTIONS AND TRIGGERS

-- Function to handle new user profile creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, username, email, nickname, invitation_code, avatar_url)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'username',
    NEW.email,
    NEW.raw_user_meta_data->>'nickname',
    NEW.raw_user_meta_data->>'invitation_code',
    NEW.raw_user_meta_data->>'avatar_url'
  );
  -- Also set inviter_id if provided
  IF NEW.raw_user_meta_data->>'inviter_id' IS NOT NULL THEN
      UPDATE public.profiles
      SET inviter_id = (NEW.raw_user_meta_data->>'inviter_id')::uuid
      WHERE id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$;

-- Trigger to call handle_new_user on new user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to automatically update `updated_at` columns
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = timezone('utc', now());
  RETURN NEW;
END;
$$;

-- Triggers for updated_at
DROP TRIGGER IF EXISTS on_profiles_updated ON public.profiles;
CREATE TRIGGER on_profiles_updated BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS on_balances_updated ON public.balances;
CREATE TRIGGER on_balances_updated BEFORE UPDATE ON public.balances FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS on_requests_updated ON public.requests;
CREATE TRIGGER on_requests_updated BEFORE UPDATE ON public.requests FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS on_swap_orders_updated ON public.swap_orders;
CREATE TRIGGER on_swap_orders_updated BEFORE UPDATE ON public.swap_orders FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();


-- 5. BALANCE MANAGEMENT FUNCTION
CREATE OR REPLACE FUNCTION public.adjust_balance(
    p_user_id uuid,
    p_asset text,
    p_amount numeric,
    p_is_frozen boolean DEFAULT false,
    p_is_debit_frozen boolean DEFAULT false
)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
    IF p_is_debit_frozen THEN
        -- This branch handles reducing the frozen balance, typically for approved/rejected withdrawals
        INSERT INTO public.balances (user_id, asset, available_balance, frozen_balance)
        VALUES (p_user_id, p_asset, 0, p_amount)
        ON CONFLICT (user_id, asset) DO UPDATE
        SET frozen_balance = public.balances.frozen_balance - p_amount;
    ELSIF p_is_frozen THEN
         -- This branch handles moving balance to/from frozen, typically for placing orders or withdrawal requests
        INSERT INTO public.balances (user_id, asset, available_balance, frozen_balance)
        VALUES (p_user_id, p_asset, -p_amount, p_amount)
        ON CONFLICT (user_id, asset) DO UPDATE
        SET available_balance = public.balances.available_balance - p_amount,
            frozen_balance = public.balances.frozen_balance + p_amount;
    ELSE
        -- This is for standard credits/debits to the available balance
        INSERT INTO public.balances (user_id, asset, available_balance, frozen_balance)
        VALUES (p_user_id, p_asset, p_amount, 0)
        ON CONFLICT (user_id, asset) DO UPDATE
        SET available_balance = public.balances.available_balance + p_amount;
    END IF;
END;
$$;


-- 6. TEAM AND COMMISSION FUNCTIONS

-- Drop the function before creating it to allow for signature changes
DROP FUNCTION IF EXISTS public.get_downline(uuid);

-- Function to recursively get all downline members
CREATE OR REPLACE FUNCTION public.get_downline(p_user_id uuid)
RETURNS TABLE(id uuid, username text, email text, nickname text, created_at timestamp with time zone, inviter_id uuid, is_admin boolean, is_test_user boolean, is_frozen boolean, invitation_code text, credit_score integer, avatar_url text, level int)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    WITH RECURSIVE downline_cte AS (
        SELECT p.id, p.username, p.email, p.nickname, p.created_at, p.inviter_id, p.is_admin, p.is_test_user, p.is_frozen, p.invitation_code, p.credit_score, p.avatar_url, 1 AS level
        FROM public.profiles p
        WHERE p.inviter_id = p_user_id

        UNION ALL

        SELECT p.id, p.username, p.email, p.nickname, p.created_at, p.inviter_id, p.is_admin, p.is_test_user, p.is_frozen, p.invitation_code, p.credit_score, p.avatar_url, d.level + 1
        FROM public.profiles p
        JOIN downline_cte d ON p.inviter_id = d.id
        WHERE d.level < 3 -- Limit to 3 levels
    )
    SELECT * FROM downline_cte;
END;
$$;

-- Function to distribute commissions
CREATE OR REPLACE FUNCTION public.distribute_trade_commissions()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
    v_inviter_id_l1 uuid;
    v_inviter_id_l2 uuid;
    v_inviter_id_l3 uuid;
    v_commission_amount_l1 numeric;
    v_commission_amount_l2 numeric;
    v_commission_amount_l3 numeric;
    v_trade_amount numeric;
BEGIN
    -- Determine the amount to base commission on
    IF NEW.orderType = 'contract' THEN
        v_trade_amount := NEW.amount;
    ELSIF NEW.orderType = 'spot' THEN
        v_trade_amount := NEW.total;
    ELSE
        RETURN NEW; -- Not a trade type that generates commission
    END IF;

    -- Get 3 levels of inviters
    SELECT inviter_id INTO v_inviter_id_l1 FROM public.profiles WHERE id = NEW.user_id;
    IF v_inviter_id_l1 IS NOT NULL THEN
        SELECT inviter_id INTO v_inviter_id_l2 FROM public.profiles WHERE id = v_inviter_id_l1;
        IF v_inviter_id_l2 IS NOT NULL THEN
            SELECT inviter_id INTO v_inviter_id_l3 FROM public.profiles WHERE id = v_inviter_id_l2;
        END IF;
    END IF;

    -- Calculate and distribute commissions
    IF v_inviter_id_l1 IS NOT NULL THEN
        v_commission_amount_l1 := v_trade_amount * 0.08;
        PERFORM public.adjust_balance(v_inviter_id_l1, 'USDT', v_commission_amount_l1);
        INSERT INTO public.reward_logs (user_id, type, amount, asset, source_id, source_username, source_level, description)
        VALUES (v_inviter_id_l1, 'team', v_commission_amount_l1, 'USDT', NEW.id::text, (SELECT username FROM profiles WHERE id = NEW.user_id), 1, 'L1 Commission from trade ' || NEW.id);
    END IF;

    IF v_inviter_id_l2 IS NOT NULL THEN
        v_commission_amount_l2 := v_trade_amount * 0.05;
        PERFORM public.adjust_balance(v_inviter_id_l2, 'USDT', v_commission_amount_l2);
         INSERT INTO public.reward_logs (user_id, type, amount, asset, source_id, source_username, source_level, description)
        VALUES (v_inviter_id_l2, 'team', v_commission_amount_l2, 'USDT', NEW.id::text, (SELECT username FROM profiles WHERE id = NEW.user_id), 2, 'L2 Commission from trade ' || NEW.id);
    END IF;

    IF v_inviter_id_l3 IS NOT NULL THEN
        v_commission_amount_l3 := v_trade_amount * 0.02;
        PERFORM public.adjust_balance(v_inviter_id_l3, 'USDT', v_commission_amount_l3);
         INSERT INTO public.reward_logs (user_id, type, amount, asset, source_id, source_username, source_level, description)
        VALUES (v_inviter_id_l3, 'team', v_commission_amount_l3, 'USDT', NEW.id::text, (SELECT username FROM profiles WHERE id = NEW.user_id), 3, 'L3 Commission from trade ' || NEW.id);
    END IF;

    RETURN NEW;
END;
$$;

-- Trigger for commission distribution
DROP TRIGGER IF EXISTS on_trade_inserted ON public.trades;
CREATE TRIGGER on_trade_inserted
  AFTER INSERT ON public.trades
  FOR EACH ROW EXECUTE FUNCTION public.distribute_trade_commissions();


-- 7. AUTO-SETTLEMENT FUNCTION

DROP FUNCTION IF EXISTS public.settle_due_records();
CREATE OR REPLACE FUNCTION public.settle_due_records()
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
    trade_record RECORD;
    investment_record RECORD;
    settlement_price numeric;
    outcome text;
    profit numeric;
BEGIN
    -- Settle due contract trades
    FOR trade_record IN
        SELECT * FROM public.trades
        WHERE status = 'active' AND orderType = 'contract' AND settlement_time <= now()
        FOR UPDATE
    LOOP
        -- In a real scenario, you'd fetch the live price here.
        -- For this simulation, we'll use the entry_price +/- a random amount.
        settlement_price := trade_record.entry_price + (random() * 0.02 - 0.01) * trade_record.entry_price;

        IF (trade_record.type = 'buy' AND settlement_price > trade_record.entry_price) OR
           (trade_record.type = 'sell' AND settlement_price < trade_record.entry_price) THEN
            outcome := 'win';
            profit := trade_record.amount * trade_record.profit_rate;
            -- Return principal + profit
            PERFORM public.adjust_balance(trade_record.user_id, 'USDT', trade_record.amount + profit, false, true);
        ELSE
            outcome := 'loss';
            profit := -trade_record.amount;
            -- Only debit the frozen balance, principal is lost
            PERFORM public.adjust_balance(trade_record.user_id, 'USDT', trade_record.amount, true, true);
        END IF;

        UPDATE public.trades
        SET status = 'settled',
            settlement_price = settlement_price,
            outcome = outcome,
            profit = profit
        WHERE id = trade_record.id;
    END LOOP;

    -- Settle due investments
    FOR investment_record IN
        SELECT * FROM public.investments
        WHERE status = 'active' AND settlement_date <= now()
        FOR UPDATE
    LOOP
        IF investment_record.productType = 'daily' THEN
            profit := investment_record.amount * investment_record.daily_rate * investment_record.period;
        ELSIF investment_record.productType = 'hourly' THEN
             profit := investment_record.amount * investment_record.hourly_rate * investment_record.duration_hours;
        ELSE
            profit := 0;
        END IF;

        -- Return principal and profit to available balance
        PERFORM public.adjust_balance(investment_record.user_id, 'USDT', investment_record.amount + profit);
        
        -- If there was a staked asset, unfreeze it
        IF investment_record.staking_asset IS NOT NULL AND investment_record.staking_amount IS NOT NULL THEN
            PERFORM public.adjust_balance(investment_record.user_id, investment_record.staking_asset, investment_record.staking_amount, true, true);
        END IF;

        UPDATE public.investments
        SET status = 'settled',
            profit = profit
        WHERE id = investment_record.id;
    END LOOP;
END;
$$;


-- 8. HELPER/UTILITY FUNCTIONS
-- Function to get total platform balance
CREATE OR REPLACE FUNCTION public.get_total_platform_balance()
RETURNS numeric
LANGUAGE sql
AS $$
  SELECT SUM(available_balance) FROM public.balances WHERE asset = 'USDT';
$$;


-- 9. ROW-LEVEL SECURITY (RLS)
-- Create a helper function to check for admin role
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
    is_admin_user boolean;
BEGIN
    SELECT is_admin INTO is_admin_user FROM public.profiles WHERE id = auth.uid();
    RETURN COALESCE(is_admin_user, false);
END;
$$;

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
-- Also enable RLS for content tables to restrict management to admins
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
DROP POLICY IF EXISTS "Admins can manage content tables" ON public.daily_tasks;
DROP POLICY IF EXISTS "Admins can manage content tables" ON public.activities;
DROP POLICY IF EXISTS "Admins can manage content tables" ON public.announcements;
DROP POLICY IF EXISTS "Admins can manage content tables" ON public.investment_products;
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

-- Policies for CONTENT tables
CREATE POLICY "Public can read daily tasks" ON public.daily_tasks FOR SELECT USING (true);
CREATE POLICY "Public can read activities" ON public.activities FOR SELECT USING (true);
CREATE POLICY "Public can read announcements" ON public.announcements FOR SELECT USING (true);
CREATE POLICY "Public can read investment products" ON public.investment_products FOR SELECT USING (true);
CREATE POLICY "Admins can manage content tables" ON public.daily_tasks FOR ALL USING (public.is_admin());
CREATE POLICY "Admins can manage content tables" ON public.activities FOR ALL USING (public.is_admin());
CREATE POLICY "Admins can manage content tables" ON public.announcements FOR ALL USING (public.is_admin());
CREATE POLICY "Admins can manage content tables" ON public.investment_products FOR ALL USING (public.is_admin());

-- Policies for LOGS
CREATE POLICY "Admins can manage logs" ON public.action_logs FOR ALL USING (public.is_admin());


-- 10. CRON JOBS
-- Schedule the settlement function to run every minute.
-- Note: pg_cron must be enabled in the Supabase dashboard.
-- This command is run once in the SQL editor.
-- SELECT cron.schedule('settle-due-records-job', '*/1 * * * *', 'SELECT public.settle_due_records()');

-- To unschedule:
-- SELECT cron.unschedule('settle-due-records-job');


-- 11. PUBLICATION FOR REALTIME
-- Drop existing publications if they exist to start fresh
DROP PUBLICATION IF EXISTS supabase_realtime;

-- Create a new publication for all tables to enable realtime functionality
-- Supabase handles this automatically, but being explicit can be useful.
-- We'll add all tables that might need real-time updates.
CREATE PUBLICATION supabase_realtime FOR TABLE 
    public.profiles, 
    public.balances, 
    public.trades, 
    public.requests, 
    public.investments,
    public.swap_orders,
    public.market_summary_data, 
    public.market_kline_data;

    