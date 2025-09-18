-- Migration to fix activities table RLS policies
-- This migration adds INSERT and UPDATE policies for the activities table to allow proper seeding and management

-- Drop existing policies to start fresh
DROP POLICY IF EXISTS "Allow authenticated users to view activities" ON public.activities;

-- Create comprehensive RLS policies for activities table

-- 1. Allow all authenticated users to SELECT activities (read-only for general users)
CREATE POLICY "Allow authenticated users to view activities" ON public.activities
FOR SELECT TO authenticated USING (true);

-- 2. Allow admin users full access (INSERT, UPDATE, DELETE)
CREATE POLICY "Allow admin full access on activities" ON public.activities
FOR ALL USING (public.is_admin(auth.uid()));

-- 3. Allow system to seed initial data when table is empty
-- This policy allows INSERT when there are no existing activities (for seeding purposes)
CREATE POLICY "Allow seeding when table is empty" ON public.activities
FOR INSERT TO authenticated WITH CHECK (
    (SELECT COUNT(*) FROM public.activities) = 0
);

-- Alternative approach: Create a service function for seeding activities
-- This is a more secure approach that bypasses RLS for initial seeding
CREATE OR REPLACE FUNCTION public.seed_default_activities()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    activity_count INTEGER;
    result_text TEXT := '';
BEGIN
    -- Check if activities already exist
    SELECT COUNT(*) INTO activity_count FROM public.activities;
    
    IF activity_count > 0 THEN
        result_text := 'Activities already exist, skipping seed';
        RETURN result_text;
    END IF;
    
    -- Insert default activities
    INSERT INTO public.activities (title, description, rewardrule, howtoclaim, expiresat, status, imgsrc, created_at)
    VALUES 
    (
        '首充豪礼',
        '新用户首次充值任意金额，即可获得88 USDT体验金！体验金可用于秒合约交易，盈利部分可提现。',
        '首次充值任意金额',
        '充值成功后自动到账',
        (NOW() + INTERVAL '30 days')::TIMESTAMPTZ,
        'published',
        'https://placehold.co/600x400.png',
        NOW()
    ),
    (
        '交易大师挑战赛',
        '活动期间内，秒合约交易量排名前十的用户可瓜分10,000 USDT奖池！',
        '交易量排名前十',
        '活动结束后联系客服领取',
        (NOW() + INTERVAL '15 days')::TIMESTAMPTZ,
        'published',
        'https://placehold.co/600x400.png',
        NOW()
    );
    
    result_text := 'Successfully seeded ' || ROW_COUNT || ' default activities';
    RETURN result_text;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.seed_default_activities() TO authenticated;

-- Add helpful comment
COMMENT ON FUNCTION public.seed_default_activities IS 'Seeds default activities when the table is empty. Safe to call multiple times.';