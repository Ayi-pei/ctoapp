-- 自定义认证系统的数据库修改
-- 为 profiles 表添加密码哈希字段

-- 添加密码哈希字段
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS password_hash TEXT;

-- 移除邮箱的 NOT NULL 约束（如果存在）
ALTER TABLE public.profiles 
ALTER COLUMN email DROP NOT NULL;

-- 创建初始余额的函数
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
        VALUES (p_user_id, v_asset_record.asset, 0, 0)
        ON CONFLICT (user_id, asset) DO NOTHING;
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 创建用户名索引以提高查询性能
CREATE INDEX IF NOT EXISTS idx_profiles_username ON public.profiles(username);
CREATE INDEX IF NOT EXISTS idx_profiles_invitation_code ON public.profiles(invitation_code);

-- 更新 RLS 策略以支持自定义认证
-- 注意：由于不再使用 Supabase Auth，需要修改依赖 auth.uid() 的策略

-- 创建一个函数来获取当前会话用户ID（需要在应用层设置）
CREATE OR REPLACE FUNCTION public.current_user_id()
RETURNS UUID AS $$
BEGIN
    -- 这个函数需要在应用层通过 RPC 调用时传递用户ID
    -- 或者使用其他方式来识别当前用户
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 注释：如果完全使用自定义认证，可能需要重新设计 RLS 策略
-- 或者考虑在应用层进行权限控制而不是数据库层