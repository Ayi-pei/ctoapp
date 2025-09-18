-- Migration to ensure credit_user_balance function exists

-- Step 1: Create the credit_user_balance function if it doesn't exist
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

-- Step 2: Grant execute permissions
GRANT EXECUTE ON FUNCTION public.credit_user_balance(UUID, TEXT, NUMERIC, TEXT) TO authenticated;