
---------------------------
-- 0. 清理和准备 (终极版)
---------------------------

-- 使用超级用户权限来安全地清理 admin_role
DO $$
BEGIN
    -- 检查 admin_role 是否存在，如果存在才进行清理
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'admin_role') THEN
        -- 临时切换到超级用户
        SET ROLE postgres;

        -- 将 admin_role 的所有权和权限重新分配给 postgres
        REASSIGN OWNED BY admin_role TO postgres;
        DROP OWNED BY admin_role;

        -- 恢复原始角色
        RESET ROLE;

        -- 现在可以安全删除角色了
        DROP ROLE admin_role;
    END IF;
END $$;

-- 先删除依赖于函数和表的触发器和表本身
DROP TABLE IF EXISTS public.commission_logs, public.investments, public.spot_trades, 
                     public.contract_trades, public.transactions, public.withdrawal_addresses, 
                     public.admin_requests, public.users CASCADE;

-- 再删除所有可能存在的、各个版本的函数
DROP FUNCTION IF EXISTS public.generate_invitation_code();
DROP FUNCTION IF EXISTS public.get_user_downline(UUID);
DROP FUNCTION IF EXISTS public.register_new_user(TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS public.register_new_user(TEXT, TEXT, TEXT, TEXT); -- 旧版本
DROP FUNCTION IF EXISTS public.distribute_commissions(UUID, NUMERIC);
DROP FUNCTION IF EXISTS public.admin_get_all_users();
DROP FUNCTION IF EXISTS public.admin_get_user_team(UUID);
DROP FUNCTION IF EXISTS public.check_account_active(UUID);
DROP FUNCTION IF EXISTS public.check_password_complexity(TEXT);
DROP FUNCTION IF EXISTS public.after_contract_trade();
DROP FUNCTION IF EXISTS public.admin_freeze_user(UUID, BOOLEAN); -- 旧版本
DROP FUNCTION IF EXISTS public.admin_freeze_user(UUID, BOOLEAN, TEXT);


---------------------------
-- 1. 扩展启用确认
---------------------------
-- 确保所有必要扩展已启用
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

---------------------------
-- 2. 创建核心用户表
---------------------------
CREATE TABLE public.users (
    id UUID PRIMARY KEY NOT NULL,
    username TEXT NOT NULL UNIQUE, 
    inviter_id UUID REFERENCES public.users(id),
    is_admin BOOLEAN NOT NULL DEFAULT false,
    is_test_user BOOLEAN NOT NULL DEFAULT false,
    is_frozen BOOLEAN NOT NULL DEFAULT false,
    invitation_code TEXT UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
COMMENT ON TABLE public.users IS 'Stores user profile information.';

---------------------------
-- 3. 创建邀请码生成触发器
---------------------------
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
-- 4. 业务逻辑函数
---------------------------
-- 账户状态检查
CREATE OR REPLACE FUNCTION public.check_account_active(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    IF EXISTS (SELECT 1 FROM public.users WHERE id = user_id AND is_frozen) THEN
        RAISE EXCEPTION 'ACCOUNT_FROZEN';
    END IF;
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- 注册新用户
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
    new_user_id UUID;
    v_is_admin BOOLEAN := false;
BEGIN
    -- 检查邀请码
    IF p_invitation_code = 'admin8888' THEN
        v_is_admin := true;
        v_inviter_id := NULL;
    ELSE
        SELECT id INTO v_inviter_id FROM public.users WHERE invitation_code = p_invitation_code;
        IF v_inviter_id IS NULL THEN
            RETURN json_build_object('status', 'error', 'message', '无效的邀请码');
        END IF;
    END IF;

    -- 创建 auth.users 记录
    new_user_id := auth.uid();
    INSERT INTO auth.users(id, email, encrypted_password, raw_app_meta_data)
    VALUES (new_user_id, p_username || '@noemail.app', crypt(p_password, gen_salt('bf')), '{"provider":"email","providers":["email"]}');

    -- 创建 public.users 记录
    INSERT INTO public.users(id, username, inviter_id, is_admin)
    VALUES (new_user_id, p_username, v_inviter_id, v_is_admin);

    RETURN json_build_object('status', 'success', 'user_id', new_user_id, 'message', '用户注册成功');
EXCEPTION
    WHEN unique_violation THEN
        RETURN json_build_object('status', 'error', 'message', '用户名已存在');
END;
$$;

-- 分配佣金
CREATE OR REPLACE FUNCTION public.distribute_commissions(p_source_user_id UUID, p_trade_amount NUMERIC)
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
    PERFORM public.check_account_active(p_source_user_id);

    WHILE level <= 3 LOOP
        SELECT inviter_id INTO current_inviter_id FROM public.users WHERE id = current_user_id;
        EXIT WHEN current_inviter_id IS NULL;
        
        PERFORM public.check_account_active(current_inviter_id);
        
        INSERT INTO public.commission_logs(upline_user_id, source_user_id, source_username, source_level, trade_amount, commission_rate, commission_amount)
        VALUES (current_inviter_id, p_source_user_id, source_username, level, p_trade_amount, commission_rates[level], p_trade_amount * commission_rates[level]);
        
        current_user_id := current_inviter_id;
        level := level + 1;
    END LOOP;
END;
$$;

---------------------------
-- 5. 创建其他表
---------------------------
CREATE TABLE public.transactions (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    asset TEXT NOT NULL,
    amount NUMERIC(20, 8) NOT NULL,
    status TEXT NOT NULL,
    address TEXT,
    transaction_hash TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.contract_trades (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    trading_pair TEXT NOT NULL,
    type TEXT NOT NULL,
    amount NUMERIC(20, 8) NOT NULL,
    entry_price NUMERIC(20, 8) NOT NULL,
    settlement_time TIMESTAMPTZ NOT NULL,
    period INT NOT NULL,
    profit_rate NUMERIC(5, 4) NOT NULL,
    status TEXT NOT NULL,
    settlement_price NUMERIC(20, 8),
    outcome TEXT,
    profit NUMERIC(20, 8),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.spot_trades (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    trading_pair TEXT NOT NULL,
    type TEXT NOT NULL,
    base_asset TEXT NOT NULL,
    quote_asset TEXT NOT NULL,
    amount NUMERIC(20, 8) NOT NULL,
    total NUMERIC(20, 8) NOT NULL,
    status TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

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
-- 6. 交易后自动分配佣金的触发器
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
-- 7. 管理员工具函数
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

---------------------------
-- 8. 初始数据
---------------------------
DO $$
DECLARE
    admin_user_id UUID;
    test_user_id UUID;
BEGIN
    -- 创建 auth.users for admin
    admin_user_id := extensions.uuid_generate_v4();
    INSERT INTO auth.users(id, email, encrypted_password, raw_app_meta_data)
    VALUES (admin_user_id, 'admin@noemail.app', crypt('password', gen_salt('bf')), '{"provider":"email","providers":["email"]}');
    
    -- 创建 public.users for admin
    INSERT INTO public.users(id, username, is_admin, is_test_user, invitation_code)
    VALUES (admin_user_id, 'admin', true, true, 'ADMIN123');

    -- 创建 auth.users for testuser
    test_user_id := extensions.uuid_generate_v4();
    INSERT INTO auth.users(id, email, encrypted_password, raw_app_meta_data)
    VALUES (test_user_id, 'testuser@noemail.app', crypt('password', gen_salt('bf')), '{"provider":"email","providers":["email"]}');

    -- 创建 public.users for testuser
    INSERT INTO public.users (id, username, inviter_id, is_test_user)
    VALUES (test_user_id, 'testuser', admin_user_id, true);
END $$;


---------------------------
-- 9. 索引优化
---------------------------
CREATE INDEX IF NOT EXISTS idx_users_inviter_id ON public.users(inviter_id);
CREATE INDEX IF NOT EXISTS idx_users_invitation_code ON public.users(invitation_code);
CREATE INDEX IF NOT EXISTS idx_commission_upline ON public.commission_logs(upline_user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_user ON public.transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_contract_trades_user ON public.contract_trades(user_id);
CREATE INDEX IF NOT EXISTS idx_spot_trades_user ON public.spot_trades(user_id);

