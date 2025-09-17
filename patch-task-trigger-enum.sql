-- 快速补丁：添加新的任务触发器枚举值
-- 这个脚本可以在现有数据库上安全执行

-- 添加新的枚举值（如果不存在）
DO $$
BEGIN
    -- 检查并添加 contract_trade
    IF NOT EXISTS (
        SELECT 1 FROM unnest(enum_range(NULL::public.task_trigger_type)) AS enum_val 
        WHERE enum_val = 'contract_trade'
    ) THEN
        ALTER TYPE public.task_trigger_type ADD VALUE 'contract_trade';
        RAISE NOTICE '添加枚举值: contract_trade';
    END IF;

    -- 检查并添加 spot_trade  
    IF NOT EXISTS (
        SELECT 1 FROM unnest(enum_range(NULL::public.task_trigger_type)) AS enum_val 
        WHERE enum_val = 'spot_trade'
    ) THEN
        ALTER TYPE public.task_trigger_type ADD VALUE 'spot_trade';
        RAISE NOTICE '添加枚举值: spot_trade';
    END IF;

    -- 检查并添加 investment
    IF NOT EXISTS (
        SELECT 1 FROM unnest(enum_range(NULL::public.task_trigger_type)) AS enum_val 
        WHERE enum_val = 'investment'
    ) THEN
        ALTER TYPE public.task_trigger_type ADD VALUE 'investment';
        RAISE NOTICE '添加枚举值: investment';
    END IF;
END $$;

-- 验证所有枚举值
SELECT 'task_trigger_type 枚举值:' as info, unnest(enum_range(NULL::public.task_trigger_type)) as available_values;