---------------------------
-- 0. 清理和准备
---------------------------
-- 删除旧表（如果存在），注意顺序以避免外键约束问题
DROP TABLE IF EXISTS public.commission_logs, public.investments, public.spot_trades, 
             public.contract_trades, public.transactions, public.withdrawal_addresses, 
             public.admin_requests, public.users CASCADE;

-- 删除旧函数（如果存在）
DROP FUNCTION IF EXISTS public.generate_invitation_code();
DROP FUNCTION IF EXISTS public.get_user_downline(UUID);
DROP FUNCTION IF EXISTS public.register_new_user(TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS public.distribute_commissions(UUID, NUMERIC);
DROP FUNCTION IF EXISTS public.admin_get_all_users();
DROP FUNCTION IF EXISTS public.admin_get_user_team(UUID);
DROP FUNCTION IF EXISTS public.check_account_active(UUID);
DROP FUNCTION IF EXISTS public.check_password_complexity(TEXT);

-- 删除旧角色
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'admin_role') THEN
        DROP ROLE admin_role;
    END IF;
END $$;

---------------------------
-- 1. 创建核心用户表 (移除邮箱)
---------------------------
CREATE TABLE public.users (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
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
    -- 至少8字符，包含大小写字母、数字和特殊字符
    IF p_password ~ '^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$' THEN
        RETURN TRUE;
    END IF;
    RAISE EXCEPTION 'PASSWORD_COMPLEXITY' USING 
        MESSAGE = 'Password does not meet complexity requirements',
        DETAIL = 'Password must be at least 8 characters and contain uppercase, lowercase, number and special character';
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
        -- 创建新角色并添加BYPASSRLS属性
        CREATE ROLE admin_role WITH BYPASSRLS NOLOGIN;
    ELSE
        -- 更新现有角色添加BYPASSRLS属性
        ALTER ROLE admin_role WITH BYPASSRLS;
    END IF;
    
    -- 2. 将admin_role授予service_role（Supabase内置管理员角色）
    GRANT admin_role TO service_role;
    
    -- 3. 授予现有表的所有权限
    GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO admin_role;
    
    -- 4. 授予未来表的权限（重要！）
    ALTER DEFAULT PRIVILEGES IN SCHEMA public
    GRANT ALL ON TABLES TO admin_role;
    
    -- 5. 授予序列权限（为自动递增ID）
    GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO admin_role;
    ALTER DEFAULT PRIVILEGES IN SCHEMA public
    GRANT USAGE, SELECT ON SEQUENCES TO admin_role;
    
    -- 6. 授予函数执行权限
    GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO admin_role;
    ALTER DEFAULT PRIVILEGES IN SCHEMA public
    GRANT EXECUTE ON FUNCTIONS TO admin_role;
END $$;

---------------------------
-- 10. 核心业务函数 (移除邮箱)
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
    v_virtual_email TEXT := p_username || '@noemail.app'; -- 生成虚拟邮箱
BEGIN
    -- 检查密码复杂度
    PERFORM public.check_password_complexity(p_password);
    
    -- 查找邀请人
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

    -- 创建认证用户 (使用增强的密码哈希)
    INSERT INTO auth.users(
        id, 
        raw_app_meta_data,  -- 存储用户名
        raw_user_meta_data, -- 存储用户名
        encrypted_password, 
        aud, 
        role, 
        created_at, 
        updated_at
    ) VALUES (
        extensions.uuid_generate_v4(), 
        jsonb_build_object('username', p_username),
        jsonb_build_object('username', p_username),
        crypt(p_password, gen_salt('bf', 12)), -- 增强的密码哈希
        'authenticated', 
        'authenticated', 
        NOW(), 
        NOW()
    ) RETURNING id INTO new_user_id;

    -- 创建业务用户
    INSERT INTO public.users(id, username, inviter_id)
    VALUES (new_user_id, p_username, v_inviter_id);

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
COMMENT ON FUNCTION public.register_new_user IS '注册新用户并建立邀请关系，返回JSON格式结果';

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
    -- 仅处理已完成的交易
    IF NEW.status = 'filled' THEN
        -- 分配佣金
        PERFORM public.distribute_commissions(NEW.user_id, NEW.amount);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_after_contract_trade
AFTER INSERT OR UPDATE ON public.contract_trades
FOR EACH ROW
WHEN (NEW.status = 'filled')
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
-- 13. 账户管理函数 (修正版)
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
-- 14. 初始数据 (无邮箱版本) - 使用环境变量
---------------------------
-- 创建管理员用户
DO $$
DECLARE
    admin_user_id UUID;
    admin_password TEXT := current_setting('app.admin_password', true);
BEGIN
    -- 验证密码长度
    IF LENGTH(admin_password) < 8 THEN
        RAISE EXCEPTION '管理员密码必须至少8个字符';
    END IF;
    
    -- 创建认证用户 (使用环境变量中的密码)
    INSERT INTO auth.users(
        id, 
        raw_app_meta_data, 
        raw_user_meta_data, 
        encrypted_password, 
        aud, 
        role, 
        created_at, 
        updated_at
    ) VALUES (
        extensions.uuid_generate_v4(), 
        jsonb_build_object('username', 'admin'),
        jsonb_build_object('username', 'admin'),
        crypt(admin_password, gen_salt('bf', 12)), 
        'authenticated', 
        'authenticated', 
        NOW(), 
        NOW()
    ) RETURNING id INTO admin_user_id;
    
    -- 创建业务用户
    INSERT INTO public.users(id, username, is_admin, is_test_user, invitation_code)
    VALUES (admin_user_id, 'admin', true, true, 'ADMIN123')
    ON CONFLICT (id) DO NOTHING;
END $$;

-- 创建测试用户
DO $$
DECLARE
    test_user_id UUID;
    admin_id UUID;
    testuser_password TEXT := current_setting('app.testuser_password', true);
BEGIN
    SELECT id INTO admin_id FROM public.users WHERE username = 'admin';
    
    -- 验证密码长度
    IF LENGTH(testuser_password) < 8 THEN
        RAISE EXCEPTION '测试用户密码必须至少8个字符';
    END IF;
    
    -- 创建认证用户 (使用环境变量中的密码)
    INSERT INTO auth.users(
        id, 
        raw_app_meta_data, 
        raw_user_meta_data, 
        encrypted_password, 
        aud, 
        role, 
        created_at, 
        updated_at
    ) VALUES (
        extensions.uuid_generate_v4(), 
        jsonb_build_object('username', 'testuser'),
        jsonb_build_object('username', 'testuser'),
        crypt(testuser_password, gen_salt('bf', 12)), 
        'authenticated', 
        'authenticated', 
        NOW(), 
        NOW()
    ) RETURNING id INTO test_user_id;

    -- 创建业务用户
    INSERT INTO public.users (id, username, inviter_id, is_test_user)
    VALUES (test_user_id, 'testuser', admin_id, true)
    ON CONFLICT (id) DO NOTHING;
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
