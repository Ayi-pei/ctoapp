-- This is the final, corrected migration script to fix all RLS (Row Level Security) issues.
-- It uses the correct table names and sets SELECT policies for all necessary tables.

-- 1. Add RLS policy for announcements
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow authenticated users to view announcements" ON public.announcements;
CREATE POLICY "Allow authenticated users to view announcements" ON public.announcements
FOR SELECT TO authenticated USING (true);

-- 2. Add RLS policy for action_logs (Corrected from 'logs')
ALTER TABLE public.action_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow authenticated users to view action_logs" ON public.action_logs;
CREATE POLICY "Allow authenticated users to view action_logs" ON public.action_logs
FOR SELECT TO authenticated USING (true);

-- 3. Add RLS policy for requests (Confirmed correct)
ALTER TABLE public.requests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow authenticated users to view requests" ON public.requests;
CREATE POLICY "Allow authenticated users to view requests" ON public.requests
FOR SELECT TO authenticated USING (true);

-- 4. Add RLS policy for activities
ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow authenticated users to view activities" ON public.activities;
CREATE POLICY "Allow authenticated users to view activities" ON public.activities
FOR SELECT TO authenticated USING (true);

-- 5. Add RLS policy for market_kline_data
ALTER TABLE public.market_kline_data ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow authenticated users to view market kline data" ON public.market_kline_data;
CREATE POLICY "Allow authenticated users to view market kline data" ON public.market_kline_data
FOR SELECT TO authenticated USING (true);

-- 6. Re-apply RLS policy for daily_tasks to ensure it is set correctly
ALTER TABLE public.daily_tasks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow authenticated users to view daily tasks" ON public.daily_tasks;
CREATE POLICY "Allow authenticated users to view daily tasks"
ON public.daily_tasks FOR SELECT TO authenticated USING (true);

-- 7. Re-apply RLS policy for investment_settings to ensure it is set correctly
ALTER TABLE public.investment_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow users to view investment settings" ON public.investment_settings;
CREATE POLICY "Allow users to view investment settings" ON public.investment_settings 
FOR SELECT USING (true);
