-- 完整的数据库迁移文件
-- 创建时间: 2025-01-03
-- 描述: 合并所有必要的数据库修复，包括 RLS 策略兼容性、缺失函数和 API 模式补丁

BEGIN;

-- ================================================================
-- 1. API 模式 RLS 补丁 - 移除公开访问策略
-- ================================================================

-- 移除对 profiles 的公开读取策略，防止匿名用户读取用户资料
DROP POLICY IF EXISTS "Allow public read access to profiles" ON public.profiles;

-- ================================================================
-- 2. 创建自定义认证辅助函数
-- ================================================================

-- 创建获取当前用户 ID 的函数（从会话中获取）
CREATE OR REPLACE FUNCTION public.get_current_user_id()
RETURNS UUID AS $$
DECLARE
    current_user_id UUID;
BEGIN
    -- 从当前会话设置中获取用户 ID
    SELECT current_setting('app.current_user_id', true)::UUID INTO current_user_id;
    RETURN current_user_id;
EXCEPTION
    WHEN OTHERS THEN
        RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 创建检查用户是否为管理员的函数
CREATE OR REPLACE FUNCTION public.is_current_user_admin()
RETURNS BOOLEAN AS $$
DECLARE
    user_id UUID;
    is_admin BOOLEAN := FALSE;
BEGIN
    user_id := public.get_current_user_id();
    IF user_id IS NULL THEN
        RETURN FALSE;
    END IF;
    
    SELECT p.is_admin INTO is_admin
    FROM public.profiles p
    WHERE p.id = user_id;
    
    RETURN COALESCE(is_admin, FALSE);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 创建设置当前用户的函数（供应用层调用）
CREATE OR REPLACE FUNCTION public.set_current_user(p_user_id UUID)
RETURNS VOID AS $$
BEGIN
    PERFORM set_config('app.current_user_id', p_user_id::TEXT, true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ================================================================
-- 3. 更新 profiles 表的 RLS 策略
-- ================================================================

-- 删除旧的策略
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can do anything to profiles" ON public.profiles;

-- 创建新的兼容策略
CREATE POLICY "Users can view their own profile" ON public.profiles FOR
SELECT USING (id = public.get_current_user_id());

CREATE POLICY "Users can update their own profile" ON public.profiles FOR
UPDATE USING (id = public.get_current_user_id());

CREATE POLICY "Admins can manage all profiles" ON public.profiles FOR ALL
USING (public.is_current_user_admin());

-- ================================================================
-- 4. 更新 balances 表的 RLS 策略
-- ================================================================

DROP POLICY IF EXISTS "Users can view their own balances" ON public.balances;
DROP POLICY IF EXISTS "Admins can view all balances" ON public.balances;

CREATE POLICY "Users can view their own balances" ON public.balances FOR
SELECT USING (user_id = public.get_current_user_id());

CREATE POLICY "Admins can manage all balances" ON public.balances FOR ALL
USING (public.is_current_user_admin());

-- ================================================================
-- 5. 更新 trades 表的 RLS 策略
-- ================================================================

DROP POLICY IF EXISTS "Users can view their own trades" ON public.trades;

CREATE POLICY "Users can view their own trades" ON public.trades FOR
SELECT USING (user_id = public.get_current_user_id());

CREATE POLICY "Admins can manage all trades" ON public.trades FOR ALL
USING (public.is_current_user_admin());

-- ================================================================
-- 6. 更新 investments 表的 RLS 策略
-- ================================================================

DROP POLICY IF EXISTS "Users can view their own investments" ON public.investments;

CREATE POLICY "Users can view their own investments" ON public.investments FOR
SELECT USING (user_id = public.get_current_user_id());

CREATE POLICY "Users can manage their own investments" ON public.investments FOR ALL
USING (user_id = public.get_current_user_id());

CREATE POLICY "Admins can manage all investments" ON public.investments FOR ALL
USING (public.is_current_user_admin());

-- ================================================================
-- 7. 更新 reward_logs 表的 RLS 策略
-- ================================================================

DROP POLICY IF EXISTS "Users can view their own reward logs" ON public.reward_logs;

CREATE POLICY "Users can view their own reward logs" ON public.reward_logs FOR
SELECT USING (user_id = public.get_current_user_id());

CREATE POLICY "Admins can manage all reward logs" ON public.reward_logs FOR ALL
USING (public.is_current_user_admin());

-- ================================================================
-- 8. 更新 requests 表的 RLS 策略
-- ================================================================

DROP POLICY IF EXISTS "Users can view their own requests" ON public.requests;
DROP POLICY IF EXISTS "Users can create requests" ON public.requests;

CREATE POLICY "Users can view their own requests" ON public.requests FOR
SELECT USING (user_id = public.get_current_user_id());

CREATE POLICY "Users can create their own requests" ON public.requests FOR
INSERT WITH CHECK (user_id = public.get_current_user_id());

CREATE POLICY "Admins can manage all requests" ON public.requests FOR ALL
USING (public.is_current_user_admin());

-- ================================================================
-- 9. 更新 user_task_states 表的 RLS 策略
-- ================================================================

DROP POLICY IF EXISTS "Users can manage their own task states" ON public.user_task_states;

CREATE POLICY "Users can manage their own task states" ON public.user_task_states FOR ALL
USING (user_id = public.get_current_user_id());

CREATE POLICY "Admins can manage all task states" ON public.user_task_states FOR ALL
USING (public.is_current_user_admin());

-- ================================================================
-- 10. 更新 swap_orders 表的 RLS 策略
-- ================================================================

DROP POLICY IF EXISTS "Users can view their own swap orders" ON public.swap_orders;

CREATE POLICY "Users can view their own swap orders" ON public.swap_orders FOR ALL
USING (
    user_id = public.get_current_user_id() 
    OR taker_id = public.get_current_user_id()
);

CREATE POLICY "Admins can manage all swap orders" ON public.swap_orders FOR ALL
USING (public.is_current_user_admin());

-- ================================================================
-- 11. 更新 announcements 表的 RLS 策略
-- ================================================================

DROP POLICY IF EXISTS "Allow read access to non-personal announcements" ON public.announcements;
DROP POLICY IF EXISTS "Users can view their own messages" ON public.announcements;

CREATE POLICY "Users can view public announcements" ON public.announcements FOR
SELECT USING (user_id IS NULL);

CREATE POLICY "Users can view their own messages" ON public.announcements FOR
SELECT USING (user_id = public.get_current_user_id());

CREATE POLICY "Admins can manage all announcements" ON public.announcements FOR ALL
USING (public.is_current_user_admin());

-- ================================================================
-- 12. 更新管理员专用表的 RLS 策略
-- ================================================================

-- system_settings 表
DROP POLICY IF EXISTS "Admins can manage system_settings" ON public.system_settings;
CREATE POLICY "Admins can manage system_settings" ON public.system_settings FOR ALL
USING (public.is_current_user_admin());

-- daily_tasks 表
DROP POLICY IF EXISTS "Admins can manage daily_tasks" ON public.daily_tasks;
CREATE POLICY "Admins can manage daily_tasks" ON public.daily_tasks FOR ALL
USING (public.is_current_user_admin());

-- investment_products 表
DROP POLICY IF EXISTS "Admins can manage investment_products" ON public.investment_products;
CREATE POLICY "Admins can manage investment_products" ON public.investment_products FOR ALL
USING (public.is_current_user_admin());

-- commission_rates 表
DROP POLICY IF EXISTS "Admins can manage commission_rates" ON public.commission_rates;
CREATE POLICY "Admins can manage commission_rates" ON public.commission_rates FOR ALL
USING (public.is_current_user_admin());

-- ================================================================
-- 13. 修复 get_total_platform_balance 函数的权限问题
-- ================================================================

-- 修改函数为 SECURITY DEFINER 以绕过 RLS 限制
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
-- 14. 添加缺失的 credit_reward 函数
-- ================================================================

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
    -- 增加用户余额
    INSERT INTO public.balances (user_id, asset, available_balance, frozen_balance)
    VALUES (p_user_id, p_asset, p_amount, 0)
    ON CONFLICT (user_id, asset) 
    DO UPDATE SET available_balance = balances.available_balance + p_amount;
    
    -- 记录奖励日志
    INSERT INTO public.reward_logs (
        user_id, amount, asset, type, source_id, description, created_at
    ) VALUES (
        p_user_id, p_amount, p_asset, p_reward_type, p_source_id, p_description, NOW()
    );
END;
$$ LANGUAGE plpgsql;

-- ================================================================
-- 15. 添加缺失的 create_daily_investment 函数
-- ================================================================

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
    -- 检查并扣除用户余额
    UPDATE public.balances 
    SET available_balance = available_balance - p_amount
    WHERE user_id = p_user_id 
      AND asset = 'USDT' 
      AND available_balance >= p_amount;
    
    -- 如果余额不足，抛出异常
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Insufficient balance for investment';
    END IF;
    
    -- 创建投资记录
    INSERT INTO public.investments (
        user_id, product_name, amount, settlement_date, status, category,
        productType, daily_rate, period, staking_asset, staking_amount
    ) VALUES (
        p_user_id, p_product_name, p_amount, NOW() + INTERVAL '1 day' * p_period,
        'active', p_category, 'daily', p_daily_rate, p_period, p_staking_asset, p_staking_amount
    );
END;
$$ LANGUAGE plpgsql;

-- ================================================================
-- 16. 添加缺失的 create_hourly_investment 函数
-- ================================================================

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
    -- 检查并扣除用户余额
    UPDATE public.balances 
    SET available_balance = available_balance - p_amount
    WHERE user_id = p_user_id 
      AND asset = 'USDT' 
      AND available_balance >= p_amount;
    
    -- 如果余额不足，抛出异常
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Insufficient balance for investment';
    END IF;
    
    -- 创建投资记录
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
-- 17. 为新函数添加注释
-- ================================================================

COMMENT ON FUNCTION public.get_current_user_id() IS 
'获取当前会话用户ID，用于自定义认证系统的RLS策略';

COMMENT ON FUNCTION public.is_current_user_admin() IS 
'检查当前用户是否为管理员，用于自定义认证系统的RLS策略';

COMMENT ON FUNCTION public.set_current_user(UUID) IS 
'设置当前会话的用户ID，应在每次数据库操作前调用';

COMMENT ON FUNCTION public.get_total_platform_balance() IS 
'获取平台总余额，管理员专用函数';

COMMENT ON FUNCTION public.credit_reward(UUID, NUMERIC, TEXT, TEXT, TEXT, TEXT) IS 
'给用户发放奖励并记录到奖励日志中';

COMMENT ON FUNCTION public.create_daily_investment(UUID, TEXT, NUMERIC, NUMERIC, INTEGER, TEXT, TEXT, NUMERIC) IS 
'创建每日收益投资产品，扣除用户余额并创建投资记录';

COMMENT ON FUNCTION public.create_hourly_investment(UUID, TEXT, NUMERIC, INTEGER, NUMERIC) IS 
'创建小时收益投资产品，扣除用户余额并创建投资记录';

-- ================================================================
-- 18. 验证修复
-- ================================================================

-- 测试 get_total_platform_balance 函数是否能正常工作
DO $$
DECLARE
    total_balance NUMERIC;
BEGIN
    SELECT public.get_total_platform_balance() INTO total_balance;
    RAISE NOTICE '平台总余额: %', total_balance;
END $$;

COMMIT;

-- 迁移完成提示
SELECT 
    'Complete database migration finished!' AS status,
    'RLS policies updated for custom auth compatibility' AS rls_status,
    'Missing functions added successfully' AS functions_status,
    'API mode patch applied' AS api_mode_status;