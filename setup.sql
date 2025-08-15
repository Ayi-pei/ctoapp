
---------------------------
-- 0. 清理和准备 (最终修复版)
---------------------------
-- 安全地清理 admin_role
DO $$
BEGIN
    -- 仅当 admin_role 存在时，才执行清理操作
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'admin_role') THEN
        -- 1. 授权 postgres 管理 admin_role
        GRANT admin_role TO postgres;
        
        -- 2. 转移所有权并删除所有权限依赖
        REASSIGN OWNED BY admin_role TO postgres;
        DROP OWNED BY admin_role;
        
        -- 3. 现在可以安全地删除角色了
        DROP ROLE IF EXISTS admin_role;
    END IF;
END $$;

-- 优先删除表，这会自动级联删除依赖于表的触发器等对象
DROP TABLE IF EXISTS public.commission_logs CASCADE;
DROP TABLE IF EXISTS public.investments CASCADE;
DROP TABLE IF EXISTS public.spot_trades CASCADE;
DROP TABLE IF EXISTS public.contract_trades CASCADE;
DROP TABLE IF EXISTS public.transactions CASCADE;
DROP TABLE IF EXISTS public.withdrawal_addresses CASCADE;
DROP TABLE IF EXISTS public.admin_requests CASCADE;
DROP TABLE IF EXISTS public.users CASCADE;


-- 精确地清理所有已知版本的函数
DROP FUNCTION IF EXISTS public.generate_invitation_code();
DROP FUNCTION IF EXISTS public.get_user_downline(UUID);
DROP FUNCTION IF EXISTS public.register_new_user(TEXT, TEXT, TEXT, TEXT); -- 旧版本
DROP FUNCTION IF EXISTS public.register_new_user(TEXT, TEXT, TEXT); -- 当前版本
DROP FUNCTION IF EXISTS public.distribute_commissions(UUID, NUMERIC);
DROP FUNCTION IF EXISTS public.admin_get_all_users();
DROP FUNCTION IF EXISTS public.admin_get_user_team(UUID);
DROP FUNCTION IF EXISTS public.check_account_active(UUID);
DROP FUNCTION IF EXISTS public.check_password_complexity(TEXT);
DROP FUNCTION IF EXISTS public.admin_freeze_user(UUID, BOOLEAN); -- 旧版本
DROP FUNCTION IF EXISTS public.admin_freeze_user(UUID, BOOLEAN, TEXT); -- 当前版本
DROP FUNCTION IF EXISTS public.after_contract_trade();


---------------------------
-- 1. 创建核心用户表
---------------------------
CREATE TABLE public.users (
    id UUID PRIMARY KEY, -- ID由auth.users提供
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
    IF EXISTS (SELECT 1 FROM public.users WHERE id = user_id AND is_frozen) THEN
        RAISE EXCEPTION 'ACCOUNT_FROZEN';
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
    RAISE EXCEPTION 'PASSWORD_TOO_SHORT';
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
CREATE POLICY "Users can view their own profile" ON public.users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update their own profile" ON public.users FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can view their direct downline" ON public.users FOR SELECT USING (inviter_id = auth.uid());

DO $$
DECLARE
    tables TEXT[] := ARRAY['transactions', 'contract_trades', 'spot_trades', 'investments', 'withdrawal_addresses', 'admin_requests'];
    tbl TEXT;
BEGIN
    FOREACH tbl IN ARRAY tables LOOP
        EXECUTE format('CREATE POLICY "Users can manage their own records" ON public.%I FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id)', tbl);
    END LOOP;
END $$;

CREATE POLICY "Users can view their own commission logs" ON public.commission_logs FOR SELECT USING (auth.uid() = upline_user_id);

---------------------------
-- 9. 管理员权限设置 (安全增强版)
---------------------------
-- 创建一个拥有所有权限的管理员角色
CREATE ROLE admin_role WITH BYPASSRLS NOLOGIN;
GRANT ALL ON ALL TABLES IN SCHEMA public TO admin_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO admin_role;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO admin_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO admin_role;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO admin_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT EXECUTE ON FUNCTIONS TO admin_role;

-- 将 admin_role 授予 Supabase 内置的 service_role，以便 Supabase 的后端服务可以利用这些权限
GRANT admin_role TO service_role;

---------------------------
-- 10. 核心业务函数 (最终版)
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
    new_user_id UUID;
    v_email TEXT := p_username || '@noemail.app';
BEGIN
    PERFORM public.check_password_complexity(p_password);

    IF EXISTS (SELECT 1 FROM public.users WHERE username = p_username) THEN
        RETURN json_build_object('status', 'error', 'message', '用户名已存在');
    END IF;

    IF p_invitation_code = 'admin8888' THEN
        v_is_admin := true;
        v_inviter_id := NULL;
    ELSE
        SELECT id INTO v_inviter_id FROM public.users WHERE invitation_code = p_invitation_code;
        IF v_inviter_id IS NULL THEN
            RETURN json_build_object('status', 'error', 'message', '无效的邀请码');
        END IF;
    END IF;
    
    new_user_id := auth.uid_from_email(v_email);
    IF new_user_id IS NULL THEN
        INSERT INTO auth.users(instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, recovery_token, recovery_sent_at, last_sign_in_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, confirmation_token, confirmation_sent_at)
        VALUES (extensions.uuid_generate_v4(), extensions.uuid_generate_v4(), 'authenticated', 'authenticated', v_email, crypt(p_password, gen_salt('bf')), NOW(), '', '2024-01-01 00:00:00+00', '2024-01-01 00:00:00+00', '{"provider":"email","providers":["email"]}', '{}', NOW(), NOW(), '', '2024-01-01 00:00:00+00')
        RETURNING id INTO new_user_id;
    ELSE
        RETURN json_build_object('status', 'error', 'message', '用户名已存在');
    END IF;

    INSERT INTO public.users(id, username, inviter_id, is_admin)
    VALUES (new_user_id, p_username, v_inviter_id, v_is_admin);

    RETURN json_build_object('status', 'success', 'user_id', new_user_id, 'message', '用户注册成功');
END;
$$;
COMMENT ON FUNCTION public.register_new_user IS 'Handles new user registration, including special admin creation and standard referrals.';

CREATE OR REPLACE FUNCTION public.distribute_commissions(p_source_user_id UUID, p_trade_amount NUMERIC)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    commission_rates NUMERIC[] := ARRAY[0.08, 0.05, 0.02];
    current_user_id UUID := p_source_user_id;
    current_inviter_id UUID;
    source_username_val TEXT;
    level INT := 1;
BEGIN
    SELECT username INTO source_username_val FROM public.users WHERE id = p_source_user_id;
    IF NOT FOUND THEN RETURN; END IF;
    
    PERFORM public.check_account_active(p_source_user_id);

    WHILE level <= 3 LOOP
        SELECT inviter_id INTO current_inviter_id FROM public.users WHERE id = current_user_id;
        EXIT WHEN current_inviter_id IS NULL;
        
        IF public.check_account_active(current_inviter_id) THEN
            INSERT INTO public.commission_logs(upline_user_id, source_user_id, source_username, source_level, trade_amount, commission_rate, commission_amount)
            VALUES (current_inviter_id, p_source_user_id, source_username_val, level, p_trade_amount, commission_rates[level], p_trade_amount * commission_rates[level]);
        END IF;
        
        current_user_id := current_inviter_id;
        level := level + 1;
    END LOOP;
END;
$$;
COMMENT ON FUNCTION public.distribute_commissions IS 'Calculates and distributes three levels of commission, skipping frozen accounts.';

---------------------------
-- 11. 交易后自动分配佣金的触发器
---------------------------
CREATE OR REPLACE FUNCTION public.after_contract_trade()
RETURNS TRIGGER AS $$
BEGIN
    PERFORM public.distribute_commissions(NEW.user_id, NEW.amount);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_after_contract_trade
AFTER INSERT ON public.contract_trades
FOR EACH ROW
EXECUTE FUNCTION public.after_contract_trade();

---------------------------
-- 12. 管理员工具函数
---------------------------
CREATE OR REPLACE FUNCTION public.admin_get_all_users()
RETURNS SETOF public.users
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
    SELECT * FROM public.users ORDER BY created_at DESC;
$$;
COMMENT ON FUNCTION public.admin_get_all_users IS 'Admin function to get all user profiles.';

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
$$ LANGUAGE plpgsql STABLE;
COMMENT ON FUNCTION public.get_user_downline IS 'Gets the three-level downline for a given user.';

CREATE OR REPLACE FUNCTION public.admin_get_user_team(p_user_id UUID)
RETURNS TABLE(id UUID, username TEXT, level INT, created_at TIMESTAMPTZ)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY SELECT * FROM public.get_user_downline(p_user_id);
END;
$$;
COMMENT ON FUNCTION public.admin_get_user_team IS 'Admin function to view any user''s team structure.';

---------------------------
-- 13. 账户管理函数
---------------------------
CREATE OR REPLACE FUNCTION public.admin_freeze_user(p_user_id UUID, p_freeze BOOLEAN, p_reason TEXT DEFAULT '')
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE public.users SET is_frozen = p_freeze WHERE id = p_user_id;
END;
$$;
COMMENT ON FUNCTION public.admin_freeze_user IS 'Admin function to freeze or unfreeze a user account.';

---------------------------
-- 14. 初始数据 (硬编码密码)
---------------------------
DO $$
DECLARE
    admin_user_id UUID;
    test_user_id UUID;
BEGIN
    -- 创建管理员用户
    INSERT INTO auth.users(instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, recovery_token, recovery_sent_at, last_sign_in_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, confirmation_token, confirmation_sent_at)
    VALUES (extensions.uuid_generate_v4(), extensions.uuid_generate_v4(), 'authenticated', 'authenticated', 'admin@noemail.app', crypt('password', gen_salt('bf')), NOW(), '', '2024-01-01 00:00:00+00', '2024-01-01 00:00:00+00', '{"provider":"email","providers":["email"]}', '{"username":"admin"}', NOW(), NOW(), '', '2024-01-01 00:00:00+00')
    RETURNING id INTO admin_user_id;
    
    INSERT INTO public.users(id, username, is_admin, is_test_user, invitation_code)
    VALUES (admin_user_id, 'admin', true, true, 'ADMIN123');

    -- 创建测试用户
    INSERT INTO auth.users(instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, recovery_token, recovery_sent_at, last_sign_in_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, confirmation_token, confirmation_sent_at)
    VALUES (extensions.uuid_generate_v4(), extensions.uuid_generate_v4(), 'authenticated', 'authenticated', 'testuser@noemail.app', crypt('password', gen_salt('bf')), NOW(), '', '2024-01-01 00:00:00+00', '2024-01-01 00:00:00+00', '{"provider":"email","providers":["email"]}', '{"username":"testuser"}', NOW(), NOW(), '', '2024-01-01 00:00:00+00')
    RETURNING id INTO test_user_id;

    INSERT INTO public.users (id, username, inviter_id, is_test_user)
    VALUES (test_user_id, 'testuser', admin_user_id, true);
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
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA extensions;

-- RLS策略需要绑定到角色，为admin用户绑定admin_role
-- 注意：确保此操作在admin用户创建之后执行
DO $$
DECLARE
    admin_user_id UUID;
BEGIN
    SELECT id INTO admin_user_id FROM public.users WHERE username = 'admin';
    IF admin_user_id IS NOT NULL THEN
        -- 将admin_role授予admin用户
        EXECUTE 'GRANT admin_role TO ' || quote_ident(admin_user_id::text);
    END IF;
END $$;
