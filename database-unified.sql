-- ================================================================
-- CoinSR 统一数据库初始化脚本
-- 版本: 1.0.0
-- 日期: 2025-01-11
-- 描述: 完整的数据库架构，整合所有表结构和功能，支持自定义认证
--
-- ❗ 重要警告：
--   此脚本会完全删除所有现有数据库对象！
--   包括：表、视图、函数、索引、数据等
--   请在生产环境中谨慎使用！
--   建议在执行前备份数据库。
--
-- 使用说明：
--   1. 连接到 Supabase 数据库
--   2. 在 SQL 编辑器中执行此脚本
--   3. 等待脚本完成执行
--   4. 检查日志输出确认成功
-- ================================================================

-- ================================================================
-- 清理现有数据库对象
-- ================================================================

-- 删除视图
DROP VIEW IF EXISTS public.v_daily_tasks CASCADE;

-- 删除表（按依赖关系逆序删除）
DROP TABLE IF EXISTS public.user_task_states CASCADE;
DROP TABLE IF EXISTS public.cron_job_logs CASCADE;
DROP TABLE IF EXISTS public.reward_logs CASCADE;
DROP TABLE IF EXISTS public.swap_orders CASCADE;
DROP TABLE IF EXISTS public.announcements CASCADE;
DROP TABLE IF EXISTS public.requests CASCADE;
DROP TABLE IF EXISTS public.action_logs CASCADE;
DROP TABLE IF EXISTS public.commission_logs CASCADE;
DROP TABLE IF EXISTS public.commission_rates CASCADE;
DROP TABLE IF EXISTS public.daily_check_ins CASCADE;
DROP TABLE IF EXISTS public.market_predictions CASCADE;
DROP TABLE IF EXISTS public.user_rewards CASCADE;
DROP TABLE IF EXISTS public.daily_tasks CASCADE;
DROP TABLE IF EXISTS public.activities CASCADE;
DROP TABLE IF EXISTS public.options_contracts CASCADE;
DROP TABLE IF EXISTS public.market_interventions CASCADE;
DROP TABLE IF EXISTS public.market_kline_raw CASCADE;
DROP TABLE IF EXISTS public.market_kline_data CASCADE;
DROP TABLE IF EXISTS public.market_summary_data CASCADE;
DROP TABLE IF EXISTS public.investments CASCADE;
DROP TABLE IF EXISTS public.investment_settings CASCADE;
DROP TABLE IF EXISTS public.investment_products CASCADE;
DROP TABLE IF EXISTS public.spot_trades CASCADE;
DROP TABLE IF EXISTS public.contract_trades CASCADE;
DROP TABLE IF EXISTS public.transactions CASCADE;
DROP TABLE IF EXISTS public.withdrawal_addresses CASCADE;
DROP TABLE IF EXISTS public.balances CASCADE;
DROP TABLE IF EXISTS public.supported_assets CASCADE;
DROP TABLE IF EXISTS public.system_settings CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;

-- 删除函数
DROP FUNCTION IF EXISTS public.generate_invitation_code() CASCADE;
DROP FUNCTION IF EXISTS public.is_admin(UUID) CASCADE;
DROP FUNCTION IF EXISTS public.create_initial_balances(UUID) CASCADE;

-- 删除枚举类型（在DO块中安全删除）
DO $$ BEGIN
    DROP TYPE IF EXISTS public.task_trigger_type CASCADE;
    DROP TYPE IF EXISTS public.reward_type CASCADE;
EXCEPTION
    WHEN OTHERS THEN
        -- 忽略删除错误，继续执行
        NULL;
END $$;

-- 删除RLS策略（如果存在）
-- 注意：策略会在表删除时自动删除

-- 🧹 现有数据库对象已清理完成

-- ================================================================
-- 启用必要的扩展
-- ================================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS "pg_cron" WITH SCHEMA extensions;

-- 🔧 数据库扩展已启用
-- ================================================================
-- 枚举类型定义
-- ================================================================
-- 创建奖励类型枚举
DO $$ 
BEGIN 
    IF NOT EXISTS (
        SELECT 1
        FROM pg_type
        WHERE typname = 'reward_type'
    ) THEN 
        CREATE TYPE public.reward_type AS ENUM (
            'initial_investment_experience',
            'market_prediction_success',
            'snowball_tier_1',
            'snowball_tier_2',
            'snowball_tier_3',
            'daily_check_in',
            'commission'
        );
    END IF;
END $$;

-- 创建任务触发器类型枚举
DO $$ 
BEGIN 
    IF NOT EXISTS (
        SELECT 1
        FROM pg_type
        WHERE typname = 'task_trigger_type'
    ) THEN 
        CREATE TYPE public.task_trigger_type AS ENUM (
            'daily_check_in',
            'market_prediction',
            'investment_create',
            'trade_complete'
        );
    END IF;
END $$;
-- ================================================================
-- 管理员初始化（使用自定义认证）
-- ================================================================
DO $$
DECLARE admin_id UUID;
admin_username TEXT := COALESCE(current_setting('app.admin_name', true), 'admin');
admin_invitation_code TEXT := COALESCE(
    current_setting('app.admin_auth', true),
    'ADMIN8888'
);
admin_password_hash TEXT;
BEGIN -- 生成管理员密码哈希（默认密码：admin123）
admin_password_hash := crypt(
    COALESCE(
        current_setting('app.admin_key', true),
        'admin123'
    ),
    gen_salt('bf')
);
-- 创建管理员用户
admin_id := gen_random_uuid();
INSERT INTO public.profiles (
        id,
        username,
        nickname,
        email,
        password_hash,
        is_admin,
        is_test_user,
        invitation_code,
        created_at
    )
VALUES (
        admin_id,
        admin_username,
        'Administrator',
        admin_username || '@coinsr.app',
        admin_password_hash,
        true,
        false,
        admin_invitation_code,
        NOW()
    );
RAISE NOTICE '创建管理员: % (邀请码: %)',
admin_username,
admin_invitation_code;
END $$;

-- ✅ 管理员初始化完成
-- ================================================================
-- 核心用户表 (profiles) - 使用自定义认证
-- ================================================================
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username TEXT UNIQUE NOT NULL,
    nickname TEXT,
    email TEXT UNIQUE,
    password_hash TEXT,
    -- 自定义认证密码哈希
    inviter_id UUID REFERENCES public.profiles(id),
    is_admin BOOLEAN DEFAULT FALSE,
    is_test_user BOOLEAN DEFAULT TRUE,
    is_frozen BOOLEAN DEFAULT FALSE,
    invitation_code TEXT UNIQUE,
    credit_score INTEGER DEFAULT 100,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    last_login_at TIMESTAMPTZ,
    avatar_url TEXT,
    last_check_in_date DATE,
    consecutive_check_ins INTEGER DEFAULT 0
);
COMMENT ON TABLE public.profiles IS '用户资料表，支持自定义认证和邀请机制';

-- ✅ 用户表已创建
-- ================================================================
-- 资产和余额管理
-- ================================================================
-- 支持的资产表
CREATE TABLE public.supported_assets (
    asset TEXT PRIMARY KEY,
    asset_type TEXT DEFAULT 'crypto',
    is_active BOOLEAN DEFAULT TRUE
);

-- 用户余额表
CREATE TABLE public.balances (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    asset TEXT NOT NULL,
    asset_type TEXT DEFAULT 'crypto',
    available_balance NUMERIC(30, 8) DEFAULT 0,
    frozen_balance NUMERIC(30, 8) DEFAULT 0,
    UNIQUE(user_id, asset)
);

-- ✅ 资产管理表已创建
-- ================================================================
-- 交易相关表
-- ================================================================
-- 交易记录表
CREATE TABLE public.transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (
        type IN (
            'deposit',
            'withdrawal',
            'adjustment',
            'buy',
            'sell'
        )
    ),
    symbol TEXT,
    asset TEXT NOT NULL,
    amount NUMERIC(30, 8) NOT NULL,
    amount_usd NUMERIC(30, 8),
    status TEXT NOT NULL CHECK (
        status IN ('pending', 'approved', 'rejected', 'completed')
    ),
    address TEXT,
    transaction_hash TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 合约交易表
CREATE TABLE public.contract_trades (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    trading_pair TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('call', 'put')),
    amount NUMERIC(30, 8) NOT NULL,
    entry_price NUMERIC(30, 8) NOT NULL,
    settlement_time TIMESTAMPTZ NOT NULL,
    period INTEGER NOT NULL,
    profit_rate NUMERIC(5, 4) NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('active', 'settled')) DEFAULT 'active',
    settlement_price NUMERIC(30, 8),
    outcome TEXT CHECK (outcome IN ('win', 'loss')),
    profit NUMERIC(30, 8),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 现货交易表
CREATE TABLE public.spot_trades (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    trading_pair TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('buy', 'sell')),
    base_asset TEXT NOT NULL,
    quote_asset TEXT NOT NULL,
    amount NUMERIC(30, 8) NOT NULL,
    total NUMERIC(30, 8) NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('filled', 'cancelled')) DEFAULT 'filled',
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- ✅ 交易相关表已创建
-- ================================================================
-- 投资理财系统
-- ================================================================
-- 投资产品表
CREATE TABLE public.investment_products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    period INTEGER NOT NULL,
    profit_rate NUMERIC(10, 5) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 投资设置表
CREATE TABLE public.investment_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    min_investment_amount NUMERIC(15, 2) NOT NULL,
    max_investment_amount NUMERIC(15, 2) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 投资记录表
CREATE TABLE public.investments (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    product_id UUID REFERENCES public.investment_products(id),
    product_name TEXT NOT NULL,
    amount NUMERIC(30, 8) NOT NULL,
    settlement_date TIMESTAMPTZ NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('active', 'completed', 'cancelled')) DEFAULT 'active',
    profit NUMERIC(30, 8),
    category TEXT,
    period INTEGER,
    daily_rate NUMERIC(10, 5),
    hourly_rate NUMERIC(10, 5),
    duration_hours INTEGER,
    producttype TEXT,
    staking_asset TEXT,
    staking_amount NUMERIC(30, 8),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    end_date TIMESTAMPTZ,
    interest_rate NUMERIC(10, 5)
);

-- ✅ 投资理财系统表已创建
-- ================================================================
-- 市场数据系统
-- ================================================================

-- 市场摘要数据表
CREATE TABLE public.market_summary_data (
    pair TEXT PRIMARY KEY,
    price NUMERIC(30, 8) NOT NULL,
    change NUMERIC(10, 4),
    high NUMERIC(30, 8),
    low NUMERIC(30, 8),
    volume NUMERIC(30, 8),
    source TEXT,
    updated_at TIMESTAMPTZ
);

-- K线数据表
CREATE TABLE public.market_kline_data (
    id BIGSERIAL PRIMARY KEY,
    trading_pair TEXT NOT NULL,
    time BIGINT NOT NULL,
    open NUMERIC(30, 8),
    high NUMERIC(30, 8),
    low NUMERIC(30, 8),
    close NUMERIC(30, 8),
    volume NUMERIC(30, 8),
    is_intervened BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- K线原始数据表
CREATE TABLE public.market_kline_raw (
    id BIGSERIAL PRIMARY KEY,
    trading_pair TEXT NOT NULL,
    time BIGINT NOT NULL,
    open NUMERIC(30, 8),
    high NUMERIC(30, 8),
    low NUMERIC(30, 8),
    close NUMERIC(30, 8),
    volume NUMERIC(30, 8),
    source TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 市场干预规则表
CREATE TABLE public.market_interventions (
    id BIGSERIAL PRIMARY KEY,
    trading_pair TEXT NOT NULL,
    rule JSONB NOT NULL,
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    priority INTEGER DEFAULT 1,
    created_by UUID REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ✅ 市场数据系统表已创建

-- ================================================================
-- 期权交易系统
-- ================================================================

CREATE TABLE public.options_contracts (
    contract_id TEXT PRIMARY KEY,
    underlying_symbol TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('call', 'put')),
    strike_price NUMERIC(30, 8) NOT NULL,
    expiration_date TIMESTAMPTZ NOT NULL,
    last_price NUMERIC(30, 8),
    bid NUMERIC(30, 8),
    ask NUMERIC(30, 8),
    volume NUMERIC(30, 8),
    open_interest NUMERIC(30, 8),
    implied_volatility NUMERIC(10, 4),
    delta NUMERIC(10, 4),
    gamma NUMERIC(10, 4),
    theta NUMERIC(10, 4),
    vega NUMERIC(10, 4),
    rho NUMERIC(10, 4),
    change NUMERIC(30, 8),
    change_percent NUMERIC(10, 4),
    in_the_money BOOLEAN,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ✅ 期权交易系统表已创建

-- ================================================================
-- 任务和奖励系统
-- ================================================================

-- 用户奖励记录表
CREATE TABLE public.user_rewards (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    reward_type public.reward_type NOT NULL,
    amount_awarded NUMERIC(15, 2) NOT NULL,
    details JSONB,
    claimed_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    UNIQUE (user_id, reward_type)
);

-- 市场预测表
CREATE TABLE public.market_predictions (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    symbol TEXT NOT NULL,
    prediction TEXT NOT NULL CHECK (prediction IN ('up', 'down')),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'expired')),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '24 hours' NOT NULL
);

-- 每日签到表
CREATE TABLE public.daily_check_ins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    checked_in_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    streak_day INTEGER NOT NULL CHECK (streak_day > 0),
    reward_awarded NUMERIC(10, 4) NOT NULL
);

-- 每日任务表
CREATE TABLE public.daily_tasks (
    id BIGSERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    reward NUMERIC(10, 2),
    reward_type TEXT,
    link TEXT,
    imgSrc TEXT,
    img_src TEXT,
    imgsrc TEXT,
    status TEXT DEFAULT 'published',
    trigger public.task_trigger_type
);

-- 活动表
CREATE TABLE public.activities (
    id BIGSERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    rewardrule TEXT,
    status TEXT,
    expiresat TIMESTAMPTZ,
    expiresAt TIMESTAMPTZ,
    howtoclaim TEXT,
    howToClaim TEXT,
    imgsrc TEXT,
    imgSrc TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    createdAt TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- ✅ 任务和奖励系统表已创建

-- ================================================================
-- 佣金和推荐系统
-- ================================================================

-- 佣金费率表
CREATE TABLE public.commission_rates (
    level INTEGER PRIMARY KEY,
    rate NUMERIC(5, 4) NOT NULL
);

-- 佣金记录表
CREATE TABLE public.commission_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    upline_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    source_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    source_username TEXT NOT NULL,
    source_level INTEGER NOT NULL,
    trade_amount NUMERIC(30, 8) NOT NULL,
    commission_rate NUMERIC(5, 4) NOT NULL,
    commission_amount NUMERIC(30, 8) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- ✅ 佣金和推荐系统表已创建

-- ================================================================
-- 系统管理
-- ================================================================

-- 操作日志表
CREATE TABLE public.action_logs (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id),
    action_type TEXT NOT NULL,
    details JSONB,
    operator_id UUID REFERENCES public.profiles(id),
    operator_username TEXT,
    entity_type TEXT,
    entity_id TEXT,
    action TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 用户请求表
CREATE TABLE public.requests (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    asset TEXT,
    amount NUMERIC(30, 8),
    address TEXT,
    transaction_hash TEXT,
    new_password TEXT,
    status TEXT NOT NULL DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 系统公告表
CREATE TABLE public.announcements (
    id BIGSERIAL PRIMARY KEY,
    type TEXT NOT NULL,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    title TEXT,
    content JSONB,
    theme TEXT,
    priority INTEGER DEFAULT 1,
    is_read BOOLEAN DEFAULT FALSE,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 系统设置表
CREATE TABLE public.system_settings (
    id INTEGER PRIMARY KEY DEFAULT 1,
    settings JSONB,
    CONSTRAINT single_row_check CHECK (id = 1)
);

-- 交换订单表
CREATE TABLE public.swap_orders (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    taker_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    from_asset TEXT NOT NULL,
    to_asset TEXT NOT NULL,
    from_amount NUMERIC(30, 8) NOT NULL,
    to_amount NUMERIC(30, 8) NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'cancelled')),
    username TEXT,
    taker_username TEXT,
    payment_proof_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 奖励日志表
CREATE TABLE public.reward_logs (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    asset TEXT NOT NULL,
    amount NUMERIC(30, 8) NOT NULL,
    source_id TEXT,
    source_level INTEGER,
    source_username TEXT,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 定时任务日志表
CREATE TABLE public.cron_job_logs (
    id BIGSERIAL PRIMARY KEY,
    job_name TEXT NOT NULL,
    run_status TEXT NOT NULL,
    start_time TIMESTAMPTZ,
    end_time TIMESTAMPTZ,
    details TEXT
);

-- 任务状态表
CREATE TABLE public.user_task_states (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    task_id BIGINT NOT NULL REFERENCES public.daily_tasks(id) ON DELETE CASCADE,
    completed BOOLEAN DEFAULT FALSE,
    progress INTEGER DEFAULT 0,
    date DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    UNIQUE (user_id, task_id, date)
);

-- 提现地址表
CREATE TABLE public.withdrawal_addresses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    address TEXT NOT NULL,
    network TEXT NOT NULL DEFAULT 'USDT-TRC20',
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    UNIQUE(user_id, address)
);

-- ✅ 系统管理相关表已创建

-- ================================================================
-- 视图定义
-- ================================================================

-- 统一任务视图
CREATE OR REPLACE VIEW public.v_daily_tasks AS
SELECT
    id::text,
    title,
    description,
    reward,
    reward_type,
    link,
    COALESCE(imgSrc, img_src, imgsrc) as imgSrc,
    status,
    trigger::text,
    NULL::timestamptz AS created_at
FROM public.daily_tasks
WHERE status = 'published'
UNION ALL
SELECT
    id::text,
    'Daily Check-in' AS title,
    'Check in daily to earn rewards.' AS description,
    reward_awarded AS reward,
    'daily_check_in' AS reward_type,
    '/tasks' AS link,
    '/images/check-in.png' AS imgSrc,
    'published' AS status,
    'daily_check_in' AS trigger,
    checked_in_at AS created_at
FROM public.daily_check_ins
UNION ALL
SELECT
    id::text,
    'Market Prediction' AS title,
    'Predict the market to earn rewards.' AS description,
    3.00 AS reward,
    'market_prediction_success' AS reward_type,
    '/market' AS link,
    '/images/prediction.png' AS imgSrc,
    status,
    'market_prediction' AS trigger,
    created_at
FROM public.market_predictions;

-- ================================================================
-- 索引优化
-- ================================================================

-- 用户相关索引
CREATE INDEX idx_profiles_username ON public.profiles(username);
CREATE INDEX idx_profiles_invitation_code ON public.profiles(invitation_code);
CREATE INDEX idx_profiles_inviter_id ON public.profiles(inviter_id);
CREATE INDEX idx_profiles_is_admin ON public.profiles(is_admin);
CREATE INDEX idx_profiles_password_hash ON public.profiles(password_hash);

-- 余额相关索引
CREATE INDEX idx_balances_user_asset ON public.balances(user_id, asset);

-- 交易相关索引
CREATE INDEX idx_transactions_user_id ON public.transactions(user_id);
CREATE INDEX idx_transactions_type ON public.transactions(type);
CREATE INDEX idx_contract_trades_user_id ON public.contract_trades(user_id);
CREATE INDEX idx_spot_trades_user_id ON public.spot_trades(user_id);

-- 投资相关索引
CREATE INDEX idx_investments_user_id ON public.investments(user_id);
CREATE INDEX idx_investments_status ON public.investments(status);

-- 市场数据索引
CREATE INDEX idx_market_kline_pair_time ON public.market_kline_data(trading_pair, time);
CREATE INDEX idx_market_summary_pair ON public.market_summary_data(pair);

-- 佣金索引
CREATE INDEX idx_commission_logs_upline ON public.commission_logs(upline_user_id);
CREATE INDEX idx_commission_logs_source ON public.commission_logs(source_user_id);

-- 奖励索引
CREATE INDEX idx_user_rewards_user_type ON public.user_rewards(user_id, reward_type);
CREATE INDEX idx_reward_logs_user_id ON public.reward_logs(user_id);

-- 日志索引
CREATE INDEX idx_action_logs_user_id ON public.action_logs(user_id);
CREATE INDEX idx_action_logs_created_at ON public.action_logs(created_at);

-- 任务相关索引
CREATE INDEX idx_daily_check_ins_user_date ON public.daily_check_ins(user_id, checked_in_at);
CREATE INDEX idx_market_predictions_user_status ON public.market_predictions(user_id, status);
CREATE UNIQUE INDEX market_predictions_user_id_pending_status_idx
ON public.market_predictions(user_id) WHERE (status = 'pending');

-- ✅ 数据库索引已创建

-- ================================================================
-- 核心业务函数
-- ================================================================

-- 生成邀请码函数
CREATE OR REPLACE FUNCTION public.generate_invitation_code()
RETURNS TEXT AS $$
BEGIN
    RETURN upper(substr(md5(random()::text || clock_timestamp()::text), 1, 8));
END;
$$ LANGUAGE plpgsql;

-- 检查管理员权限函数
CREATE OR REPLACE FUNCTION public.is_admin(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = user_id AND is_admin = true
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 创建初始余额函数
CREATE OR REPLACE FUNCTION public.create_initial_balances(p_user_id UUID)
RETURNS VOID AS $$
DECLARE 
    v_asset_record RECORD;
BEGIN
    -- 为新用户创建所有支持资产的初始余额
    FOR v_asset_record IN 
        SELECT asset FROM public.supported_assets WHERE is_active = true
    LOOP
        INSERT INTO public.balances (user_id, asset, available_balance, frozen_balance)
        VALUES (p_user_id, v_asset_record.asset, 0, 0);
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ================================================================
-- 初始数据种子
-- ================================================================

-- 插入支持的资产
INSERT INTO public.supported_assets (asset, asset_type, is_active) VALUES
('USDT', 'crypto', true),
('BTC', 'crypto', true),
('ETH', 'crypto', true),
('SOL', 'crypto', true),
('XRP', 'crypto', true),
('LTC', 'crypto', true),
('BNB', 'crypto', true),
('MATIC', 'crypto', true),
('DOGE', 'crypto', true),
('ADA', 'crypto', true);

-- 插入佣金费率
INSERT INTO public.commission_rates (level, rate) VALUES
(1, 0.08),
(2, 0.05),
(3, 0.02);

-- 插入系统设置
INSERT INTO public.system_settings (id, settings) VALUES (
    1,
    '{
        "trade_fee": 0.001,
        "kline_refresh_interval_sec": 60,
        "check_in_reward_base": 0.5,
        "market_intervention_enabled": true,
        "realtime_enabled": true
    }'
);

-- 插入投资设置
INSERT INTO public.investment_settings (min_investment_amount, max_investment_amount, is_active) VALUES
(100.00, 50000.00, true);

-- 插入投资产品
INSERT INTO public.investment_products (name, description, period, profit_rate, is_active) VALUES
('7日新手体验', '新手专享，超高年化回报', 7, 0.08500, true),
('30天稳健理财', '风险低，收益稳定', 30, 0.05500, true),
('90天进取计划', '更高收益，把握市场机遇', 90, 0.07200, true);

-- 插入每日任务
INSERT INTO public.daily_tasks (title, description, reward, reward_type, link, imgSrc, status, trigger) VALUES
('每日签到', '每天签到获得奖励', 0.5, 'daily_check_in', '/tasks', '/images/check-in.png', 'published', 'daily_check_in'),
('市场预测', '预测市场走向获得奖励', 3.0, 'market_prediction_success', '/market', '/images/prediction.png', 'published', 'market_prediction'),
('首次投资', '完成首次投资获得体验奖励', 1.0, 'initial_investment_experience', '/finance', '/images/investment.png', 'published', 'investment_create');

-- ✅ 初始数据种子已插入

SELECT '🎉 CoinSR 统一数据库初始化完成！' AS status,
       '✅ 所有表结构已创建' AS tables_status,
       '✅ 索引和函数已优化' AS optimization_status,
       '✅ 初始数据已插入' AS data_status,
       '✅ 自定义认证系统已配置' AS auth_status;