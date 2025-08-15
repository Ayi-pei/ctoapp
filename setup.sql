---------------------------
-- 0. 清理和准备
---------------------------
-- 撤销并删除旧角色，处理依赖问题
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'admin_role') THEN
        -- 撤销未来对象的默认权限
        ALTER DEFAULT PRIVILEGES IN SCHEMA public FOR ROLE postgres REVOKE ALL ON TABLES FROM admin_role;
        ALTER DEFAULT PRIVILEGES IN SCHEMA public FOR ROLE postgres REVOKE ALL ON SEQUENCES FROM admin_role;
        ALTER DEFAULT PRIVILEGES IN SCHEMA public FOR ROLE postgres REVOKE ALL ON FUNCTIONS FROM admin_role;
        
        -- 撤销现有对象的所有权限
        REVOKE ALL PRIVILEGES ON ALL TABLES IN SCHEMA public FROM admin_role;
        REVOKE ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public FROM admin_role;
        REVOKE ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA public FROM admin_role;

        -- 现在可以安全删除角色了
        DROP ROLE admin_role;
    END IF;
END $$;

-- 删除旧表（如果存在），注意顺序以避免外键约束问题
DROP TABLE IF EXISTS public.commission_logs, public.investments, public.spot_trades, 
             public.contract_trades, public.transactions, public.withdrawal_addresses, 
             public.admin_requests, public.users CASCADE;

-- 删除旧函数（如果存在）
DROP FUNCTION IF EXISTS public.generate_invitation_code();
DROP FUNCTION IF EXISTS public.get_user_downline(UUID);
DROP FUNCTION IF EXISTS public.register_new_user(TEXT, TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS public.distribute_commissions(UUID, NUMERIC);
DROP FUNCTION IF EXISTS public.admin_get_all_users();
DROP FUNCTION IF EXISTS public.admin_get_user_team(UUID);
DROP FUNCTION IF EXISTS public.check_account_active(UUID);
DROP FUNCTION IF EXISTS public.check_password_complexity(TEXT);


---------------------------
-- 1. 创建核心用户表 (移除邮箱)
---------------------------
CREATE TABLE public.users (
    id UUID PRIMARY KEY, -- 直接使用 auth.users.id
    username TEXT NOT NULL UNIQUE, -- 用户名作为唯一标识
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
-- 2. 账户状态检查函数
---------------------------
CREATE OR REPLACE FUNCTION public.check_account_active(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM public.users 
        WHERE id = user_id AND is_frozen
    ) THEN
        RAISE EXCEPTION 'ACCOUNT_FROZEN' USING 
            MESSAGE = 'Account is frozen',
            DETAIL = 'This account has been frozen by admin and cannot perform this action',
            HINT = 'Contact support for assistance';
    END IF;
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;
COMMENT ON FUNCTION public.check_account_active IS 'Checks if user account is active and not frozen';

---------------------------
-- 3. 密码复杂度检查函数
---------------------------
CREATE OR REPLACE FUNCTION public.check_password_complexity(p_password TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    -- 至少8字符
    IF char_length(p_password) >= 8 THEN
        RETURN TRUE;
    END IF;
    RAISE EXCEPTION 'PASSWORD_COMPLEXITY' USING 
        MESSAGE = 'Password does not meet complexity requirements',
        DETAIL = 'Password must be at least 8 characters';
END;
$$ LANGUAGE plpgsql;
COMMENT ON FUNCTION public.check_password_complexity IS 'Ensures passwords meet security requirements';

---------------------------
-- 4. 创建交易相关表
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
-- 5. 创建佣金和投资表
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
-- 6. 创建地址和管理请求表
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
-- 7. 启用行级安全 (RLS)
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
-- 8. 行级安全策略
---------------------------
-- 用户表策略
CREATE POLICY "Users can view their own profile" ON public.users 
FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON public.users
FOR UPDATE USING (auth.uid() = id);

-- 用户可查看直接邀请的下级
CREATE POLICY "Users can view their direct downline" ON public.users
FOR SELECT USING (inviter_id = auth.uid());

CREATE POLICY "Admin full access on users" ON public.users 
FOR ALL USING (((SELECT is_admin FROM public.users WHERE id = auth.uid()) = true)) 
WITH CHECK (((SELECT is_admin FROM public.users WHERE id = auth.uid()) = true));

-- 统一策略 for other tables
DO $$
DECLARE
    tables TEXT[] := ARRAY['transactions', 'contract_trades', 'spot_trades', 
                          'investments', 'withdrawal_addresses', 'admin_requests'];
    tbl TEXT;
BEGIN
    FOREACH tbl IN ARRAY tables
    LOOP
        EXECUTE format('CREATE POLICY "Users can manage their own records" ON public.%I 
                       FOR ALL USING (auth.uid() = user_id) 
                       WITH CHECK (auth.uid() = user_id)', tbl);
        
        EXECUTE format('CREATE POLICY "Admin full access" ON public.%I 
                       FOR ALL USING (((SELECT is_admin FROM public.users WHERE id = auth.uid()) = true))', tbl);
    END LOOP;
END $$;

-- 佣金日志特殊策略
CREATE POLICY "Users can view their own commission logs" ON public.commission_logs 
FOR SELECT USING (auth.uid() = upline_user_id);

CREATE POLICY "Admin full access on commission logs" ON public.commission_logs 
FOR ALL USING (((SELECT is_admin FROM public.users WHERE id = auth.uid()) = true));

---------------------------
-- 9. 管理员权限设置 (安全增强版)
---------------------------
DO $$
BEGIN
    -- 1. 创建角色
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'admin_role') THEN
        CREATE ROLE admin_role WITH BYPASSRLS NOLOGIN;
    END IF;
    
    -- 2. 将admin_role授予service_role
    GRANT admin_role TO service_role;
    
    -- 3. 授予现有表的权限
    GRANT ALL ON ALL TABLES IN SCHEMA public TO admin_role;
    GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO admin_role;
    GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO admin_role;
    
    -- 4. 授予未来表的权限
    ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO admin_role;
    ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO admin_role;
    ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO admin_role;

END $$;

---------------------------
-- 10. 核心业务函数 (移除邮箱, 实现管理员邀请码逻辑)
---------------------------
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
    v_is_admin BOOLEAN := false;
    v_is_test_user BOOLEAN := false;
    new_user_id UUID;
    v_virtual_email TEXT := p_username || '@noemail.app';
BEGIN
    -- 检查密码复杂度
    PERFORM public.check_password_complexity(p_password);

    -- 处理邀请码逻辑
    IF p_invitation_code = 'admin8888' THEN
        v_is_admin := true;
        v_is_test_user := true; -- 管理员默认为测试用户
        v_inviter_id := NULL;
    ELSE
        -- 查找普通邀请人
        SELECT id, is_test_user INTO v_inviter_id, v_is_test_user
        FROM public.users 
        WHERE invitation_code = p_invitation_code;
        
        IF v_inviter_id IS NULL THEN
            RETURN json_build_object(
                'status', 'error',
                'code', 'INVALID_INVITATION_CODE',
                'message', '无效的邀请码'
            );
        END IF;
    END IF;
    
    -- 创建认证用户 (使用 signUp)
    new_user_id := auth.uid();
    INSERT INTO auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, recovery_token, recovery_sent_at, last_sign_in_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, phone, phone_confirmed_at, is_sso_user)
    VALUES (current_setting('app.instance_id')::uuid, new_user_id, 'authenticated', 'authenticated', v_virtual_email, crypt(p_password, gen_salt('bf')), now(), '', null, null, json_build_object('provider', 'email', 'providers', '["email"]'), '{}'::jsonb, now(), now(), null, null, false);

    -- 创建业务用户
    INSERT INTO public.users(id, username, inviter_id, is_admin, is_test_user)
    VALUES (new_user_id, p_username, v_inviter_id, v_is_admin, v_is_test_user);

    RETURN json_build_object(
        'status', 'success',
        'user_id', new_user_id,
        'message', '用户注册成功'
    );
EXCEPTION
    WHEN unique_violation THEN
        RETURN json_build_object(
            'status', 'error',
            'code', 'USER_EXISTS',
            'message', '用户名已存在'
        );
    WHEN others THEN
        RETURN json_build_object(
            'status', 'error',
            'code', 'REGISTRATION_FAILED',
            'message', '注册失败: ' || SQLERRM
        );
END;
$$;
COMMENT ON FUNCTION public.register_new_user IS '注册新用户。使用 admin8888 邀请码可创建管理员。普通邀请码则建立邀请关系。';


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
    max_level INT := LEAST(array_length(commission_rates, 1), 3);
BEGIN
    -- 获取来源用户信息
    SELECT username INTO source_username 
    FROM public.users 
    WHERE id = p_source_user_id;
    
    -- 检查来源用户状态
    PERFORM public.check_account_active(p_source_user_id);

    WHILE level <= max_level LOOP
        -- 获取上级
        SELECT inviter_id INTO current_inviter_id 
        FROM public.users 
        WHERE id = current_user_id;
        
        -- 没有上级时退出
        EXIT WHEN current_inviter_id IS NULL;
        
        -- 检查上级账户状态
        PERFORM public.check_account_active(current_inviter_id);
        
        -- 记录佣金
        INSERT INTO public.commission_logs(
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
        
        current_user_id := current_inviter_id;
        level := level + 1;
    END LOOP;
END;
$$;
COMMENT ON FUNCTION public.distribute_commissions IS '计算并分配三级佣金：1级8%, 2级5%, 3级2%，自动跳过冻结账户';

---------------------------
-- 11. 交易后自动分配佣金的触发器
---------------------------
CREATE OR REPLACE FUNCTION public.after_contract_trade()
RETURNS TRIGGER AS $$
BEGIN
    -- 仅当交易被结算且有盈利时触发
    IF NEW.status = 'settled' AND NEW.profit > 0 THEN
        -- 分配佣金
        PERFORM public.distribute_commissions(NEW.user_id, NEW.amount);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_after_contract_trade
AFTER UPDATE ON public.contract_trades
FOR EACH ROW
WHEN (OLD.status IS DISTINCT FROM 'settled' AND NEW.status = 'settled')
EXECUTE FUNCTION public.after_contract_trade();

---------------------------
-- 12. 管理员工具函数
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
        RAISE EXCEPTION '权限不足' USING ERRCODE = 'insufficient_privilege';
    END IF;
END;
$$;
COMMENT ON FUNCTION public.admin_get_all_users IS '管理员获取所有用户信息';

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
    FROM downline_cte d ORDER BY d.level, d.created_at;
END;
$$ LANGUAGE plpgsql;
COMMENT ON FUNCTION public.get_user_downline IS '获取用户的三级下线关系';


CREATE OR REPLACE FUNCTION public.admin_get_user_team(p_user_id UUID)
RETURNS TABLE(id UUID, username TEXT, level INT, created_at TIMESTamptz)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    IF (SELECT is_admin FROM public.users WHERE id = auth.uid()) THEN
        RETURN QUERY SELECT * FROM public.get_user_downline(p_user_id);
    ELSE
        RAISE EXCEPTION '权限不足' USING ERRCODE = 'insufficient_privilege';
    END IF;
END;
$$;
COMMENT ON FUNCTION public.admin_get_user_team IS '管理员查看任意用户的团队结构';

---------------------------
-- 13. 账户管理函数
---------------------------
CREATE OR REPLACE FUNCTION public.admin_freeze_user(
    p_user_id UUID,
    p_freeze BOOLEAN
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- 检查管理员权限
    IF NOT (SELECT is_admin FROM public.users WHERE id = auth.uid()) THEN
        RAISE EXCEPTION '权限不足' USING ERRCODE = 'insufficient_privilege';
    END IF;
    
    UPDATE public.users
    SET 
        is_frozen = p_freeze
    WHERE id = p_user_id;
END;
$$;
COMMENT ON FUNCTION public.admin_freeze_user IS '管理员冻结或解冻用户账户';

---------------------------
-- 14. 初始数据 - 使用默认密码
---------------------------
-- 创建管理员用户
DO $$
DECLARE
    admin_user_id UUID;
    admin_password TEXT := 'password'; -- 直接设置密码
BEGIN
    -- 创建认证用户
    admin_user_id := extensions.uuid_generate_v4();
    INSERT INTO auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, is_sso_user)
    VALUES (current_setting('app.instance_id')::uuid, admin_user_id, 'authenticated', 'authenticated', 'admin@noemail.app', crypt(admin_password, gen_salt('bf')), now(), json_build_object('provider', 'email', 'providers', '["email"]'), '{}'::jsonb, now(), now(), false)
    ON CONFLICT (email) DO NOTHING;
    
    -- 获取刚插入或已存在的用户ID
    SELECT id INTO admin_user_id FROM auth.users WHERE email = 'admin@noemail.app';

    -- 创建业务用户
    INSERT INTO public.users(id, username, is_admin, is_test_user, invitation_code)
    VALUES (admin_user_id, 'admin', true, true, 'ADMIN123')
    ON CONFLICT (username) DO NOTHING;
END $$;

-- 创建测试用户
DO $$
DECLARE
    test_user_id UUID;
    admin_id UUID;
    testuser_password TEXT := 'password'; -- 直接设置密码
BEGIN
    SELECT id INTO admin_id FROM public.users WHERE username = 'admin';
    
    -- 创建认证用户
    test_user_id := extensions.uuid_generate_v4();
    INSERT INTO auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, is_sso_user)
    VALUES (current_setting('app.instance_id')::uuid, test_user_id, 'authenticated', 'authenticated', 'testuser@noemail.app', crypt(testuser_password, gen_salt('bf')), now(), json_build_object('provider', 'email', 'providers', '["email"]'), '{}'::jsonb, now(), now(), false)
    ON CONFLICT (email) DO NOTHING;

    -- 获取刚插入或已存在的用户ID
    SELECT id INTO test_user_id FROM auth.users WHERE email = 'testuser@noemail.app';

    -- 创建业务用户
    INSERT INTO public.users (id, username, inviter_id, is_test_user)
    VALUES (test_user_id, 'testuser', admin_id, true)
    ON CONFLICT (username) DO NOTHING;
END $$;

---------------------------
-- 15. 索引优化
---------------------------
CREATE INDEX IF NOT EXISTS idx_users_inviter_id ON public.users(inviter_id);
CREATE INDEX IF NOT EXISTS idx_users_invitation_code ON public.users(invitation_code);
CREATE INDEX IF NOT EXISTS idx_commission_upline ON public.commission_logs(upline_user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_user ON public.transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_contract_trades_user ON public.contract_trades(user_id);
CREATE INDEX IF NOT EXISTS idx_spot_trades_user ON public.spot_trades(user_id);
CREATE INDEX IF NOT EXISTS idx_users_is_frozen ON public.users(is_frozen);

---------------------------
-- 16. 扩展启用确认
---------------------------
-- 确保所有必要扩展已启用
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
