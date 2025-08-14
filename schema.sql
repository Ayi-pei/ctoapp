---------------------------
-- 1. 启用扩展
---------------------------
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

---------------------------
-- 2. 创建核心用户表
---------------------------
-- Drop existing tables if they exist to ensure a clean slate
DROP TABLE IF EXISTS public.commission_logs CASCADE;
DROP TABLE IF EXISTS public.investments CASCADE;
DROP TABLE IF EXISTS public.spot_trades CASCADE;
DROP TABLE IF EXISTS public.contract_trades CASCADE;
DROP TABLE IF EXISTS public.transactions CASCADE;
DROP TABLE IF EXISTS public.withdrawal_addresses CASCADE;
DROP TABLE IF EXISTS public.admin_requests CASCADE;
DROP TABLE IF EXISTS public.users CASCADE;

-- Create the users table
CREATE TABLE public.users (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    username TEXT NOT NULL UNIQUE,
    email TEXT, -- Can be nullable if not always available
    inviter_id UUID REFERENCES public.users(id),
    is_admin BOOLEAN DEFAULT false,
    is_test_user BOOLEAN DEFAULT false,
    is_frozen BOOLEAN DEFAULT false,
    invitation_code TEXT UNIQUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Function to generate a unique invitation code
CREATE OR REPLACE FUNCTION public.generate_invitation_code()
RETURNS TEXT AS $$
DECLARE
    code TEXT;
    is_unique BOOLEAN := false;
BEGIN
    WHILE NOT is_unique LOOP
        code := substr(md5(random()::text), 1, 8);
        SELECT NOT EXISTS(SELECT 1 FROM public.users WHERE invitation_code = code) INTO is_unique;
    END LOOP;
    RETURN code;
END;
$$ LANGUAGE plpgsql;

-- Trigger to set invitation code for new users
CREATE OR REPLACE FUNCTION public.set_invitation_code()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.invitation_code IS NULL THEN
        NEW.invitation_code := public.generate_invitation_code();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_new_user_before_insert
BEFORE INSERT ON public.users
FOR EACH ROW
EXECUTE FUNCTION public.set_invitation_code();


---------------------------
-- 3. 创建交易相关表
---------------------------
CREATE TABLE public.transactions (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('deposit', 'withdrawal', 'adjustment')),
    asset TEXT NOT NULL,
    amount NUMERIC(20, 8) NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('pending', 'approved', 'rejected')),
    address TEXT,
    transaction_hash TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

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
    created_at TIMESTAMPTZ DEFAULT NOW()
);

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
    created_at TIMESTAMPTZ DEFAULT NOW()
);

---------------------------
-- 4. 创建佣金和投资表
---------------------------
CREATE TABLE public.commission_logs (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    upline_user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    source_user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    source_username TEXT NOT NULL,
    source_level INT NOT NULL,
    trade_amount NUMERIC(20, 8) NOT NULL,
    commission_rate NUMERIC(5, 4) NOT NULL,
    commission_amount NUMERIC(20, 8) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.investments (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    product_name TEXT NOT NULL,
    amount NUMERIC(20, 8) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

---------------------------
-- 5. 创建地址和管理请求表
---------------------------
CREATE TABLE public.withdrawal_addresses (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    address TEXT NOT NULL UNIQUE,
    network TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.admin_requests (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    type TEXT NOT NULL DEFAULT 'password_reset',
    new_password TEXT,
    status TEXT NOT NULL DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT NOW()
);


---------------------------
-- 6. 启用行级安全 (RLS)
---------------------------
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contract_trades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.spot_trades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.commission_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.investments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.withdrawal_addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_requests ENABLE ROW LEVEL SECURITY;

---------------------------
-- 7. 行级安全策略 (RLS Policies)
---------------------------
-- Function to check if a user is an admin
CREATE OR REPLACE FUNCTION public.is_admin(p_user_id UUID)
RETURNS BOOLEAN AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.users WHERE id = p_user_id AND is_admin = true
    );
$$ LANGUAGE sql SECURITY DEFINER;


-- USERS Table Policies
CREATE POLICY "Allow admin full access to users" 
ON public.users FOR ALL
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Allow users to view their own profile"
ON public.users FOR SELECT
USING (auth.uid() = id);

CREATE POLICY "Allow users to view their direct inviter and invitees"
ON public.users FOR SELECT
USING (EXISTS (
    SELECT 1 FROM public.users u
    WHERE u.id = auth.uid() AND (u.inviter_id = public.users.id OR public.users.inviter_id = u.id)
));


-- GENERIC Tables Policies
DO $$
DECLARE
    tables TEXT[] := ARRAY[
        'transactions', 
        'contract_trades', 
        'spot_trades', 
        'investments', 
        'withdrawal_addresses', 
        'admin_requests'
    ];
    tbl TEXT;
BEGIN
    FOREACH tbl IN ARRAY tables
    LOOP
        EXECUTE format(
            'CREATE POLICY "Allow admin full access to %1$I" ON public.%1$I ' ||
            'FOR ALL USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()))',
            tbl
        );
        EXECUTE format(
            'CREATE POLICY "Allow user to manage their own %1$I" ON public.%1$I ' ||
            'FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id)',
            tbl
        );
    END LOOP;
END $$;


-- COMMISSION_LOGS Table Policies
CREATE POLICY "Allow admin full access to commission_logs"
ON public.commission_logs FOR ALL
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Allow users to see their own commissions"
ON public.commission_logs FOR SELECT
USING (auth.uid() = upline_user_id);


---------------------------
-- 8. 核心业务函数 (RPC)
---------------------------
-- RPC to get a user's downline (up to 3 levels)
CREATE OR REPLACE FUNCTION public.get_user_downline(p_user_id UUID)
RETURNS TABLE(username TEXT, level INT, created_at TIMESTAMPTZ) AS $$
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
    SELECT d.username, d.level, d.created_at
    FROM downline_cte d;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- RPC for user registration
CREATE OR REPLACE FUNCTION public.register_new_user(
    p_email TEXT, 
    p_password TEXT, 
    p_username TEXT, 
    p_invitation_code TEXT
)
RETURNS JSON AS $$
DECLARE
    new_user_id UUID;
    v_inviter_id UUID;
BEGIN
    -- 1. Find inviter
    SELECT id INTO v_inviter_id FROM public.users WHERE invitation_code = p_invitation_code;
    IF v_inviter_id IS NULL THEN
        RETURN json_build_object('success', false, 'message', '无效的邀请码');
    END IF;

    -- 2. Create authentication user
    INSERT INTO auth.users (
        aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at
    ) VALUES (
        'authenticated', 'authenticated', p_email, crypt(p_password, gen_salt('bf')), NOW(), NOW(), NOW()
    ) RETURNING id INTO new_user_id;

    -- 3. Create public user profile
    INSERT INTO public.users (id, username, email, inviter_id)
    VALUES (new_user_id, p_username, p_email, v_inviter_id);

    RETURN json_build_object('success', true, 'user_id', new_user_id, 'message', '用户注册成功');
EXCEPTION
    WHEN unique_violation THEN
        RETURN json_build_object('success', false, 'message', '邮箱或用户名已存在');
    WHEN others THEN
        RETURN json_build_object('success', false, 'message', '注册时发生未知错误: ' || SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- RPC for commission distribution
CREATE OR REPLACE FUNCTION public.distribute_commissions(
    p_source_user_id UUID, 
    p_trade_amount NUMERIC
)
RETURNS void AS $$
DECLARE
    commission_rates NUMERIC[] := ARRAY[0.08, 0.05, 0.02];
    current_user_id UUID := p_source_user_id;
    current_inviter_id UUID;
    source_username_text TEXT;
    level INT := 1;
BEGIN
    SELECT username INTO source_username_text FROM public.users WHERE id = p_source_user_id;
    WHILE level <= 3 LOOP
        SELECT inviter_id INTO current_inviter_id FROM public.users WHERE id = current_user_id;
        EXIT WHEN current_inviter_id IS NULL;
        INSERT INTO public.commission_logs (
            upline_user_id, source_user_id, source_username, source_level,
            trade_amount, commission_rate, commission_amount
        ) VALUES (
            current_inviter_id, p_source_user_id, source_username_text, level,
            p_trade_amount, commission_rates[level], p_trade_amount * commission_rates[level]
        );
        current_user_id := current_inviter_id;
        level := level + 1;
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


---------------------------
-- 9. 管理员工具函数 (RPC)
---------------------------
CREATE OR REPLACE FUNCTION public.admin_get_all_users()
RETURNS SETOF public.users AS $$
BEGIN
    IF NOT public.is_admin(auth.uid()) THEN
        RAISE EXCEPTION '权限不足' USING ERRCODE = 'insufficient_privilege';
    END IF;
    RETURN QUERY SELECT * FROM public.users ORDER BY created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


---------------------------
-- 10. 初始数据 (Seeding)
---------------------------
-- Create admin user
DO $$
DECLARE
    admin_user_id UUID;
BEGIN
    -- Create auth.users entry first
    INSERT INTO auth.users (aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at)
    VALUES ('authenticated', 'authenticated', 'admin@rsf.app', crypt('password', gen_salt('bf')), NOW(), NOW(), NOW())
    ON CONFLICT (email) DO NOTHING
    RETURNING id INTO admin_user_id;

    -- If the user was just inserted, create the public profile
    IF admin_user_id IS NOT NULL THEN
        INSERT INTO public.users (id, username, email, is_admin, is_test_user, invitation_code)
        VALUES (admin_user_id, 'admin', 'admin@rsf.app', true, true, 'ADMINCODE');
    END IF;
END $$;

---------------------------
-- 11. 索引优化 (Indexes)
---------------------------
CREATE INDEX IF NOT EXISTS idx_users_inviter_id ON public.users(inviter_id);
CREATE INDEX IF NOT EXISTS idx_commission_upline_user_id ON public.commission_logs(upline_user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON public.transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_contract_trades_user_id ON public.contract_trades(user_id);
CREATE INDEX IF NOT EXISTS idx_spot_trades_user_id ON public.spot_trades(user_id);
CREATE INDEX IF NOT EXISTS idx_investments_user_id ON public.investments(user_id);
CREATE INDEX IF NOT EXISTS idx_withdrawal_addresses_user_id ON public.withdrawal_addresses(user_id);
CREATE INDEX IF NOT EXISTS idx_admin_requests_user_id ON public.admin_requests(user_id);
