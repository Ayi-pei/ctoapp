
-- Drop existing objects in reverse order of dependency
DROP FUNCTION IF EXISTS public.distribute_commissions(UUID, NUMERIC);
DROP FUNCTION IF EXISTS public.register_new_user(TEXT, TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS public.admin_get_all_users();
DROP FUNCTION IF EXISTS public.admin_get_user_team(UUID);
DROP FUNCTION IF EXISTS public.get_user_downline(UUID);
DROP FUNCTION IF EXISTS public.generate_invitation_code();

DROP POLICY IF EXISTS "用户可访问自己的资料" ON public.users;
DROP POLICY IF EXISTS "用户可查看上下级资料" ON public.users;
DROP POLICY IF EXISTS "管理员完全访问用户表" ON public.users;
DROP POLICY IF EXISTS "用户访问自己的记录" ON public.transactions;
DROP POLICY IF EXISTS "管理员完全访问" ON public.transactions;
DROP POLICY IF EXISTS "用户访问自己的记录" ON public.contract_trades;
DROP POLICY IF EXISTS "管理员完全访问" ON public.contract_trades;
DROP POLICY IF EXISTS "用户访问自己的记录" ON public.spot_trades;
DROP POLICY IF EXISTS "管理员完全访问" ON public.spot_trades;
DROP POLICY IF EXISTS "用户访问自己的记录" ON public.investments;
DROP POLICY IF EXISTS "管理员完全访问" ON public.investments;
DROP POLICY IF EXISTS "用户访问自己的记录" ON public.withdrawal_addresses;
DROP POLICY IF EXISTS "管理员完全访问" ON public.withdrawal_addresses;
DROP POLICY IF EXISTS "用户访问自己的记录" ON public.admin_requests;
DROP POLICY IF EXISTS "管理员完全访问" ON public.admin_requests;
DROP POLICY IF EXISTS "用户查看自己的佣金" ON public.commission_logs;
DROP POLICY IF EXISTS "管理员完全访问佣金" ON public.commission_logs;

DROP TRIGGER IF EXISTS on_new_user_before_insert ON public.users;

DROP TABLE IF EXISTS public.commission_logs;
DROP TABLE IF EXISTS public.investments;
DROP TABLE IF EXISTS public.withdrawal_addresses;
DROP TABLE IF EXISTS public.admin_requests;
DROP TABLE IF EXISTS public.contract_trades;
DROP TABLE IF EXISTS public.spot_trades;
DROP TABLE IF EXISTS public.transactions;
DROP TABLE IF EXISTS public.users;

-- Ensure required extensions are enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pgcrypto;


---------------------------
-- 1. 创建核心用户表
---------------------------
CREATE TABLE public.users (
    id UUID PRIMARY KEY,
    username TEXT NOT NULL UNIQUE,
    email TEXT NOT NULL UNIQUE,
    inviter_id UUID REFERENCES public.users(id),
    is_admin BOOLEAN DEFAULT false NOT NULL,
    is_test_user BOOLEAN DEFAULT false NOT NULL,
    is_frozen BOOLEAN DEFAULT false NOT NULL,
    invitation_code TEXT UNIQUE,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

comment on table public.users is 'Stores user profile information.';
comment on column public.users.id is 'References auth.users.id';

-- 邀请码生成函数
CREATE OR REPLACE FUNCTION public.generate_invitation_code()
RETURNS TRIGGER AS $$
BEGIN
    NEW.invitation_code := substr(md5(random()::text), 0, 9);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 为新用户自动生成邀请码
CREATE TRIGGER on_new_user_before_insert
BEFORE INSERT ON public.users
FOR EACH ROW
EXECUTE FUNCTION public.generate_invitation_code();

---------------------------
-- 2. 创建交易相关表
---------------------------
CREATE TABLE public.transactions (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id),
    type TEXT NOT NULL CHECK (type IN ('deposit', 'withdrawal', 'adjustment')),
    asset TEXT NOT NULL,
    amount NUMERIC(20, 8) NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('pending', 'approved', 'rejected')),
    address TEXT,
    transaction_hash TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE TABLE public.contract_trades (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id),
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
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE TABLE public.spot_trades (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id),
    trading_pair TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('buy', 'sell')),
    base_asset TEXT NOT NULL,
    quote_asset TEXT NOT NULL,
    amount NUMERIC(20, 8) NOT NULL,
    total NUMERIC(20, 8) NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('filled', 'cancelled')),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

---------------------------
-- 3. 创建佣金和投资表
---------------------------
CREATE TABLE public.commission_logs (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    upline_user_id UUID NOT NULL REFERENCES public.users(id),
    source_user_id UUID NOT NULL REFERENCES public.users(id),
    source_username TEXT NOT NULL,
    source_level INT NOT NULL,
    trade_amount NUMERIC(20, 8) NOT NULL,
    commission_rate NUMERIC(5, 4) NOT NULL,
    commission_amount NUMERIC(20, 8) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE TABLE public.investments (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id),
    product_name TEXT NOT NULL,
    amount NUMERIC(20, 8) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

---------------------------
-- 4. 创建地址和管理请求表
---------------------------
CREATE TABLE public.withdrawal_addresses (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id),
    name TEXT NOT NULL,
    address TEXT NOT NULL,
    network TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE TABLE public.admin_requests (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id),
    type TEXT NOT NULL DEFAULT 'password_reset',
    new_password TEXT,
    status TEXT NOT NULL DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

---------------------------
-- 5. 启用行级安全 (RLS)
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
-- 6. 行级安全策略
---------------------------
-- User table policies
CREATE POLICY "Users can view their own profile" ON public.users
FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON public.users
FOR UPDATE USING (auth.uid() = id);

-- Admin has full access to user profiles
CREATE POLICY "Admins can manage all user profiles" ON public.users
FOR ALL USING ((SELECT is_admin FROM public.users WHERE id = auth.uid()) = true);


-- General policies for user-specific tables
DO $$
DECLARE
    tables TEXT[] := ARRAY[
        'transactions', 'contract_trades', 'spot_trades', 'investments', 
        'withdrawal_addresses', 'admin_requests'
    ];
    tbl TEXT;
BEGIN
    FOREACH tbl IN ARRAY tables
    LOOP
        EXECUTE format(
            'CREATE POLICY "Users can manage their own %I" ON public.%I ' ||
            'FOR ALL USING (auth.uid() = user_id)',
            tbl, tbl
        );
        
        EXECUTE format(
            'CREATE POLICY "Admins can manage all %I" ON public.%I ' ||
            'FOR ALL USING ((SELECT is_admin FROM public.users WHERE id = auth.uid()) = true)',
            tbl, tbl
        );
    END LOOP;
END $$;

-- Commission logs policies
CREATE POLICY "Users can view their own commission logs" ON public.commission_logs
FOR SELECT USING (auth.uid() = upline_user_id);

CREATE POLICY "Admins can manage all commission logs" ON public.commission_logs
FOR ALL USING ((SELECT is_admin FROM public.users WHERE id = auth.uid()) = true);


---------------------------
-- 7. 核心业务函数
---------------------------
-- Function to get a user's downline (up to 3 levels)
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

-- User registration function (SECURITY DEFINER)
CREATE OR REPLACE FUNCTION public.register_new_user(
    p_email TEXT, 
    p_password TEXT, 
    p_username TEXT, 
    p_invitation_code TEXT
)
RETURNS json AS $$
DECLARE
    new_user_id UUID;
    v_inviter_id UUID;
BEGIN
    SELECT u.id INTO v_inviter_id 
    FROM public.users u 
    WHERE u.invitation_code = p_invitation_code;
    
    IF v_inviter_id IS NULL THEN
        RAISE EXCEPTION '无效的邀请码' USING ERRCODE = 'P0001';
    END IF;

    -- Create Supabase auth user
    INSERT INTO auth.users (
        instance_id, id, aud, role, email, encrypted_password,
        email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data
    ) VALUES (
        '00000000-0000-0000-0000-000000000000',
        extensions.uuid_generate_v4(), 'authenticated', 'authenticated', p_email, crypt(p_password, gen_salt('bf')),
        NOW(), NOW(), NOW(), '{"provider":"email","providers":["email"]}', '{}'
    ) RETURNING id INTO new_user_id;

    -- Create public profile
    INSERT INTO public.users (id, username, email, inviter_id)
    VALUES (new_user_id, p_username, p_email, v_inviter_id);

    RETURN json_build_object('user_id', new_user_id, 'message', '用户注册成功');
EXCEPTION
    WHEN unique_violation THEN
        RAISE EXCEPTION '邮箱或用户名已存在' USING ERRCODE = '23505';
    WHEN others THEN
        RAISE EXCEPTION '注册时发生未知错误: %', SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Commission distribution function (SECURITY DEFINER)
CREATE OR REPLACE FUNCTION public.distribute_commissions(
    p_source_user_id UUID, 
    p_trade_amount NUMERIC
)
RETURNS void AS $$
DECLARE
    commission_rates NUMERIC[] := ARRAY[0.08, 0.05, 0.02];
    current_user_id UUID := p_source_user_id;
    current_inviter_id UUID;
    source_username TEXT;
    level INT := 1;
BEGIN
    SELECT username INTO source_username 
    FROM public.users 
    WHERE id = p_source_user_id;

    WHILE level <= 3 LOOP
        SELECT inviter_id INTO current_inviter_id 
        FROM public.users 
        WHERE id = current_user_id;

        EXIT WHEN current_inviter_id IS NULL;

        INSERT INTO public.commission_logs (
            upline_user_id, source_user_id, source_username, source_level,
            trade_amount, commission_rate, commission_amount
        ) VALUES (
            current_inviter_id, p_source_user_id, source_username, level,
            p_trade_amount, commission_rates[level], p_trade_amount * commission_rates[level]
        );

        current_user_id := current_inviter_id;
        level := level + 1;
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

---------------------------
-- 8. 管理员工具函数
---------------------------
CREATE OR REPLACE FUNCTION public.admin_get_all_users()
RETURNS SETOF public.users AS $$
BEGIN
    IF (SELECT is_admin FROM public.users WHERE id = auth.uid()) THEN
        RETURN QUERY SELECT * FROM public.users ORDER BY created_at DESC;
    ELSE
        RAISE EXCEPTION '权限不足' USING ERRCODE = 'insufficient_privilege';
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


CREATE OR REPLACE FUNCTION public.admin_get_user_team(p_user_id UUID)
RETURNS TABLE(id UUID, username TEXT, level INT, created_at TIMESTAMPTZ) AS $$
BEGIN
    IF (SELECT is_admin FROM public.users WHERE id = auth.uid()) THEN
        RETURN QUERY SELECT * FROM public.get_user_downline(p_user_id);
    ELSE
        RAISE EXCEPTION '权限不足' USING ERRCODE = 'insufficient_privilege';
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

---------------------------
-- 9. 初始数据
---------------------------
-- Create admin user (idempotent)
INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data
) VALUES (
    '00000000-0000-0000-0000-000000000000',
    '00000000-0000-0000-0000-000000000001', 'authenticated', 'authenticated', 'admin@rsf.app', crypt('password', gen_salt('bf')),
    NOW(), NOW(), NOW(), '{"provider":"email","providers":["email"]}', '{}'
) ON CONFLICT (email) DO NOTHING;

INSERT INTO public.users (id, username, email, is_admin, is_test_user)
VALUES (
    '00000000-0000-0000-0000-000000000001', 'admin', 'admin@rsf.app', true, true
) ON CONFLICT (id) DO NOTHING;

---------------------------
-- 10. 索引优化
---------------------------
CREATE INDEX IF NOT EXISTS idx_users_inviter_id ON public.users(inviter_id);
CREATE INDEX IF NOT EXISTS idx_users_invitation_code ON public.users(invitation_code);
CREATE INDEX IF NOT EXISTS idx_commission_upline ON public.commission_logs(upline_user_id);
CREATE INDEX IF NOT EXISTS idx_trades_user_contract ON public.contract_trades(user_id);
CREATE INDEX IF NOT EXISTS idx_trades_user_spot ON public.spot_trades(user_id);
    