-- 1. Add missing columns to daily_tasks table
ALTER TABLE public.daily_tasks
ADD COLUMN IF NOT EXISTS img_src TEXT;

-- 2. Add missing columns to investment_products table
ALTER TABLE public.investment_products
ADD COLUMN IF NOT EXISTS category TEXT,
ADD COLUMN IF NOT EXISTS risk_level TEXT,
ADD COLUMN IF NOT EXISTS active_start_time TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS active_end_time TIMESTAMPTZ;

-- 3. Add missing columns to activities table
ALTER TABLE public.activities
ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
