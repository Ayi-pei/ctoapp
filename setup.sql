
---------------------------
-- 0. 清理和准备 (健壮版)
---------------------------
-- 使用 DO block 来安全地执行清理操作
DO $$
BEGIN
    -- 如果 admin_role 存在，先移除其所有权和权限
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'admin_role') THEN
        -- 将 admin_role 拥有的所有对象的所有权重新分配给 postgres 用户
        REASSIGN OWNED BY admin_role TO postgres;
        -- 删除授予 admin_role 的所有权限以及它拥有的所有对象
        DROP OWNED BY admin_role;
    END IF;

    -- 现在可以安全地删除角色了
    DROP ROLE IF EXISTS admin_role;
END $$;

-- 级联删除表，这将一并移除依赖于这些表的触发器等对象
DROP TABLE IF EXISTS public.commission_logs, public.investments, public.spot_trades, 
             public.contract_trades, public.transactions, public.withdrawal_addresses, 
             public.admin_requests, public.users CASCADE;

-- 为所有函数指定参数，确保可以精确删除
DROP FUNCTION IF EXISTS public.generate_invitation_code();
DROP FUNCTION IF EXISTS public.get_user_downline(UUID);
DROP FUNCTION IF EXISTS public.register_new_user(TEXT, TEXT, TEXT);
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
    id UUID PRIMARY KEY, -- 直接使用 auth.users.id
    username TEXT NOT NULL UNIQUE,
    inviter_id UUID REFERENCES public.users(id),
    is_admin BOOLEAN NOT NULL DEFAULT false,
    is_test_user BOOLEAN NOT NULL DEFAULT false,
    is_frozen BOOLEAN NOT NULL DEFAULT false,
    invitation_code TEXT UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
COMMENT ON TABLE public.users IS 'Stores user profile information.';

-- 邀请码生成函数
CREATE OR REPLACE FUNCTION public.generate_invitation_code()
RETURNS TRIGGER AS $$
BEGIN
    NEW.invitation_code := upper(substr(md5(random()::text || clock_timestamp()::text), 1, 8));
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 为新用户自动生成邀请码的触发器
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
        RAISE EXCEPTION 'ACCOUNT_FROZEN' USING 
            MESSAGE = 'Account is frozen',
            DETAIL = 'This account has been frozen by an admin.',
            HINT = 'Contact support for assistance.';
    END IF;
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

---------------------------
-- 3. 密码复杂度检查函数
---------------------------
CREATE OR REPLACE FUNCTION public.check_password_complexity(p_password TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    IF LENGTH(p_password) >= 8 THEN
        RETURN TRUE;
    END IF;
    RAISE EXCEPTION 'PASSWORD_TOO_SHORT' USING 
        MESSAGE = 'Password must be at least 8 characters long.';
END;
$$ LANGUAGE plpgsql;

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

CREATE TABLE public.investments (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    product_name TEXT NOT NULL,
    amount NUMERIC(20, 8) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

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

CREATE TABLE public.admin_requests (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    type TEXT NOT NULL DEFAULT 'password_reset',
    new_password TEXT,
    status TEXT NOT NULL DEFAULT 'pending',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

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
CREATE POLICY "Allow public read access" ON public.users FOR SELECT USING (true);
CREATE POLICY "Users can update their own profile" ON public.users FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Admin full access on users" ON public.users FOR ALL USING (
    (SELECT is_admin FROM public.users WHERE id = auth.uid()) = true
);

DO $$
DECLARE
    tables TEXT[] := ARRAY['transactions', 'contract_trades', 'spot_trades', 'investments', 'withdrawal_addresses', 'admin_requests'];
    tbl TEXT;
BEGIN
    FOREACH tbl IN ARRAY tables
    LOOP
        EXECUTE format('CREATE POLICY "Users can manage their own records" ON public.%I FOR ALL USING (auth.uid() = user_id)', tbl);
        EXECUTE format('CREATE POLICY "Admin full access" ON public.%I FOR ALL USING ((SELECT is_admin FROM public.users WHERE id = auth.uid()) = true)', tbl);
    END LOOP;
END $$;

CREATE POLICY "Users can view their own commission logs" ON public.commission_logs FOR SELECT USING (auth.uid() = upline_user_id);
CREATE POLICY "Admin full access on commission logs" ON public.commission_logs FOR ALL USING (
    (SELECT is_admin FROM public.users WHERE id = auth.uid()) = true
);

---------------------------
-- 9. 管理员权限设置
---------------------------
CREATE ROLE admin_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO admin_role;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO admin_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO admin_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO admin_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO admin_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO admin_role;

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
    v_is_admin BOOLEAN := false;
    new_user_id UUID;
    v_virtual_email TEXT := p_username || '@noemail.app';
BEGIN
    PERFORM public.check_password_complexity(p_password);

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

    -- Create auth user
    new_user_id := auth.uid();
     INSERT INTO auth.users (id, email, encrypted_password, aud, role, raw_user_meta_data)
     VALUES (new_user_id, v_virtual_email, crypt(p_password, gen_salt('bf')), 'authenticated', 'authenticated', jsonb_build_object('username', p_username));


    -- Create business user
    INSERT INTO public.users(id, username, inviter_id, is_admin, is_test_user)
    VALUES (new_user_id, p_username, v_inviter_id, v_is_admin, v_is_admin);

    RETURN json_build_object('status', 'success', 'user_id', new_user_id);
EXCEPTION
    WHEN unique_violation THEN
        RETURN json_build_object('status', 'error', 'message', '用户名已存在');
    WHEN others THEN
        RETURN json_build_object('status', 'error', 'message', '注册失败: ' || SQLERRM);
END;
$$;

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
BEGIN
    SELECT username INTO source_username FROM public.users WHERE id = p_source_user_id;
    
    WHILE level <= 3 LOOP
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

---------------------------
-- 11. 交易后自动分配佣金的触发器
---------------------------
CREATE OR REPLACE FUNCTION public.after_contract_trade()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'settled' THEN
        PERFORM public.distribute_commissions(NEW.user_id, NEW.amount);
    END IF;
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
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    IF (SELECT is_admin FROM public.users WHERE id = auth.uid()) THEN
        RETURN QUERY SELECT * FROM public.users ORDER BY created_at DESC;
    ELSE
        RAISE EXCEPTION '权限不足';
    END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_user_downline(p_user_id UUID)
RETURNS TABLE(id UUID, username TEXT, level INT, created_at TIMESTAMPTZ) AS $$
BEGIN
    RETURN QUERY
    WITH RECURSIVE downline_cte AS (
        SELECT u.id, u.username, u.created_at, 1 AS level FROM public.users u WHERE u.inviter_id = p_user_id
        UNION ALL
        SELECT u.id, u.username, u.created_at, d.level + 1 FROM public.users u JOIN downline_cte d ON u.inviter_id = d.id WHERE d.level < 3
    )
    SELECT d.id, d.username, d.level, d.created_at FROM downline_cte;
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
        RAISE EXCEPTION '权限不足';
    END IF;
END;
$$;

---------------------------
-- 13. 账户管理函数
---------------------------
CREATE OR REPLACE FUNCTION public.admin_freeze_user(p_user_id UUID, p_freeze BOOLEAN, p_reason TEXT DEFAULT '')
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    IF NOT (SELECT is_admin FROM public.users WHERE id = auth.uid()) THEN
        RAISE EXCEPTION '权限不足';
    END IF;
    
    UPDATE public.users SET is_frozen = p_freeze WHERE id = p_user_id;
END;
$$;

---------------------------
-- 14. 初始数据
---------------------------
-- 此处留空，推荐使用 Supabase Dashboard 或环境变量安全地创建初始管理员

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
