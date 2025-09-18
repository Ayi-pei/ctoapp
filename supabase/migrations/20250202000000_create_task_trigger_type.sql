-- Migration to create task_trigger_type enum if it doesn't exist

-- Step 1: Create the task_trigger_type enum if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_type WHERE typname = 'task_trigger_type'
    ) THEN
        CREATE TYPE public.task_trigger_type AS ENUM (
            'daily_check_in',
            'market_prediction',
            'investment_create',
            'trade_complete',
            'contract_trade',
            'spot_trade',
            'investment'
        );
        RAISE NOTICE 'Created task_trigger_type enum';
    ELSE
        RAISE NOTICE 'task_trigger_type enum already exists';
    END IF;
END $$;

-- Step 2: Add missing values to the enum if they don't exist
DO $$
BEGIN
    -- Check and add contract_trade
    IF NOT EXISTS (
        SELECT 1 FROM unnest(enum_range(NULL::public.task_trigger_type)) AS enum_val 
        WHERE enum_val = 'contract_trade'
    ) THEN
        ALTER TYPE public.task_trigger_type ADD VALUE 'contract_trade';
        RAISE NOTICE 'Added contract_trade to task_trigger_type enum';
    END IF;

    -- Check and add spot_trade  
    IF NOT EXISTS (
        SELECT 1 FROM unnest(enum_range(NULL::public.task_trigger_type)) AS enum_val 
        WHERE enum_val = 'spot_trade'
    ) THEN
        ALTER TYPE public.task_trigger_type ADD VALUE 'spot_trade';
        RAISE NOTICE 'Added spot_trade to task_trigger_type enum';
    END IF;

    -- Check and add investment
    IF NOT EXISTS (
        SELECT 1 FROM unnest(enum_range(NULL::public.task_trigger_type)) AS enum_val 
        WHERE enum_val = 'investment'
    ) THEN
        ALTER TYPE public.task_trigger_type ADD VALUE 'investment';
        RAISE NOTICE 'Added investment to task_trigger_type enum';
    END IF;
END $$;

-- Step 3: Verify all enum values
-- This is just for debugging purposes
DO $$
BEGIN
    RAISE NOTICE 'task_trigger_type enum values: %', (
        SELECT array_to_string(array_agg(enumlabel), ', ') 
        FROM pg_enum e 
        JOIN pg_type t ON e.enumtypid = t.oid 
        WHERE t.typname = 'task_trigger_type'
    );
END $$;