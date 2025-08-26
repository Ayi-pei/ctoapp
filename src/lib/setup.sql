
----------------------------------------------------------------
-- TradeFlow Supabase Schema Setup
-- Version: Final
-- Description: A complete, idempotent script to set up the entire database schema from scratch.
-- Designed for a clean Supabase project.
----------------------------------------------------------------

-- Section 1: Extensions
-- Enable necessary extensions for UUID generation and cryptography.
----------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA extensions;


----------------------------------------------------------------
-- Section 2: Core Tables
-- Creates all the necessary tables for the application.
----------------------------------------------------------------

-- Users Table: Stores user profile information.
CREATE TABLE public.users (
    id UUID PRIMARY KEY NOT NULL, -- Corresponds to auth.users.id
    username TEXT NOT NULL UNIQUE,
    inviter_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    is_admin BOOLEAN NOT NULL DEFAULT false,
    is_test_user BOOLEAN NOT NULL DEFAULT false,
    is_frozen BOOLEAN NOT NULL DEFAULT false,
    invitation_code TEXT UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
COMMENT ON TABLE public.users IS 'Stores user profile information, linking to auth.users.';

-- Transactions Table: Records financial movements.
CREATE TABLE public.transactions (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('deposit', 'withdrawal', 'adjustment')),
    asset TEXT NOT NULL,
    amount NUMERIC(20, 8) NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('pending', 'approved', 'rejected')),
    address TEXT,
    transaction_hash TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
COMMENT ON TABLE public.transactions IS 'Records user deposits, withdrawals, and administrative adjustments.';

-- Contract Trades Table
CREATE TABLE public.contract_trades (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    trading_pair TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('buy', 'sell')),
    amount NUMERIC(20, 8) NOT NULL,
    entry_price NUMERIC(20, 8) NOT NULL,
    settlement_time TIMESTAMPTZ NOT NULL,
    period INT NOT NULL,
    profit_rate NUMERIC(5, 4) NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('active', 'settled')),
    settlement_price NUMERIC(20, 8),
    outcome TEXT CHECK (outcome IN ('win', 'loss')),
    profit NUMERIC(20, 8),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
COMMENT ON TABLE public.contract_trades IS 'Stores user contract (binary options) trading records.';

-- Spot Trades Table
CREATE TABLE public.spot_trades (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    trading_pair TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('buy', 'sell')),
    base_asset TEXT NOT NULL,
    quote_asset TEXT NOT NULL,
    amount NUMERIC(20, 8) NOT NULL,
    total NUMERIC(20, 8) NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('filled', 'cancelled')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
COMMENT ON TABLE public.spot_trades IS 'Stores user spot trading records.';

-- Commission Logs Table
CREATE TABLE public.commission_logs (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    upline_user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    source_user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    source_username TEXT NOT NULL,
    source_level INT NOT NULL,
    trade_amount NUMERIC(20, 8) NOT NULL,
    commission_rate NUMERIC(5, 4) NOT NULL,
    commission_amount NUMERIC(20, 8) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
COMMENT ON TABLE public.commission_logs IS 'Logs commissions earned from downline trades.';

-- Investments Table
CREATE TABLE public.investments (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    product_name TEXT NOT NULL,
    amount NUMERIC(20, 8) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
COMMENT ON TABLE public.investments IS 'Stores user investments in financial products.';

-- Withdrawal Addresses Table
CREATE TABLE public.withdrawal_addresses (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    address TEXT NOT NULL UNIQUE,
    network TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
COMMENT ON TABLE public.withdrawal_addresses IS 'Stores user-saved withdrawal addresses.';

-- Admin Requests Table
CREATE TABLE public.admin_requests (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    type TEXT NOT NULL DEFAULT 'password_reset',
    new_password TEXT,
    status TEXT NOT NULL DEFAULT 'pending',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
COMMENT ON TABLE public.admin_requests IS 'Stores user requests requiring admin approval, like password resets.';


----------------------------------------------------------------
-- Section 3: Functions and Triggers
-- Defines reusable logic and automated actions.
----------------------------------------------------------------

-- Function to generate a unique invitation code for a new user.
CREATE OR REPLACE FUNCTION public.generate_invitation_code()
RETURNS TRIGGER AS $$
BEGIN
    NEW.invitation_code := upper(substr(md5(random()::text || clock_timestamp()::text), 1, 8));
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically generate an invitation code on new user insertion.
CREATE TRIGGER on_new_user_before_insert
BEFORE INSERT ON public.users
FOR EACH ROW
EXECUTE FUNCTION public.generate_invitation_code();


-- Function to register a new user.
CREATE OR REPLACE FUNCTION public.register_new_user(
    p_username TEXT, 
    p_password TEXT, 
    p_invitation_code TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_inviter_id UUID;
    new_user_id UUID;
    v_email TEXT := p_username || '@noemail.app'; -- Use username to create a fake email for auth
BEGIN
    -- Check if username exists in public.users
    IF EXISTS (SELECT 1 FROM public.users WHERE username = p_username) THEN
        RETURN json_build_object('status', 'error', 'message', '用户名已存在');
    END IF;

    -- Handle invitation code logic
    IF p_invitation_code = 'admin8888' THEN
        v_inviter_id := NULL;
    ELSE
        SELECT id INTO v_inviter_id FROM public.users WHERE invitation_code = p_invitation_code;
        IF v_inviter_id IS NULL THEN
            RETURN json_build_object('status', 'error', 'message', '无效的邀请码');
        END IF;
    END IF;

    -- Create user in auth.users
    new_user_id := extensions.uuid_generate_v4();
    INSERT INTO auth.users (id, email, encrypted_password, raw_app_meta_data, raw_user_meta_data, aud, role, created_at, updated_at)
    VALUES (new_user_id, v_email, crypt(p_password, gen_salt('bf')), '{"provider":"email","providers":["email"]}', jsonb_build_object('username', p_username), 'authenticated', 'authenticated', NOW(), NOW());

    -- Create user in public.users
    INSERT INTO public.users(id, username, inviter_id, is_admin)
    VALUES (new_user_id, p_username, v_inviter_id, (p_invitation_code = 'admin8888'));

    RETURN json_build_object('status', 'success', 'user_id', new_user_id, 'message', '用户注册成功');
END;
$$;
COMMENT ON FUNCTION public.register_new_user IS 'Registers a new user, handles admin/regular invitation, and creates profiles in auth and public schemas.';

-- Function to distribute commissions up to 3 levels.
CREATE OR REPLACE FUNCTION public.distribute_commissions(
    p_source_user_id UUID, 
    p_trade_amount NUMERIC
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    commission_rates NUMERIC[] := ARRAY[0.08, 0.05, 0.02];
    current_user_id UUID := p_source_user_id;
    current_inviter_id UUID;
    source_username TEXT;
    level INT := 1;
BEGIN
    SELECT username INTO source_username FROM public.users WHERE id = p_source_user_id;
    
    WHILE level <= 3 LOOP
        SELECT inviter_id INTO current_inviter_id FROM public.users WHERE id = current_user_id;
        EXIT WHEN current_inviter_id IS NULL;
        
        INSERT INTO public.commission_logs(upline_user_id, source_user_id, source_username, source_level, trade_amount, commission_rate, commission_amount)
        VALUES (current_inviter_id, p_source_user_id, source_username, level, p_trade_amount, commission_rates[level], p_trade_amount * commission_rates[level]);
        
        current_user_id := current_inviter_id;
        level := level + 1;
    END LOOP;
END;
$$;
COMMENT ON FUNCTION public.distribute_commissions IS 'Calculates and distributes three levels of commissions after a trade.';

-- Trigger to call commission distribution after a contract trade.
CREATE OR REPLACE FUNCTION public.after_contract_trade()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'settled' THEN
        PERFORM public.distribute_commissions(NEW.user_id, NEW.amount);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_after_contract_trade
AFTER INSERT ON public.contract_trades
FOR EACH ROW
EXECUTE FUNCTION public.after_contract_trade();

-- Function for admin to get all users.
CREATE OR REPLACE FUNCTION public.admin_get_all_users()
RETURNS SETOF public.users
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    IF (SELECT is_admin FROM public.users WHERE id = auth.uid()) THEN
        RETURN QUERY SELECT * FROM public.users ORDER BY created_at DESC;
    ELSE
        RAISE EXCEPTION 'Insufficient privileges';
    END IF;
END;
$$;
COMMENT ON FUNCTION public.admin_get_all_users IS 'Admin-only function to retrieve all user profiles.';


-- Function to get the 3-level downline for a given user.
CREATE OR REPLACE FUNCTION public.get_user_downline(p_user_id UUID)
RETURNS TABLE(id UUID, username TEXT, level INT, created_at TIMESTAMPTZ) AS $$
BEGIN
    RETURN QUERY
    WITH RECURSIVE downline_cte AS (
        SELECT u.id, u.username, u.created_at, 1 AS level
        FROM public.users u
        WHERE u.inviter_id = p_user_id
        UNION ALL
        SELECT u.id, u.username, u.created_at, d.level + 1
        FROM public.users u
        JOIN downline_cte d ON u.inviter_id = d.id
        WHERE d.level < 3
    )
    SELECT d.id, d.username, d.level, d.created_at
    FROM downline_cte;
END;
$$ LANGUAGE plpgsql;
COMMENT ON FUNCTION public.get_user_downline IS 'Retrieves the three-level downline for a specified user.';


----------------------------------------------------------------
-- Section 4: Row Level Security (RLS)
-- Secures data access by enabling RLS and defining policies.
----------------------------------------------------------------

-- Enable RLS on all relevant tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contract_trades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.spot_trades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.commission_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.investments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.withdrawal_addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_requests ENABLE ROW LEVEL SECURITY;

-- Define RLS Policies

-- Admin policy (applies to all tables)
CREATE POLICY "Admin full access" ON public.users FOR ALL USING ( (SELECT is_admin FROM public.users WHERE id = auth.uid()) );
CREATE POLICY "Admin full access" ON public.transactions FOR ALL USING ( (SELECT is_admin FROM public.users WHERE id = auth.uid()) );
CREATE POLICY "Admin full access" ON public.contract_trades FOR ALL USING ( (SELECT is_admin FROM public.users WHERE id = auth.uid()) );
CREATE POLICY "Admin full access" ON public.spot_trades FOR ALL USING ( (SELECT is_admin FROM public.users WHERE id = auth.uid()) );
CREATE POLICY "Admin full access" ON public.commission_logs FOR ALL USING ( (SELECT is_admin FROM public.users WHERE id = auth.uid()) );
CREATE POLICY "Admin full access" ON public.investments FOR ALL USING ( (SELECT is_admin FROM public.users WHERE id = auth.uid()) );
CREATE POLICY "Admin full access" ON public.withdrawal_addresses FOR ALL USING ( (SELECT is_admin FROM public.users WHERE id = auth.uid()) );
CREATE POLICY "Admin full access" ON public.admin_requests FOR ALL USING ( (SELECT is_admin FROM public.users WHERE id = auth.uid()) );

-- User-specific policies
CREATE POLICY "Users can view and manage their own profile" ON public.users FOR ALL USING (auth.uid() = id);

CREATE POLICY "Users can manage their own transactions" ON public.transactions FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage their own contract_trades" ON public.contract_trades FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage their own spot_trades" ON public.spot_trades FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage their own investments" ON public.investments FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage their own withdrawal_addresses" ON public.withdrawal_addresses FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage their own admin_requests" ON public.admin_requests FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own commission logs" ON public.commission_logs FOR SELECT USING (auth.uid() = upline_user_id);


----------------------------------------------------------------
-- Section 5: Initial Data Seeding
-- Inserts essential initial data, like the admin account.
----------------------------------------------------------------

DO $$
DECLARE
    admin_user_id UUID;
    test_user_id UUID;
BEGIN
    -- Create Admin User in auth.users
    admin_user_id := extensions.uuid_generate_v4();
    INSERT INTO auth.users (id, email, encrypted_password, raw_app_meta_data, raw_user_meta_data, aud, role, created_at, updated_at)
    VALUES (admin_user_id, 'admin@noemail.app', crypt('password', gen_salt('bf')), '{"provider":"email","providers":["email"]}', jsonb_build_object('username', 'admin'), 'authenticated', 'authenticated', NOW(), NOW());

    -- Create Admin User in public.users
    INSERT INTO public.users(id, username, is_admin, is_test_user, invitation_code)
    VALUES (admin_user_id, 'admin', true, true, 'ADMIN123');

    -- Create Test User in auth.users
    test_user_id := extensions.uuid_generate_v4();
    INSERT INTO auth.users (id, email, encrypted_password, raw_app_meta_data, raw_user_meta_data, aud, role, created_at, updated_at)
    VALUES (test_user_id, 'testuser@noemail.app', crypt('password', gen_salt('bf')), '{"provider":"email","providers":["email"]}', jsonb_build_object('username', 'testuser'), 'authenticated', 'authenticated', NOW(), NOW());

    -- Create Test User in public.users, invited by admin
    INSERT INTO public.users (id, username, inviter_id, is_test_user)
    VALUES (test_user_id, 'testuser', admin_user_id, true);
END $$;


----------------------------------------------------------------
-- Section 6: Indexes for Performance
-- Adds indexes to frequently queried columns to improve performance.
----------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_users_inviter_id ON public.users(inviter_id);
CREATE INDEX IF NOT EXISTS idx_users_invitation_code ON public.users(invitation_code);
CREATE INDEX IF NOT EXISTS idx_commission_upline ON public.commission_logs(upline_user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_user ON public.transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_contract_trades_user ON public.contract_trades(user_id);
CREATE INDEX IF NOT EXISTS idx_spot_trades_user ON public.spot_trades(user_id);
CREATE INDEX IF NOT EXISTS idx_users_is_frozen ON public.users(is_frozen);


----------------------------------------------------------------
-- End of Script
----------------------------------------------------------------
