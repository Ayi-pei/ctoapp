
-- TradeFlow DB Schema
-- Version: 3.0 (Final)
-- Description: Complete schema with multi-level commission, RLS, and admin setup.

---------------------------
-- 1. 扩展与类型
---------------------------
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

---------------------------
-- 2. 核心用户表
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

COMMENT ON TABLE public.users IS 'Stores user profile information.';

-- 邀请码生成触发器
CREATE OR REPLACE FUNCTION public.generate_invitation_code()
RETURNS TRIGGER AS $$
BEGIN
    NEW.invitation_code := substr(md5(random()::text), 0, 9);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_new_user_before_insert
BEFORE INSERT ON public.users
FOR EACH ROW
EXECUTE FUNCTION public.generate_invitation_code();


---------------------------
-- 3. 交易相关表
---------------------------
-- 财务交易表
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
COMMENT ON TABLE public.transactions IS 'Records deposits, withdrawals, and admin adjustments.';

-- 合约交易表
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
COMMENT ON TABLE public.contract_trades IS 'Records user contract trades.';

-- 现货交易表
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
COMMENT ON TABLE public.spot_trades IS 'Records user spot trades.';

---------------------------
-- 4. 佣金和投资表
---------------------------
-- 佣金日志表
CREATE TABLE public.commission_logs (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    upline_user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE SET NULL,
    source_user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE SET NULL,
    source_username TEXT NOT NULL,
    source_level INT NOT NULL,
    trade_amount NUMERIC(20, 8) NOT NULL,
    commission_rate NUMERIC(5, 4) NOT NULL,
    commission_amount NUMERIC(20, 8) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
COMMENT ON TABLE public.commission_logs IS 'Logs commissions earned from downline trades.';

-- 投资记录表
CREATE TABLE public.investments (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    product_name TEXT NOT NULL,
    amount NUMERIC(20, 8) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
COMMENT ON TABLE public.investments IS 'Records user investments in financial products.';

---------------------------
-- 5. 地址和管理请求表
---------------------------
-- 提现地址表
CREATE TABLE public.withdrawal_addresses (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    address TEXT NOT NULL,
    network TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
COMMENT ON TABLE public.withdrawal_addresses IS 'Stores user saved withdrawal addresses.';

-- 管理员请求表
CREATE TABLE public.admin_requests (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    type TEXT NOT NULL DEFAULT 'password_reset',
    new_password TEXT,
    status TEXT NOT NULL DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT NOW()
);
COMMENT ON TABLE public.admin_requests IS 'Stores user requests requiring admin approval.';

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
-- 7. 行级安全策略
---------------------------
-- 删除可能存在的旧策略以避免冲突
DROP POLICY IF EXISTS "用户可访问自己的资料" ON public.users;
DROP POLICY IF EXISTS "用户可更新自己的资料" ON public.users;
DROP POLICY IF EXISTS "用户可查看上下级资料" ON public.users;
DROP POLICY IF EXISTS "管理员完全访问用户表" ON public.users;
DROP POLICY IF EXISTS "Users can view their team members" ON public.users;

-- 用户表策略
CREATE POLICY "用户可访问自己的资料" ON public.users FOR SELECT USING (auth.uid() = id);

-- 添加用户上下级关系查看策略
CREATE POLICY "Users can view their team members" ON public.users
FOR SELECT USING (
    id IN (
        -- 获取所有上级和下级
        WITH RECURSIVE team_cte (id, inviter_id, level) AS (
            SELECT u.id, u.inviter_id, 1
            FROM public.users u
            WHERE u.id = auth.uid()
            UNION
            SELECT u.id, u.inviter_id, t.level + 1
            FROM public.users u
            INNER JOIN team_cte t ON t.id = u.inviter_id 
            WHERE t.level < 3 
        )
        SELECT id FROM team_cte
    ) OR inviter_id = auth.uid() -- 确保能看到直接下级
);


CREATE POLICY "管理员完全访问用户表" ON public.users FOR ALL
USING ((SELECT is_admin FROM public.users WHERE id = auth.uid()) = true)
WITH CHECK ((SELECT is_admin FROM public.users WHERE id = auth.uid()) = true);


-- 其他表策略 (统一模式)
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
        -- Drop existing policies before creating new ones
        EXECUTE format('DROP POLICY IF EXISTS "用户访问自己的记录" ON public.%I', tbl);
        EXECUTE format('DROP POLICY IF EXISTS "管理员完全访问" ON public.%I', tbl);

        -- Create user-specific policy
        EXECUTE format(
            'CREATE POLICY "用户访问自己的记录" ON public.%I ' ||
            'FOR ALL ' ||
            'USING (auth.uid() = user_id) ' ||
            'WITH CHECK (auth.uid() = user_id)',
            tbl
        );
        
        -- Create admin full access policy
        EXECUTE format(
            'CREATE POLICY "管理员完全访问" ON public.%I ' ||
            'FOR ALL ' ||
            'USING ((SELECT is_admin FROM public.users WHERE id = auth.uid()) = true) ' ||
            'WITH CHECK ((SELECT is_admin FROM public.users WHERE id = auth.uid()) = true)',
            tbl
        );
    END LOOP;
END $$;

-- 佣金日志特殊策略
DROP POLICY IF EXISTS "用户查看自己的佣金" ON public.commission_logs;
DROP POLICY IF EXISTS "管理员完全访问佣金" ON public.commission_logs;

CREATE POLICY "用户查看自己的佣金" ON public.commission_logs FOR SELECT
USING (auth.uid() = upline_user_id);

CREATE POLICY "管理员完全访问佣金" ON public.commission_logs FOR ALL
USING ((SELECT is_admin FROM public.users WHERE id = auth.uid()) = true);


---------------------------
-- 7.1 管理员权限设置 (BYPASSRLS)
---------------------------
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'admin_role') THEN
        CREATE ROLE admin_role;
    END IF;
    
    EXECUTE 'GRANT BYPASSRLS TO admin_role';
    -- This next line might fail if service_role doesn't exist or permissions are locked,
    -- but it's good practice. Supabase handles this grant for its internal roles.
    -- We are granting it to service_role to allow bypassing RLS in function calls if needed.
    EXECUTE 'GRANT admin_role TO service_role'; 
    GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO admin_role;
END $$;


---------------------------
-- 8. 核心业务函数
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
CREATE OR REPLACE FUNCTION public.register_new_user(
    p_email TEXT,
    p_password TEXT,
    p_username TEXT,
    p_invitation_code TEXT
)
RETURNS TABLE (user_id UUID, message TEXT) AS $$
DECLARE
    new_user_id UUID;
    v_inviter_id UUID;
BEGIN
    -- 查找邀请人
    SELECT u.id INTO v_inviter_id
    FROM public.users u
    WHERE u.invitation_code = p_invitation_code;

    IF v_inviter_id IS NULL THEN
        RETURN QUERY SELECT NULL, '无效的邀请码';
        RETURN;
    END IF;

    -- 创建认证用户
    INSERT INTO auth.users (
        id, aud, role, email,
        encrypted_password, email_confirmed_at,
        created_at, updated_at
    ) VALUES (
        extensions.uuid_generate_v4(),
        'authenticated',
        'authenticated',
        p_email,
        crypt(p_password, gen_salt('bf')),
        NOW(),
        NOW(),
        NOW()
    ) RETURNING id INTO new_user_id;

    -- 创建业务用户
    INSERT INTO public.users (id, username, email, inviter_id)
    VALUES (new_user_id, p_username, p_email, v_inviter_id);

    RETURN QUERY SELECT new_user_id, '用户注册成功';
EXCEPTION
    WHEN unique_violation THEN
        RETURN QUERY SELECT NULL, '邮箱或用户名已存在';
    WHEN others THEN
        RETURN QUERY SELECT NULL, '注册错误: ' || SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 佣金分配函数 (3级)
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
    -- 获取来源用户名
    SELECT username INTO source_username
    FROM public.users
    WHERE id = p_source_user_id;

    WHILE level <= 3 LOOP
        -- 获取上级
        SELECT inviter_id INTO current_inviter_id
        FROM public.users
        WHERE id = current_user_id;

        EXIT WHEN current_inviter_id IS NULL;

        -- 记录佣金
        INSERT INTO public.commission_logs (
            upline_user_id,
            source_user_id,
            source_username,
            source_level,
            trade_amount,
            commission_rate,
            commission_amount
        ) VALUES (
            current_inviter_id,
            p_source_user_id,
            source_username,
            level,
            p_trade_amount,
            commission_rates[level],
            p_trade_amount * commission_rates[level]
        );

        -- 向上移动
        current_user_id := current_inviter_id;
        level := level + 1;
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


---------------------------
-- 9. 管理员工具函数
---------------------------
-- 获取所有用户 (管理员)
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

-- 获取用户完整团队 (管理员)
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
-- 10. 初始数据
---------------------------
-- 创建管理员用户
DO $$
DECLARE
    admin_user_id UUID;
BEGIN
    -- 认证用户
    INSERT INTO auth.users (
        id, aud, role, email,
        encrypted_password, email_confirmed_at,
        created_at, updated_at
    ) VALUES (
        extensions.uuid_generate_v4(),
        'authenticated',
        'authenticated',
        'admin@rsf.app',
        crypt('password', gen_salt('bf')),
        NOW(), NOW(), NOW()
    ) ON CONFLICT (email) DO NOTHING
    RETURNING id INTO admin_user_id;

    -- 业务用户
    INSERT INTO public.users (
        id, username, email, is_admin, invitation_code
    ) VALUES (
        (SELECT id FROM auth.users WHERE email = 'admin@rsf.app'),
        'admin', 'admin@rsf.app', true, 'ADMIN123'
    ) ON CONFLICT (id) DO NOTHING;

END $$;

---------------------------
-- 11. 索引优化
---------------------------
CREATE INDEX IF NOT EXISTS idx_users_inviter_id ON public.users(inviter_id);
CREATE INDEX IF NOT EXISTS idx_commission_upline ON public.commission_logs(upline_user_id);
CREATE INDEX IF NOT EXISTS idx_contract_trades_user ON public.contract_trades(user_id);
CREATE INDEX IF NOT EXISTS idx_spot_trades_user ON public.spot_trades(user_id);
CREATE INDEX IF NOT EXISTS idx_users_invitation_code ON public.users(invitation_code);

    