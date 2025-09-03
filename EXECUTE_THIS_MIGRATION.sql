-- 🚀 完整数据库迁移文件 - 直接在 Supabase SQL Editor 中执行
-- 包含：RLS 策略兼容性修复 + 缺失函数补全 + API 模式补丁

-- 1. 移除公开访问策略（API 模式补丁）
DROP POLICY IF EXISTS "Allow public read access to profiles" ON public.profiles;

-- 2. 创建自定义认证函数
CREATE OR REPLACE FUNCTION public.get_current_user_id()
RETURNS UUID AS $$
DECLARE current_user_id UUID;
BEGIN
    SELECT current_setting('app.current_user_id', true)::UUID INTO current_user_id;
    RETURN current_user_id;
EXCEPTION WHEN OTHERS THEN RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.is_current_user_admin()
RETURNS BOOLEAN AS $$
DECLARE user_id UUID; is_admin BOOLEAN := FALSE;
BEGIN
    user_id := public.get_current_user_id();
    IF user_id IS NULL THEN RETURN FALSE; END IF;
    SELECT p.is_admin INTO is_admin FROM public.profiles p WHERE p.id = user_id;
    RETURN COALESCE(is_admin, FALSE);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.set_current_user(p_user_id UUID)
RETURNS VOID AS $$
BEGIN
    PERFORM set_config('app.current_user_id', p_user_id::TEXT, true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. 更新所有 RLS 策略
-- profiles 表
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can do anything to profiles" ON public.profiles;

CREATE POLICY "Users can view their own profile" ON public.profiles FOR SELECT USING (id = public.get_current_user_id());
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING (id = public.get_current_user_id());
CREATE POLICY "Admins can manage all profiles" ON public.profiles FOR ALL USING (public.is_current_user_admin());

-- balances 表
DROP POLICY IF EXISTS "Users can view their own balances" ON public.balances;
DROP POLICY IF EXISTS "Admins can view all balances" ON public.balances;
CREATE POLICY "Users can view their own balances" ON public.balances FOR SELECT USING (user_id = public.get_current_user_id());
CREATE POLICY "Admins can manage all balances" ON public.balances FOR ALL USING (public.is_current_user_admin());

-- trades 表
DROP POLICY IF EXISTS "Users can view their own trades" ON public.trades;
CREATE POLICY "Users can view their own trades" ON public.trades FOR SELECT USING (user_id = public.get_current_user_id());
CREATE POLICY "Admins can manage all trades" ON public.trades FOR ALL USING (public.is_current_user_admin());

-- investments 表
DROP POLICY IF EXISTS "Users can view their own investments" ON public.investments;
CREATE POLICY "Users can view their own investments" ON public.investments FOR SELECT USING (user_id = public.get_current_user_id());
CREATE POLICY "Users can manage their own investments" ON public.investments FOR ALL USING (user_id = public.get_current_user_id());
CREATE POLICY "Admins can manage all investments" ON public.investments FOR ALL USING (public.is_current_user_admin());

-- reward_logs 表
DROP POLICY IF EXISTS "Users can view their own reward logs" ON public.reward_logs;
CREATE POLICY "Users can view their own reward logs" ON public.reward_logs FOR SELECT USING (user_id = public.get_current_user_id());
CREATE POLICY "Admins can manage all reward logs" ON public.reward_logs FOR ALL USING (public.is_current_user_admin());

-- requests 表
DROP POLICY IF EXISTS "Users can view their own requests" ON public.requests;
DROP POLICY IF EXISTS "Users can create requests" ON public.requests;
CREATE POLICY "Users can view their own requests" ON public.requests FOR SELECT USING (user_id = public.get_current_user_id());
CREATE POLICY "Users can create their own requests" ON public.requests FOR INSERT WITH CHECK (user_id = public.get_current_user_id());
CREATE POLICY "Admins can manage all requests" ON public.requests FOR ALL USING (public.is_current_user_admin());

-- 其他表策略
DROP POLICY IF EXISTS "Users can manage their own task states" ON public.user_task_states;
CREATE POLICY "Users can manage their own task states" ON public.user_task_states FOR ALL USING (user_id = public.get_current_user_id());
CREATE POLICY "Admins can manage all task states" ON public.user_task_states FOR ALL USING (public.is_current_user_admin());

DROP POLICY IF EXISTS "Users can view their own swap orders" ON public.swap_orders;
CREATE POLICY "Users can view their own swap orders" ON public.swap_orders FOR ALL USING (user_id = public.get_current_user_id() OR taker_id = public.get_current_user_id());
CREATE POLICY "Admins can manage all swap orders" ON public.swap_orders FOR ALL USING (public.is_current_user_admin());

DROP POLICY IF EXISTS "Allow read access to non-personal announcements" ON public.announcements;
DROP POLICY IF EXISTS "Users can view their own messages" ON public.announcements;
CREATE POLICY "Users can view public announcements" ON public.announcements FOR SELECT USING (user_id IS NULL);
CREATE POLICY "Users can view their own messages" ON public.announcements FOR SELECT USING (user_id = public.get_current_user_id());
CREATE POLICY "Admins can manage all announcements" ON public.announcements FOR ALL USING (public.is_current_user_admin());

-- 管理员专用表
DROP POLICY IF EXISTS "Admins can manage system_settings" ON public.system_settings;
CREATE POLICY "Admins can manage system_settings" ON public.system_settings FOR ALL USING (public.is_current_user_admin());

DROP POLICY IF EXISTS "Admins can manage daily_tasks" ON public.daily_tasks;
CREATE POLICY "Admins can manage daily_tasks" ON public.daily_tasks FOR ALL USING (public.is_current_user_admin());

DROP POLICY IF EXISTS "Admins can manage investment_products" ON public.investment_products;
CREATE POLICY "Admins can manage investment_products" ON public.investment_products FOR ALL USING (public.is_current_user_admin());

DROP POLICY IF EXISTS "Admins can manage commission_rates" ON public.commission_rates;
CREATE POLICY "Admins can manage commission_rates" ON public.commission_rates FOR ALL USING (public.is_current_user_admin());

-- 4. 修复和添加缺失的函数
DROP FUNCTION IF EXISTS public.get_total_platform_balance();
CREATE OR REPLACE FUNCTION public.get_total_platform_balance() 
RETURNS double precision SECURITY DEFINER AS $$ 
BEGIN 
    RETURN (SELECT COALESCE(SUM(available_balance + frozen_balance), 0) FROM public.balances WHERE asset_type = 'crypto');
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.credit_reward(
    p_user_id UUID, p_amount NUMERIC, p_asset TEXT, p_reward_type TEXT, p_source_id TEXT, p_description TEXT
) RETURNS VOID SECURITY DEFINER AS $$
BEGIN
    INSERT INTO public.balances (user_id, asset, available_balance, frozen_balance)
    VALUES (p_user_id, p_asset, p_amount, 0)
    ON CONFLICT (user_id, asset) DO UPDATE SET available_balance = balances.available_balance + p_amount;
    
    INSERT INTO public.reward_logs (user_id, amount, asset, type, source_id, description, created_at)
    VALUES (p_user_id, p_amount, p_asset, p_reward_type, p_source_id, p_description, NOW());
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.create_daily_investment(
    p_user_id UUID, p_product_name TEXT, p_amount NUMERIC, p_daily_rate NUMERIC,
    p_period INTEGER, p_category TEXT, p_staking_asset TEXT, p_staking_amount NUMERIC
) RETURNS VOID SECURITY DEFINER AS $$
BEGIN
    UPDATE public.balances SET available_balance = available_balance - p_amount
    WHERE user_id = p_user_id AND asset = 'USDT' AND available_balance >= p_amount;
    IF NOT FOUND THEN RAISE EXCEPTION 'Insufficient balance'; END IF;
    
    INSERT INTO public.investments (user_id, product_name, amount, settlement_date, status, category, productType, daily_rate, period, staking_asset, staking_amount)
    VALUES (p_user_id, p_product_name, p_amount, NOW() + INTERVAL '1 day' * p_period, 'active', p_category, 'daily', p_daily_rate, p_period, p_staking_asset, p_staking_amount);
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.create_hourly_investment(
    p_user_id UUID, p_product_name TEXT, p_amount NUMERIC, p_duration_hours INTEGER, p_hourly_rate NUMERIC
) RETURNS VOID SECURITY DEFINER AS $$
BEGIN
    UPDATE public.balances SET available_balance = available_balance - p_amount
    WHERE user_id = p_user_id AND asset = 'USDT' AND available_balance >= p_amount;
    IF NOT FOUND THEN RAISE EXCEPTION 'Insufficient balance'; END IF;
    
    INSERT INTO public.investments (user_id, product_name, amount, settlement_date, status, category, productType, hourly_rate, duration_hours)
    VALUES (p_user_id, p_product_name, p_amount, NOW() + INTERVAL '1 hour' * p_duration_hours, 'active', 'hourly', 'hourly', p_hourly_rate, p_duration_hours);
END;
$$ LANGUAGE plpgsql;

-- 完成提示
SELECT '🎉 完整数据库迁移完成！RLS策略已更新，缺失函数已添加，API模式补丁已应用。' AS migration_status;