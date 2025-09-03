-- 🚀 一次性修复所有 RLS 权限问题
-- 直接在 Supabase SQL Editor 中执行

BEGIN;

-- ================================================================
-- 1. 修复 announcements 表 RLS 策略
-- ================================================================

-- 删除现有策略
DROP POLICY IF EXISTS "Allow read access to non-personal announcements" ON public.announcements;
DROP POLICY IF EXISTS "Users can view their own messages" ON public.announcements;
DROP POLICY IF EXISTS "Users can view public announcements" ON public.announcements;
DROP POLICY IF EXISTS "Admins can manage all announcements" ON public.announcements;

-- 创建新策略
CREATE POLICY "Users can view public announcements" ON public.announcements FOR
SELECT USING (user_id IS NULL);

CREATE POLICY "Users can view their own messages" ON public.announcements FOR
SELECT USING (user_id = auth.uid());

CREATE POLICY "Admins can manage all announcements" ON public.announcements FOR ALL
USING (
    (
        SELECT is_admin
        FROM public.profiles
        WHERE id = auth.uid()
    )
);

-- ================================================================
-- 2. 修复 swap_orders 表 RLS 策略
-- ================================================================

-- 创建 swap_orders 表（如果不存在）
CREATE TABLE IF NOT EXISTS public.swap_orders (
    id bigserial primary key,
    user_id uuid not null references public.profiles(id) on delete cascade,
    taker_id uuid references public.profiles(id) on delete set null,
    from_asset text not null,
    to_asset text not null,
    from_amount numeric(30, 8) not null,
    to_amount numeric(30, 8) not null,
    status text not null default 'pending' check (status in ('pending', 'completed', 'cancelled')),
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 启用 RLS
ALTER TABLE public.swap_orders ENABLE ROW LEVEL SECURITY;

-- 删除现有策略
DROP POLICY IF EXISTS "Users can view their own swap orders" ON public.swap_orders;
DROP POLICY IF EXISTS "Admins can manage all swap orders" ON public.swap_orders;

-- 创建新策略
CREATE POLICY "Users can view their own swap orders" ON public.swap_orders FOR ALL
USING (user_id = auth.uid() OR taker_id = auth.uid());

CREATE POLICY "Admins can manage all swap orders" ON public.swap_orders FOR ALL
USING (
    (
        SELECT is_admin
        FROM public.profiles
        WHERE id = auth.uid()
    )
);

-- ================================================================
-- 3. 修复 get_total_platform_balance 函数
-- ================================================================

DROP FUNCTION IF EXISTS public.get_total_platform_balance();
CREATE OR REPLACE FUNCTION public.get_total_platform_balance() 
RETURNS double precision 
SECURITY DEFINER
AS $$ 
BEGIN 
    RETURN (
        SELECT COALESCE(SUM(available_balance + frozen_balance), 0)
        FROM public.balances
        WHERE asset_type = 'crypto'
    );
END;
$$ LANGUAGE plpgsql;

-- ================================================================
-- 4. 添加缺失的函数
-- ================================================================

-- credit_reward 函数
CREATE OR REPLACE FUNCTION public.credit_reward(
    p_user_id UUID,
    p_amount NUMERIC,
    p_asset TEXT,
    p_reward_type TEXT,
    p_source_id TEXT,
    p_description TEXT
) RETURNS VOID 
SECURITY DEFINER
AS $$
BEGIN
    INSERT INTO public.balances (user_id, asset, available_balance, frozen_balance)
    VALUES (p_user_id, p_asset, p_amount, 0)
    ON CONFLICT (user_id, asset) 
    DO UPDATE SET available_balance = balances.available_balance + p_amount;
    
    INSERT INTO public.reward_logs (
        user_id, amount, asset, type, source_id, description, created_at
    ) VALUES (
        p_user_id, p_amount, p_asset, p_reward_type, p_source_id, p_description, NOW()
    );
END;
$$ LANGUAGE plpgsql;

-- create_daily_investment 函数
CREATE OR REPLACE FUNCTION public.create_daily_investment(
    p_user_id UUID,
    p_product_name TEXT,
    p_amount NUMERIC,
    p_daily_rate NUMERIC,
    p_period INTEGER,
    p_category TEXT,
    p_staking_asset TEXT,
    p_staking_amount NUMERIC
) RETURNS VOID 
SECURITY DEFINER
AS $$
BEGIN
    UPDATE public.balances 
    SET available_balance = available_balance - p_amount
    WHERE user_id = p_user_id AND asset = 'USDT' AND available_balance >= p_amount;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Insufficient balance for investment';
    END IF;
    
    INSERT INTO public.investments (
        user_id, product_name, amount, settlement_date, status, category,
        productType, daily_rate, period, staking_asset, staking_amount
    ) VALUES (
        p_user_id, p_product_name, p_amount, NOW() + INTERVAL '1 day' * p_period,
        'active', p_category, 'daily', p_daily_rate, p_period, p_staking_asset, p_staking_amount
    );
END;
$$ LANGUAGE plpgsql;

-- create_hourly_investment 函数
CREATE OR REPLACE FUNCTION public.create_hourly_investment(
    p_user_id UUID,
    p_product_name TEXT,
    p_amount NUMERIC,
    p_duration_hours INTEGER,
    p_hourly_rate NUMERIC
) RETURNS VOID 
SECURITY DEFINER
AS $$
BEGIN
    UPDATE public.balances 
    SET available_balance = available_balance - p_amount
    WHERE user_id = p_user_id AND asset = 'USDT' AND available_balance >= p_amount;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Insufficient balance for investment';
    END IF;
    
    INSERT INTO public.investments (
        user_id, product_name, amount, settlement_date, status, category,
        productType, hourly_rate, duration_hours
    ) VALUES (
        p_user_id, p_product_name, p_amount, NOW() + INTERVAL '1 hour' * p_duration_hours,
        'active', 'hourly', 'hourly', p_hourly_rate, p_duration_hours
    );
END;
$$ LANGUAGE plpgsql;

-- ================================================================
-- 5. 创建必要的索引
-- ================================================================

-- announcements 表索引
CREATE INDEX IF NOT EXISTS idx_announcements_user_id ON public.announcements(user_id);
CREATE INDEX IF NOT EXISTS idx_announcements_type ON public.announcements(type);
CREATE INDEX IF NOT EXISTS idx_announcements_created_at ON public.announcements(created_at);

-- swap_orders 表索引
CREATE INDEX IF NOT EXISTS idx_swap_orders_user_id ON public.swap_orders(user_id);
CREATE INDEX IF NOT EXISTS idx_swap_orders_taker_id ON public.swap_orders(taker_id);
CREATE INDEX IF NOT EXISTS idx_swap_orders_status ON public.swap_orders(status);
CREATE INDEX IF NOT EXISTS idx_swap_orders_created_at ON public.swap_orders(created_at);

COMMIT;

-- 完成提示
SELECT 
    '🎉 所有 RLS 权限问题已修复！' AS status,
    'announcements 表策略已更新' AS announcements_status,
    'swap_orders 表策略已更新' AS swap_orders_status,
    'get_total_platform_balance 函数已修复' AS balance_function_status,
    '缺失的投资和奖励函数已添加' AS missing_functions_status;