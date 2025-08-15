
---------------------------
-- 0. 健壮的清理脚本 (Idempotent Cleanup)
---------------------------
DO $$
BEGIN
    -- 只有当 admin_role 存在时，才执行清理操作
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'admin_role') THEN
        -- 关键步骤：将当前用户（通常是 postgres）加入到 admin_role 中，以获取权限
        EXECUTE 'GRANT admin_role TO ' || quote_ident(current_user);

        -- 1. 将 admin_role 拥有的所有对象的所有权重新分配给 postgres 用户
        REASSIGN OWNED BY admin_role TO postgres;

        -- 2. 删除授予 admin_role 的所有权限
        DROP OWNED BY admin_role;

        -- 3. 现在可以安全地删除角色了
        DROP ROLE IF EXISTS admin_role;
    END IF;
END $$;

-- 使用 CASCADE 安全地删除表，自动处理依赖
DROP TABLE IF EXISTS public.users CASCADE;
-- 由于 CASCADE 会处理依赖，下面的表如果存在会被一并删除，但为了明确性，可以保留
DROP TABLE IF EXISTS public.commission_logs, public.investments, public.spot_trades, 
             public.contract_trades, public.transactions, public.withdrawal_addresses, 
             public.admin_requests;

-- 精确指定函数签名来删除，避免 "not unique" 错误
DROP FUNCTION IF EXISTS public.generate_invitation_code();
DROP FUNCTION IF EXISTS public.get_user_downline(UUID);
DROP FUNCTION IF EXISTS public.register_new_user(TEXT, TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS public.distribute_commissions(UUID, NUMERIC);
DROP FUNCTION IF EXISTS public.admin_get_all_users();
DROP FUNCTION IF EXISTS public.admin_get_user_team(UUID);
DROP FUNCTION IF EXISTS public.check_account_active(UUID);
DROP FUNCTION IF EXISTS public.check_password_complexity(TEXT);
DROP FUNCTION IF EXISTS public.after_contract_trade();
DROP FUNCTION IF EXISTS public.admin_freeze_user(UUID, BOOLEAN, TEXT);


---------------------------
-- 1. 创建核心用户表 (移除邮箱)
---------------------------
CREATE TABLE public.users (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    username TEXT NOT NULL UNIQUE, -- 用户名作为唯一标识
    inviter_id UUID REFERENCES public.users(id) ON DELETE SET NULL, -- 邀请人被删除时，保留被邀请用户
    is_admin BOOLEAN NOT NULL DEFAULT false,
    is_test_user BOOLEAN NOT NULL DEFAULT false,
    is_frozen BOOLEAN NOT NULL DEFAULT false,
    invitation_code TEXT UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    email TEXT UNIQUE -- 仍然保留email字段以兼容Supabase Auth，但设为唯一
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
CREATE OR REPLACE FUNCTION public.check_account_active(p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM public.users 
        WHERE id = p_user_id AND is_frozen
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
    RAISE EXCEPTION 'PASSWORD_TOO_SHORT' USING 
        MESSAGE = 'Password does not meet complexity requirements',
        DETAIL = 'Password must be at least 8 characters long';
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
-- 9. 核心业务函数 (修正版)
---------------------------
CREATE OR REPLACE FUNCTION public.register_new_user(
    p_email TEXT,
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
    v_is_admin BOOLEAN := false;
    new_user_id UUID;
BEGIN
    -- 检查密码复杂度
    PERFORM public.check_password_complexity(p_password);

    -- 检查用户名是否已存在
    IF EXISTS (SELECT 1 FROM public.users WHERE username = p_username) THEN
        RETURN json_build_object('status', 'error', 'message', '用户名已存在');
    END IF;

    -- 检查邮箱是否已存在 (在 auth.users 中)
    IF EXISTS (SELECT 1 FROM auth.users WHERE email = p_email) THEN
        RETURN json_build_object('status', 'error', 'message', '邮箱已被注册');
    END IF;
    
    -- 检查邀请码逻辑
    IF p_invitation_code = 'admin8888' THEN
        v_is_admin := true;
        v_inviter_id := NULL;
    ELSE
        SELECT id INTO v_inviter_id 
        FROM public.users 
        WHERE invitation_code = p_invitation_code;
        
        IF v_inviter_id IS NULL THEN
            RETURN json_build_object('status', 'error', 'message', '无效的邀请码');
        END IF;
    END IF;

    -- 创建认证用户
    new_user_id := auth.uid();
    INSERT INTO auth.users(instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, recovery_token, recovery_sent_at, last_sign_in_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, confirmation_token, confirmation_sent_at, phone)
    values (extensions.uuid_generate_v4(), new_user_id, 'authenticated', 'authenticated', p_email, crypt(p_password, gen_salt('bf')), now(), '', null, null, '{"provider": "email", "providers": ["email"]}', '{}', now(), now(), '', null, null);


    -- 创建业务用户
    INSERT INTO public.users(id, username, inviter_id, is_admin, email)
    VALUES (new_user_id, p_username, v_inviter_id, v_is_admin, p_email);

    RETURN json_build_object(
        'status', 'success',
        'user_id', new_user_id,
        'message', '用户注册成功'
    );
EXCEPTION
    WHEN others THEN
        RETURN json_build_object(
            'status', 'error',
            'message', '注册失败: ' || SQLERRM
        );
END;
$$;
COMMENT ON FUNCTION public.register_new_user IS '注册新用户，处理管理员和普通邀请码逻辑，返回JSON结果。';


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
    max_level INT := 3;
BEGIN
    SELECT username INTO source_username FROM public.users WHERE id = p_source_user_id;
    
    WHILE level <= max_level LOOP
        SELECT inviter_id INTO current_inviter_id FROM public.users WHERE id = current_user_id;
        
        EXIT WHEN current_inviter_id IS NULL;
        
        IF public.check_account_active(current_inviter_id) THEN
            INSERT INTO public.commission_logs(upline_user_id, source_user_id, source_username, source_level, trade_amount, commission_rate, commission_amount) 
            VALUES (current_inviter_id, p_source_user_id, source_username, level, p_trade_amount, commission_rates[level], p_trade_amount * commission_rates[level]);
        END IF;
        
        current_user_id := current_inviter_id;
        level := level + 1;
    END LOOP;
END;
$$;
COMMENT ON FUNCTION public.distribute_commissions IS '计算并分配三级佣金，自动跳过冻结账户。';

---------------------------
-- 10. 交易后自动分配佣金的触发器
---------------------------
CREATE OR REPLACE FUNCTION public.after_contract_trade()
RETURNS TRIGGER AS $$
BEGIN
    -- 仅在插入已结算的盈利合约交易时触发
    IF (TG_OP = 'INSERT' OR TG_OP = 'UPDATE') AND NEW.status = 'settled' AND NEW.outcome = 'win' THEN
        PERFORM public.distribute_commissions(NEW.user_id, NEW.amount);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_after_contract_trade
AFTER INSERT OR UPDATE ON public.contract_trades
FOR EACH ROW
EXECUTE FUNCTION public.after_contract_trade();

---------------------------
-- 11. 管理员工具函数
---------------------------
CREATE OR REPLACE FUNCTION public.admin_get_all_users()
RETURNS TABLE (
    id UUID,
    username TEXT,
    email TEXT,
    inviter_id UUID,
    is_admin BOOLEAN,
    is_test_user BOOLEAN,
    is_frozen BOOLEAN,
    invitation_code TEXT,
    created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    IF (SELECT is_admin FROM public.users WHERE id = auth.uid()) THEN
        RETURN QUERY SELECT u.id, u.username, u.email, u.inviter_id, u.is_admin, u.is_test_user, u.is_frozen, u.invitation_code, u.created_at FROM public.users u ORDER BY u.created_at DESC;
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


---------------------------
-- 12. 初始数据
---------------------------
-- 创建管理员用户
DO $$
DECLARE
    admin_user_id UUID;
    admin_email TEXT := 'admin@noemail.app';
    admin_username TEXT := 'admin';
BEGIN
    -- 检查用户是否已存在
    SELECT id INTO admin_user_id FROM public.users WHERE username = admin_username;
    IF admin_user_id IS NULL THEN
        -- 创建认证用户
        admin_user_id := auth.uid();
        INSERT INTO auth.users(instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, recovery_token, recovery_sent_at, last_sign_in_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, confirmation_token, confirmation_sent_at, phone)
        values (extensions.uuid_generate_v4(), admin_user_id, 'authenticated', 'authenticated', admin_email, crypt('password', gen_salt('bf')), now(), '', null, null, '{"provider": "email", "providers": ["email"]}', '{}', now(), now(), '', null, null);

        -- 创建业务用户
        INSERT INTO public.users(id, username, is_admin, is_test_user, email, invitation_code)
        VALUES (admin_user_id, admin_username, true, true, admin_email, 'ADMIN123');
    END IF;
END $$;

-- 创建测试用户
DO $$
DECLARE
    test_user_id UUID;
    admin_id UUID;
    test_email TEXT := 'testuser@noemail.app';
    test_username TEXT := 'testuser';
BEGIN
    SELECT id INTO admin_id FROM public.users WHERE username = 'admin';
    
    -- 检查测试用户是否已存在
    SELECT id INTO test_user_id FROM public.users WHERE username = test_username;
    IF test_user_id IS NULL AND admin_id IS NOT NULL THEN
        -- 创建认证用户
        test_user_id := auth.uid();
        INSERT INTO auth.users(instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, recovery_token, recovery_sent_at, last_sign_in_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, confirmation_token, confirmation_sent_at, phone)
        values (extensions.uuid_generate_v4(), test_user_id, 'authenticated', 'authenticated', test_email, crypt('password', gen_salt('bf')), now(), '', null, null, '{"provider": "email", "providers": ["email"]}', '{}', now(), now(), '', null, null);

        -- 创建业务用户
        INSERT INTO public.users (id, username, inviter_id, is_test_user, email)
        VALUES (test_user_id, test_username, admin_id, true, test_email);
    END IF;
END $$;


---------------------------
-- 13. 索引优化
---------------------------
CREATE INDEX IF NOT EXISTS idx_users_inviter_id ON public.users(inviter_id);
CREATE INDEX IF NOT EXISTS idx_users_invitation_code ON public.users(invitation_code);
CREATE INDEX IF NOT EXISTS idx_commission_upline ON public.commission_logs(upline_user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_user ON public.transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_contract_trades_user ON public.contract_trades(user_id);
CREATE INDEX IF NOT EXISTS idx_spot_trades_user ON public.spot_trades(user_id);
CREATE INDEX IF NOT EXISTS idx_users_is_frozen ON public.users(is_frozen);
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_users_username ON public.users(username);


---------------------------
-- 14. 扩展启用确认
---------------------------
-- 确保所有必要扩展已启用
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA extensions;

