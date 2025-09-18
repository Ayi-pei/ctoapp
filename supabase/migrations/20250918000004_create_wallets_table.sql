-- Migration to create wallets table for compatibility with existing functions

-- Step 1: Create the wallets table with structure compatible with existing functions
CREATE TABLE IF NOT EXISTS public.wallets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    balance NUMERIC(30, 8) DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Step 2: Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_wallets_user_id ON public.wallets(user_id);

-- Step 3: Add RLS policies for wallets table
ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;

-- Admin policy
CREATE POLICY "Admin full access" ON public.wallets 
    FOR ALL USING (
        (SELECT is_admin FROM public.users WHERE id = auth.uid())
    );

-- User-specific policy
CREATE POLICY "Users can view and manage their own wallets" ON public.wallets 
    FOR ALL USING (auth.uid() = user_id);

-- Step 4: Add comment to table
COMMENT ON TABLE public.wallets IS 'User wallets for compatibility with existing functions';

-- Step 5: Create a function to initialize wallet for a user
CREATE OR REPLACE FUNCTION public.create_user_wallet(p_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Insert a new wallet for the user if it doesn't exist
    INSERT INTO public.wallets (user_id, balance)
    VALUES (p_user_id, 0)
    ON CONFLICT DO NOTHING;
END;
$$;

-- Step 6: Create a function to get user wallet balance
CREATE OR REPLACE FUNCTION public.get_user_wallet_balance(p_user_id UUID)
RETURNS NUMERIC(30, 8)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_balance NUMERIC(30, 8);
BEGIN
    SELECT balance INTO v_balance
    FROM public.wallets
    WHERE user_id = p_user_id;
    
    IF v_balance IS NULL THEN
        -- If wallet doesn't exist, create it with 0 balance
        PERFORM public.create_user_wallet(p_user_id);
        v_balance := 0;
    END IF;
    
    RETURN v_balance;
END;
$$;

-- Step 7: Create a function to update user wallet balance
CREATE OR REPLACE FUNCTION public.update_user_wallet_balance(p_user_id UUID, p_amount NUMERIC(30, 8))
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- First ensure wallet exists
    PERFORM public.create_user_wallet(p_user_id);
    
    -- Update the wallet balance
    UPDATE public.wallets
    SET balance = balance + p_amount,
        updated_at = NOW()
    WHERE user_id = p_user_id;
    
    -- Also update the balances table for consistency
    INSERT INTO public.balances (user_id, asset, available_balance)
    VALUES (p_user_id, 'USDT', p_amount)
    ON CONFLICT (user_id, asset)
    DO UPDATE SET 
        available_balance = balances.available_balance + p_amount,
        updated_at = NOW();
END;
$$;

-- Step 8: Grant execute permissions
GRANT EXECUTE ON FUNCTION public.create_user_wallet(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_wallet_balance(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_user_wallet_balance(UUID, NUMERIC) TO authenticated;