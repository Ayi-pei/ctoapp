---------------------------
-- 0. 清理旧模式 (可选, 用于完全重置)
---------------------------
-- 关闭所有连接
SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = 'postgres' AND pid <> pg_backend_pid();
-- 删除所有表
DROP SCHEMA public CASCADE;
CREATE SCHEMA public;
-- 重置权限
GRANT ALL ON SCHEMA public TO postgres;
GRANT ALL ON SCHEMA public TO public;

---------------------------
-- 1. 创建核心用户表
---------------------------
CREATE TABLE public.users (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    username TEXT NOT NULL UNIQUE,
    email TEXT NOT NULL UNIQUE,
    inviter_id UUID REFERENCES public.users(id),
    is_admin BOOLEAN DEFAULT false,
    is_test_user BOOLEAN DEFAULT false,
    is_frozen BOOLEAN DEFAULT false,
    invitation_code TEXT UNIQUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 为新用户自动生成邀请码的触发器
CREATE OR REPLACE FUNCTION public.generate_invitation_code()
RETURNS TRIGGER AS $$
BEGIN
    NEW.invitation_code := substr(md5(random()::text || clock_timestamp()::text), 1, 8);
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
-- 4. 创建地址和管理请求表
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
CREATE POLICY "Allow users to view their own data" ON public.users FOR SELECT USING (auth.uid() = id);

-- 允许用户查看他们的团队成员 (上下三级)
CREATE POLICY "Allow users to view their team" ON public.users FOR SELECT USING (
    id IN (
        WITH RECURSIVE team_cte AS (
            -- 当前用户
            SELECT u.id, u.inviter_id, 0 as level
            FROM public.users u
            WHERE u.id = auth.uid()

            UNION ALL

            -- 下级
            SELECT u.id, u.inviter_id, t.level + 1
            FROM public.users u
            JOIN team_cte t ON u.inviter_id = t.id
            WHERE t.level < 3

            UNION ALL

            -- 上级
            SELECT u.id, u.inviter_id, t.level - 1
            FROM public.users u
            JOIN team_cte t ON t.inviter_id = u.id
            WHERE t.level > -3
        )
        SELECT team_cte.id FROM team_cte
    )
);

-- 管理员可以完全访问用户表
CREATE POLICY "Allow admin full access to users" ON public.users FOR ALL
    USING ((SELECT is_admin FROM public.users WHERE id = auth.uid()) = true)
    WITH CHECK ((SELECT is_admin FROM public.users WHERE id = auth.uid()) = true);


-- 其他表的通用策略
DO $$
DECLARE
    tables TEXT[] := ARRAY['transactions', 'contract_trades', 'spot_trades', 'investments', 'withdrawal_addresses', 'admin_requests'];
    tbl TEXT;
BEGIN
    FOREACH tbl IN ARRAY tables
    LOOP
        EXECUTE format(
            'CREATE POLICY "Allow users to access their own records" ON public.%I FOR ALL USING (auth.uid() = user_id);',
            tbl
        );
        
        EXECUTE format(
            'CREATE POLICY "Allow admin full access" ON public.%I FOR ALL USING ((SELECT is_admin FROM public.users WHERE id = auth.uid()) = true);',
            tbl
        );
    END LOOP;
END $$;

-- 佣金日志的特殊策略
CREATE POLICY "Allow users to view their own commission logs" ON public.commission_logs FOR SELECT USING (auth.uid() = upline_user_id);
CREATE POLICY "Allow admin full access to commission logs" ON public.commission_logs FOR ALL USING ((SELECT is_admin FROM public.users WHERE id = auth.uid()) = true);


---------------------------
-- 7. 核心业务函数
---------------------------
-- 获取用户下线 (3级)
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
    FROM downline_cte d;
END;
$$ LANGUAGE plpgsql;

-- 用户注册函数
CREATE OR REPLACE FUNCTION public.register_new_user(p_email TEXT, p_password TEXT, p_username TEXT, p_invitation_code TEXT)
RETURNS json AS $$
DECLARE
    new_user_id UUID;
    v_inviter_id UUID;
BEGIN
    SELECT u.id INTO v_inviter_id FROM public.users u WHERE u.invitation_code = p_invitation_code;
    
    IF v_inviter_id IS NULL THEN
        RETURN json_build_object('user_id', null, 'message', '无效的邀请码');
    END IF;

    INSERT INTO auth.users (aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at)
    VALUES ('authenticated', 'authenticated', p_email, crypt(p_password, gen_salt('bf')), NOW(), NOW(), NOW())
    RETURNING id INTO new_user_id;

    INSERT INTO public.users (id, username, email, inviter_id)
    VALUES (new_user_id, p_username, p_email, v_inviter_id);

    RETURN json_build_object('user_id', new_user_id, 'message', '用户注册成功');
EXCEPTION
    WHEN unique_violation THEN
        RETURN json_build_object('user_id', null, 'message', '邮箱或用户名已存在');
    WHEN others THEN
        RETURN json_build_object('user_id', null, 'message', '注册错误: ' || SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 佣金分配函数 (3级)
CREATE OR REPLACE FUNCTION public.distribute_commissions(p_source_user_id UUID, p_trade_amount NUMERIC)
RETURNS void AS $$
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

        INSERT INTO public.commission_logs (upline_user_id, source_user_id, source_username, source_level, trade_amount, commission_rate, commission_amount)
        VALUES (current_inviter_id, p_source_user_id, source_username, level, p_trade_amount, commission_rates[level], p_trade_amount * commission_rates[level]);

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
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.admin_get_user_team(p_user_id UUID)
RETURNS TABLE(id UUID, username TEXT, level INT, created_at TIMESTAMPTZ) AS $$
BEGIN
    IF (SELECT is_admin FROM public.users WHERE id = auth.uid()) THEN
        RETURN QUERY SELECT * FROM public.get_user_downline(p_user_id);
    ELSE
        RAISE EXCEPTION '权限不足' USING ERRCODE = 'insufficient_privilege';
    END IF;
END;
$$ LANGUAGE plpgsql;

---------------------------
-- 9. 初始数据
---------------------------
-- 创建管理员用户
INSERT INTO auth.users (aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at)
VALUES ('authenticated', 'authenticated', 'admin@rsf.app', crypt('password', gen_salt('bf')), NOW(), NOW(), NOW())
ON CONFLICT (email) DO NOTHING;

INSERT INTO public.users (id, username, email, is_admin, is_test_user, is_frozen)
VALUES ((SELECT id FROM auth.users WHERE email = 'admin@rsf.app'), 'admin', 'admin@rsf.app', true, true, false)
ON CONFLICT (id) DO NOTHING;

---------------------------
-- 10. 索引优化
---------------------------
CREATE INDEX IF NOT EXISTS idx_users_inviter_id ON public.users(inviter_id);
CREATE INDEX IF NOT EXISTS idx_users_invitation_code ON public.users(invitation_code);
CREATE INDEX IF NOT EXISTS idx_commission_upline_user_id ON public.commission_logs(upline_user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON public.transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_contract_trades_user_id ON public.contract_trades(user_id);
CREATE INDEX IF NOT EXISTS idx_spot_trades_user_id ON public.spot_trades(user_id);
