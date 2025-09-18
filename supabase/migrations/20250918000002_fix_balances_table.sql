-- Migration to fix balances table and related issues

-- Step 1: Create the balances table with correct foreign key reference
CREATE TABLE IF NOT EXISTS public.balances (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    asset TEXT NOT NULL,
    asset_type TEXT DEFAULT 'crypto',
    available_balance NUMERIC(30, 8) DEFAULT 0,
    frozen_balance NUMERIC(30, 8) DEFAULT 0,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, asset)
);

-- Step 2: Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_balances_user_asset ON public.balances(user_id, asset);

-- Step 3: Add RLS policies for balances table
ALTER TABLE public.balances ENABLE ROW LEVEL SECURITY;

-- Admin policy
CREATE POLICY "Admin full access" ON public.balances 
    FOR ALL USING (
        (SELECT is_admin FROM public.users WHERE id = auth.uid())
    );

-- User-specific policy
CREATE POLICY "Users can view and manage their own balances" ON public.balances 
    FOR ALL USING (auth.uid() = user_id);

-- Step 4: Create or replace the credit_user_balance function with correct table reference
CREATE OR REPLACE FUNCTION public.credit_user_balance(
    p_user_id UUID,
    p_asset TEXT,
    p_amount NUMERIC(30, 8),
    p_reason TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Insert or update the user's balance
    INSERT INTO public.balances (user_id, asset, available_balance)
    VALUES (p_user_id, p_asset, p_amount)
    ON CONFLICT (user_id, asset)
    DO UPDATE SET 
        available_balance = balances.available_balance + p_amount,
        updated_at = NOW();
    
    -- Log the transaction
    INSERT INTO public.transactions (
        user_id, 
        type, 
        asset, 
        amount, 
        status, 
        created_at
    ) VALUES (
        p_user_id, 
        'adjustment', 
        p_asset, 
        p_amount, 
        'completed', 
        NOW()
    );
END;
$$;

-- Step 5: Grant execute permissions
GRANT EXECUTE ON FUNCTION public.credit_user_balance(UUID, TEXT, NUMERIC, TEXT) TO authenticated;

-- Step 6: Add comment to table
COMMENT ON TABLE public.balances IS 'Stores user asset balances';