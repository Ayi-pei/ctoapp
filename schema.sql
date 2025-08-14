---------------------------
-- 0. 清理和准备
---------------------------
-- 删除旧表（如果存在），注意顺序以避免外键约束问题
DROP TABLE IF EXISTS public.commission_logs, public.investments, public.spot_trades, public.contract_trades, public.transactions, public.withdrawal_addresses, public.admin_requests, public.users CASCADE;

-- 删除旧函数（如果存在）
DROP FUNCTION IF EXISTS public.generate_invitation_code();
DROP FUNCTION IF EXISTS public.get_user_downline(UUID);
DROP FUNCTION IF EXISTS public.register_new_user(TEXT, TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS public.distribute_commissions(UUID, NUMERIC);
DROP FUNCTION IF EXISTS public.admin_get_all_users();
DROP FUNCTION IF EXISTS public.admin_get_user_team(UUID);

-- 删除旧角色
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'admin_role') THEN
        DROP ROLE admin_role;
    END IF;
END $$;

---------------------------
-- 1. 创建核心用户表
---------------------------
CREATE TABLE public.users (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    username TEXT NOT NULL UNIQUE,
    email TEXT NOT NULL UNIQUE,
    inviter_id UUID REFERENCES public.users(id),
    is_admin BOOLEAN NOT NULL DEFAULT false,
    is_test_user BOOLEAN NOT NULL DEFAULT false,
    is_frozen BOOLEAN NOT NULL DEFAULT false,
    invitation_code TEXT UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
COMMENT ON TABLE public.users IS 'Stores user profile information.';

-- 创建邀请码生成触发器
CREATE OR REPLACE FUNCTION public.generate_invitation_code()
RETURNS TRIGGER AS $$
BEGIN
    -- 生成一个8位的、不太可能重复的邀请码
    NEW.invitation_code := upper(substr(md5(random()::text || clock_timestamp()::text), 1, 8));
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_new_user_before_insert
BEFORE INSERT ON public.users
FOR EACH ROW
EXECUTE FUNCTION public.generate_invitation_code();

---------------------------
-- 2. 创建交易相关表
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
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
COMMENT ON TABLE public.transactions IS 'Records user deposits, withdrawals, and administrative adjustments.';

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
COMMENT ON TABLE public.contract_trades IS 'Stores user contract trading records.';

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

---------------------------
-- 3. 创建佣金和投资表
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
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
COMMENT ON TABLE public.commission_logs IS 'Logs commissions earned from downline trades.';

CREATE TABLE public.investments (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    product_name TEXT NOT NULL,
    amount NUMERIC(20, 8) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
COMMENT ON TABLE public.investments IS 'Stores user investments in financial products.';

---------------------------
-- 4. 创建地址和管理请求表
---------------------------
CREATE TABLE public.withdrawal_addresses (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    address TEXT NOT NULL UNIQUE,
    network TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
COMMENT ON TABLE public.withdrawal_addresses IS 'Stores user withdrawal addresses.';

CREATE TABLE public.admin_requests (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    type TEXT NOT NULL DEFAULT 'password_reset',
    new_password TEXT,
    status TEXT NOT NULL DEFAULT 'pending',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
COMMENT ON TABLE public.admin_requests IS 'Stores user requests requiring admin approval.';

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
-- 用户表策略
CREATE POLICY "Users can view their own profile" ON public.users FOR SELECT USING (auth.uid() = id);

-- RLS to view upline/downline is complex with multi-level, better handled by RPC functions.
-- This policy allows users to see their direct inviter.
CREATE POLICY "Users can view their direct inviter" ON public.users FOR SELECT USING (inviter_id = auth.uid());

CREATE POLICY "Admin full access on users" ON public.users FOR ALL USING ((( SELECT is_admin FROM public.users WHERE id = auth.uid()) = true)) WITH CHECK ((( SELECT is_admin FROM public.users WHERE id = auth.uid()) = true));

-- 统一策略 for other tables
DO $$
DECLARE
    tables TEXT[] := ARRAY['transactions', 'contract_trades', 'spot_trades', 'investments', 'withdrawal_addresses', 'admin_requests'];
    tbl TEXT;
BEGIN
    FOREACH tbl IN ARRAY tables
    LOOP
        EXECUTE format('CREATE POLICY "Users can manage their own records" ON public.%I FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id)', tbl);
        EXECUTE format('CREATE POLICY "Admin full access" ON public.%I FOR ALL USING ((( SELECT is_admin FROM public.users WHERE id = auth.uid()) = true))', tbl);
    END LOOP;
END $$;

-- 佣金日志特殊策略
CREATE POLICY "Users can view their own commission logs" ON public.commission_logs FOR SELECT USING (auth.uid() = upline_user_id);
CREATE POLICY "Admin full access on commission logs" ON public.commission_logs FOR ALL USING ((( SELECT is_admin FROM public.users WHERE id = auth.uid()) = true));


---------------------------
-- 7. 核心业务函数
---------------------------
COMMENT ON FUNCTION public.get_user_downline IS 'DEPRECATED - Use admin_get_user_team for admin access.';

CREATE OR REPLACE FUNCTION public.register_new_user(p_email text, p_password text, p_username text, p_invitation_code text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_inviter_id UUID;
    new_user_id UUID;
BEGIN
    SELECT id INTO v_inviter_id FROM public.users WHERE invitation_code = p_invitation_code;
    IF v_inviter_id IS NULL THEN
        RETURN json_build_object('error', '无效的邀请码');
    END IF;

    INSERT INTO auth.users(id, email, encrypted_password, aud, role, email_confirmed_at, created_at, updated_at)
    VALUES (extensions.uuid_generate_v4(), p_email, crypt(p_password, gen_salt('bf')), 'authenticated', 'authenticated', NOW(), NOW(), NOW())
    RETURNING id INTO new_user_id;

    INSERT INTO public.users(id, username, email, inviter_id)
    VALUES (new_user_id, p_username, p_email, v_inviter_id);

    RETURN json_build_object('user_id', new_user_id, 'message', '用户注册成功');
EXCEPTION
    WHEN unique_violation THEN
        RETURN json_build_object('error', '邮箱或用户名已存在');
    WHEN others THEN
        RETURN json_build_object('error', '注册失败: ' || SQLERRM);
END;
$$;

CREATE OR REPLACE FUNCTION public.distribute_commissions(p_source_user_id UUID, p_trade_amount NUMERIC)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    commission_rates NUMERIC[] := ARRAY[0.08, 0.05, 0.02];
    current_user_id UUID := p_source_user_id;
    current_inviter_id UUID;
    source_user_info RECORD;
    level INT := 1;
BEGIN
    SELECT username, is_frozen INTO source_user_info FROM public.users WHERE id = p_source_user_id;
    
    -- If the user who made the trade is frozen, no commissions are distributed.
    IF source_user_info.is_frozen THEN
        RETURN;
    END IF;

    WHILE level <= array_length(commission_rates, 1) LOOP
        SELECT inviter_id INTO current_inviter_id FROM public.users WHERE id = current_user_id;
        EXIT WHEN current_inviter_id IS NULL;

        INSERT INTO public.commission_logs(upline_user_id, source_user_id, source_username, source_level, trade_amount, commission_rate, commission_amount)
        VALUES (current_inviter_id, p_source_user_id, source_user_info.username, level, p_trade_amount, commission_rates[level], p_trade_amount * commission_rates[level]);
        
        current_user_id := current_inviter_id;
        level := level + 1;
    END LOOP;
END;
$$;
COMMENT ON FUNCTION public.distribute_commissions IS 'Distributes commissions up to 3 levels: 8% for level 1, 5% for level 2, 2% for level 3.';

---------------------------
-- 8. 管理员工具函数
---------------------------
CREATE OR REPLACE FUNCTION public.admin_get_all_users()
RETURNS SETOF public.users
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    IF (SELECT is_admin FROM public.users WHERE id = auth.uid()) THEN
        RETURN QUERY SELECT * FROM public.users ORDER BY created_at DESC;
    ELSE
        RAISE EXCEPTION 'Insufficient privilege';
    END IF;
END;
$$;

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


CREATE OR REPLACE FUNCTION public.admin_get_user_team(p_user_id UUID)
RETURNS TABLE(id UUID, username TEXT, level INT, created_at TIMESTAMPTZ)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    IF (SELECT is_admin FROM public.users WHERE id = auth.uid()) THEN
        RETURN QUERY SELECT * FROM public.get_user_downline(p_user_id);
    ELSE
        RAISE EXCEPTION 'Insufficient privilege';
    END IF;
END;
$$;

---------------------------
-- 9. 初始数据
---------------------------
-- 创建管理员用户
DO $$
DECLARE
    admin_user_id UUID;
    admin_email TEXT := 'admin@rsf.app';
BEGIN
    -- Check if admin user already exists in auth.users
    SELECT id INTO admin_user_id FROM auth.users WHERE email = admin_email;

    -- If not, create it
    IF admin_user_id IS NULL THEN
        INSERT INTO auth.users(id, email, encrypted_password, aud, role, email_confirmed_at, created_at, updated_at)
        VALUES (extensions.uuid_generate_v4(), admin_email, crypt('password', gen_salt('bf')), 'authenticated', 'authenticated', NOW(), NOW(), NOW())
        RETURNING id INTO admin_user_id;
    END IF;
    
    -- Insert into public.users, or do nothing if it's already there
    INSERT INTO public.users(id, username, email, is_admin, is_test_user, invitation_code)
    VALUES (admin_user_id, 'admin', admin_email, true, true, 'ADMIN123')
    ON CONFLICT (id) DO NOTHING;
END $$;


-- 创建测试用户
DO $$
DECLARE
    test_user_id UUID;
    admin_id UUID;
    test_email TEXT := 'test@rsf.app';
BEGIN
    SELECT id INTO admin_id FROM public.users WHERE username = 'admin';
    
    -- Check if test user already exists
    SELECT id INTO test_user_id FROM auth.users WHERE email = test_email;

    -- If not, create it
    IF test_user_id IS NULL THEN
         INSERT INTO auth.users(id, email, encrypted_password, aud, role, email_confirmed_at, created_at, updated_at)
         VALUES (extensions.uuid_generate_v4(), test_email, crypt('password', gen_salt('bf')), 'authenticated', 'authenticated', NOW(), NOW(), NOW())
         RETURNING id INTO test_user_id;

         -- Insert profile for the new test user
         INSERT INTO public.users (id, username, email, inviter_id, is_test_user)
         VALUES (test_user_id, 'testuser', test_email, admin_id, true)
         ON CONFLICT (id) DO NOTHING;
    END IF;
END $$;

---------------------------
-- 10. 索引优化
---------------------------
CREATE INDEX IF NOT EXISTS idx_users_inviter_id ON public.users(inviter_id);
CREATE INDEX IF NOT EXISTS idx_users_invitation_code ON public.users(invitation_code);
CREATE INDEX IF NOT EXISTS idx_commission_upline ON public.commission_logs(upline_user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_user ON public.transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_contract_trades_user ON public.contract_trades(user_id);
CREATE INDEX IF NOT EXISTS idx_spot_trades_user ON public.spot_trades(user_id);
