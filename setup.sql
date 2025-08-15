
---------------------------
-- 0. 清理和准备
---------------------------
-- 撤销默认权限，以安全地删除角色
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'admin_role') THEN
        ALTER DEFAULT PRIVILEGES IN SCHEMA public FOR ROLE postgres REVOKE ALL ON TABLES FROM admin_role;
        ALTER DEFAULT PRIVILEGES IN SCHEMA public FOR ROLE postgres REVOKE ALL ON FUNCTIONS FROM admin_role;
        ALTER DEFAULT PRIVILEGES IN SCHEMA public FOR ROLE postgres REVOKE ALL ON SEQUENCES FROM admin_role;
        
        -- 撤销对现有对象的权限
        REVOKE ALL PRIVILEGES ON ALL TABLES IN SCHEMA public FROM admin_role;
        REVOKE ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA public FROM admin_role;
        REVOKE ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public FROM admin_role;
    END IF;
END $$;


-- 删除旧角色
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'admin_role') THEN
        DROP ROLE admin_role;
    END IF;
END $$;

-- 删除旧表（如果存在），这会级联删除依赖的触发器
DROP TABLE IF EXISTS public.commission_logs, public.investments, public.spot_trades, 
             public.contract_trades, public.transactions, public.withdrawal_addresses, 
             public.admin_requests, public.users CASCADE;

-- 删除旧函数（如果存在），并指定完整的参数列表
DROP FUNCTION IF EXISTS public.generate_invitation_code();
DROP FUNCTION IF EXISTS public.get_user_downline(UUID);
DROP FUNCTION IF EXISTS public.register_new_user(TEXT, TEXT, TEXT); -- 修正：当前版本
DROP FUNCTION IF EXISTS public.register_new_user(TEXT, TEXT, TEXT, TEXT); -- 兼容旧版本
DROP FUNCTION IF EXISTS public.distribute_commissions(UUID, NUMERIC);
DROP FUNCTION IF EXISTS public.admin_get_all_users();
DROP FUNCTION IF EXISTS public.admin_get_user_team(UUID);
DROP FUNCTION IF EXISTS public.check_account_active(UUID);
DROP FUNCTION IF EXISTS public.check_password_complexity(TEXT);
DROP FUNCTION IF EXISTS public.after_contract_trade();
DROP FUNCTION IF EXISTS public.admin_freeze_user(UUID, BOOLEAN, TEXT);


---------------------------
-- 1. 创建核心用户表
---------------------------
CREATE TABLE public.users (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    username TEXT NOT NULL UNIQUE, 
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
    -- 1. 创建或更新管理员角色
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'admin_role') THEN
        CREATE ROLE admin_role WITH BYPASSRLS NOLOGIN;
    ELSE
        ALTER ROLE admin_role WITH BYPASSRLS;
    END IF;
    
    -- 2. 将admin_role授予service_role（Supabase内置管理员角色）
    GRANT admin_role TO service_role;
    
    -- 3. 授予现有表的所有权限
    GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO admin_role;
    
    -- 4. 授予未来表的权限
    ALTER DEFAULT PRIVILEGES IN SCHEMA public
    GRANT ALL ON TABLES TO admin_role;
    
    -- 5. 授予序列权限
    GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO admin_role;
    ALTER DEFAULT PRIVILEGES IN SCHEMA public
    GRANT USAGE, SELECT ON SEQUENCES TO admin_role;
    
    -- 6. 授予函数执行权限
    GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO admin_role;
    ALTER DEFAULT PRIVILEGES IN SCHEMA public
    GRANT EXECUTE ON FUNCTIONS TO admin_role;
END $$;

---------------------------
-- 10. 核心业务函数
---------------------------
CREATE OR REPLACE FUNCTION public.register_new_user(
    p_password TEXT, 
    p_username TEXT, 
    p_invitation_code TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_inviter_id UUID;
    new_user_id UUID;
    v_is_admin BOOLEAN := false;
    v_is_test_user BOOLEAN := false;
    v_virtual_email TEXT := p_username || '@noemail.app';
BEGIN
    PERFORM public.check_password_complexity(p_password);
    
    IF p_invitation_code = 'admin8888' THEN
        v_is_admin := true;
        v_is_test_user := true; -- Admin is also a test user
        v_inviter_id := NULL;
    ELSE
        SELECT id INTO v_inviter_id 
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

    INSERT INTO auth.users(
        instance_id, id, aud, role, email, encrypted_password,
        email_confirmed_at, recovery_token, recovery_sent_at,
        last_sign_in_at, raw_app_meta_data, raw_user_meta_data,
        created_at, updated_at, phone, phone_confirmed_at,
        email_change, email_change_sent_at, confirmed_at
    ) values (
        '00000000-0000-0000-0000-000000000000', extensions.uuid_generate_v4(), 'authenticated', 'authenticated', v_virtual_email,
        crypt(p_password, gen_salt('bf')),
        now(), '', null, null, '{"provider": "email", "providers": ["email"]}', '{}',
        now(), now(), null, null, '', null, now()
    ) RETURNING id INTO new_user_id;

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
COMMENT ON FUNCTION public.register_new_user IS '注册新用户并建立邀请关系，支持管理员邀请码，返回JSON格式结果';

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
    SELECT username INTO source_username 
    FROM public.users 
    WHERE id = p_source_user_id;
    
    PERFORM public.check_account_active(p_source_user_id);

    WHILE level <= max_level LOOP
        SELECT inviter_id INTO current_inviter_id 
        FROM public.users 
        WHERE id = current_user_id;
        
        EXIT WHEN current_inviter_id IS NULL;
        
        PERFORM public.check_account_active(current_inviter_id);
        
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
    -- For contract trades, commission is on the trade amount
    PERFORM public.distribute_commissions(NEW.user_id, NEW.amount);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 触发器适用于合约交易
CREATE TRIGGER trigger_after_contract_trade
AFTER INSERT ON public.contract_trades
FOR EACH ROW
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
    FROM downline_cte;
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
    p_freeze BOOLEAN,
    p_reason TEXT DEFAULT ''
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
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
-- 14. 初始数据
---------------------------
-- 创建管理员用户
DO $$
DECLARE
    admin_user_id UUID;
    admin_password TEXT;
BEGIN
    admin_password := 'admin_password_placeholder'; -- Replace with a secure password
    
    IF LENGTH(admin_password) < 8 THEN
        RAISE EXCEPTION '管理员密码必须至少8个字符';
    END IF;
    
    INSERT INTO auth.users(
        instance_id, id, aud, role, email, encrypted_password,
        email_confirmed_at, recovery_token, recovery_sent_at,
        last_sign_in_at, raw_app_meta_data, raw_user_meta_data,
        created_at, updated_at, phone, phone_confirmed_at,
        email_change, email_change_sent_at, confirmed_at
    ) values (
        '00000000-0000-0000-0000-000000000000', extensions.uuid_generate_v4(), 'authenticated', 'authenticated', 'admin@noemail.app',
        crypt(admin_password, gen_salt('bf')),
        now(), '', null, null, '{"provider": "email", "providers": ["email"]}', '{"username": "admin"}',
        now(), now(), null, null, '', null, now()
    ) RETURNING id INTO admin_user_id;
    
    INSERT INTO public.users(id, username, is_admin, is_test_user, invitation_code)
    VALUES (admin_user_id, 'admin', true, true, 'admin8888')
    ON CONFLICT (username) DO NOTHING;
END $$;

-- 创建测试用户
DO $$
DECLARE
    test_user_id UUID;
    admin_id UUID;
    testuser_password TEXT;
BEGIN
    SELECT id INTO admin_id FROM public.users WHERE username = 'admin';
    testuser_password := 'testuser_password_placeholder'; -- Replace with a secure password
    
    IF LENGTH(testuser_password) < 8 THEN
        RAISE EXCEPTION '测试用户密码必须至少8个字符';
    END IF;
    
    INSERT INTO auth.users(
         instance_id, id, aud, role, email, encrypted_password,
        email_confirmed_at, recovery_token, recovery_sent_at,
        last_sign_in_at, raw_app_meta_data, raw_user_meta_data,
        created_at, updated_at, phone, phone_confirmed_at,
        email_change, email_change_sent_at, confirmed_at
    ) values (
        '00000000-0000-0000-0000-000000000000', extensions.uuid_generate_v4(), 'authenticated', 'authenticated', 'testuser@noemail.app',
        crypt(testuser_password, gen_salt('bf')),
        now(), '', null, null, '{"provider": "email", "providers": ["email"]}', '{"username": "testuser"}',
        now(), now(), null, null, '', null, now()
    ) RETURNING id INTO test_user_id;

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
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
