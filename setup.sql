
---------------------------
-- 0. 清理和准备 (健壮版)
---------------------------

-- 撤销默认权限以解除依赖
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'admin_role') THEN
        ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM admin_role;
        ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON FUNCTIONS FROM admin_role;
        ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON SEQUENCES FROM admin_role;
    END IF;
END $$;

-- 明确指定参数类型来删除旧函数，避免歧义
DROP FUNCTION IF EXISTS public.generate_invitation_code();
DROP FUNCTION IF EXISTS public.get_user_downline(UUID);
DROP FUNCTION IF EXISTS public.register_new_user(TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS public.distribute_commissions(UUID, NUMERIC);
DROP FUNCTION IF EXISTS public.admin_get_all_users();
DROP FUNCTION IF EXISTS public.admin_get_user_team(UUID);
DROP FUNCTION IF EXISTS public.check_account_active(UUID);
DROP FUNCTION IF EXISTS public.check_password_complexity(TEXT);
DROP FUNCTION IF EXISTS public.after_contract_trade();
DROP FUNCTION IF EXISTS public.admin_freeze_user(UUID, BOOLEAN, TEXT); -- 明确指定所有参数

-- 删除旧角色
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'admin_role') THEN
        REASSIGN OWNED BY admin_role TO postgres; -- 转移所有权
        DROP OWNED BY admin_role; -- 删除所有权限
        DROP ROLE admin_role;
    END IF;
END $$;

-- 删除旧表（如果存在），注意顺序以避免外键约束问题
DROP TABLE IF EXISTS public.commission_logs, public.investments, public.spot_trades, 
             public.contract_trades, public.transactions, public.withdrawal_addresses, 
             public.admin_requests, public.users CASCADE;


---------------------------
-- 1. 创建核心用户表
---------------------------
CREATE TABLE public.users (
    id UUID PRIMARY KEY, -- 直接关联 auth.users.id
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
    IF LENGTH(p_password) >= 8 THEN
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

CREATE POLICY "Users can view anyone's profile (for finding inviters)" ON public.users
FOR SELECT USING (true);


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
-- 9. 核心业务函数 (包含管理员注册逻辑)
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
    v_is_admin BOOLEAN := false;
    v_is_test_user BOOLEAN := false;
    new_user_id UUID;
    v_email TEXT := p_username || '@noemail.app';
BEGIN
    -- 1. 检查密码复杂度
    PERFORM public.check_password_complexity(p_password);

    -- 2. 检查用户名是否已存在
    IF EXISTS (SELECT 1 FROM public.users WHERE username = p_username) THEN
        RETURN json_build_object(
            'status', 'error', 'message', '用户名已存在'
        );
    END IF;

    -- 3. 处理邀请码
    IF p_invitation_code = 'admin8888' THEN
        v_is_admin := true;
        v_is_test_user := true;
        v_inviter_id := NULL;
    ELSE
        SELECT id INTO v_inviter_id 
        FROM public.users 
        WHERE invitation_code = p_invitation_code;
        
        IF v_inviter_id IS NULL THEN
            RETURN json_build_object(
                'status', 'error', 'message', '无效的邀请码'
            );
        END IF;
    END IF;

    -- 4. 创建认证用户
    new_user_id := auth.uid(); -- Use the id from the authenticated user
    INSERT INTO auth.users (id, email, password, raw_app_meta_data, raw_user_meta_data)
    VALUES (new_user_id, v_email, p_password, jsonb_build_object('username', p_username), jsonb_build_object('username', p_username));

    -- 5. 创建业务用户
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
            'message', '用户名或邮箱已存在'
        );
    WHEN others THEN
        RETURN json_build_object(
            'status', 'error',
            'message', '注册失败: ' || SQLERRM
        );
END;
$$;
COMMENT ON FUNCTION public.register_new_user IS 'Handles new user registration, including admin creation via a special invitation code.';


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
$$;
COMMENT ON FUNCTION public.distribute_commissions IS 'Distributes 3-level commissions (8%, 5%, 2%) and skips frozen accounts.';

---------------------------
-- 10. 交易后自动分配佣金的触发器
---------------------------
CREATE OR REPLACE FUNCTION public.after_contract_trade()
RETURNS TRIGGER AS $$
BEGIN
    -- For now, we distribute commission on every trade.
    -- Logic could be added here to check trade type/status if needed.
    PERFORM public.distribute_commissions(NEW.user_id, NEW.amount);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger to avoid conflicts
DROP TRIGGER IF EXISTS trigger_after_contract_trade ON public.contract_trades;

CREATE TRIGGER trigger_after_contract_trade
AFTER INSERT ON public.contract_trades
FOR EACH ROW
EXECUTE FUNCTION public.after_contract_trade();

---------------------------
-- 11. 管理员工具函数
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
        RAISE EXCEPTION 'Insufficient privilege');
    END IF;
END;
$$;
COMMENT ON FUNCTION public.admin_get_all_users IS 'Admin function to fetch all user profiles.';

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
COMMENT ON FUNCTION public.get_user_downline IS 'Fetches the 3-level downline for a given user.';


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
COMMENT ON FUNCTION public.admin_get_user_team IS 'Admin function to view any user''s team structure.';

---------------------------
-- 12. 账户管理函数
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
        RAISE EXCEPTION 'Insufficient privilege';
    END IF;
    
    UPDATE public.users
    SET is_frozen = p_freeze
    WHERE id = p_user_id;
END;
$$;
COMMENT ON FUNCTION public.admin_freeze_user IS 'Admin function to freeze or unfreeze a user account.';


---------------------------
-- 13. 初始数据
---------------------------
-- The admin user is now created via the registration process with the 'admin8888' code.
-- The test user can be created via the UI by having the admin invite them.

---------------------------
-- 14. 索引优化
---------------------------
CREATE INDEX IF NOT EXISTS idx_users_inviter_id ON public.users(inviter_id);
CREATE INDEX IF NOT EXISTS idx_users_invitation_code ON public.users(invitation_code);
CREATE INDEX IF NOT EXISTS idx_commission_upline ON public.commission_logs(upline_user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_user ON public.transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_contract_trades_user ON public.contract_trades(user_id);
CREATE INDEX IF NOT EXISTS idx_spot_trades_user ON public.spot_trades(user_id);
CREATE INDEX IF NOT EXISTS idx_users_is_frozen ON public.users(is_frozen);

---------------------------
-- 15. 扩展启用确认
---------------------------
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
