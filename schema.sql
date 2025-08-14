-- Drop existing tables and functions to ensure a clean slate, handling dependencies.
DROP FUNCTION IF EXISTS public.register_new_user(text,text,text,text);
DROP FUNCTION IF EXISTS public.get_user_downline(uuid);
DROP FUNCTION IF EXISTS public.distribute_commissions_recursively(uuid,numeric);
DROP FUNCTION IF EXISTS public.get_all_users_for_admin();
DROP FUNCTION IF EXISTS public.get_user_profile_by_id(uuid);
DROP TABLE IF EXISTS public.commission_logs;
DROP TABLE IF EXISTS public.investments;
DROP TABLE IF EXISTS public.spot_trades;
DROP TABLE IF EXISTS public.contract_trades;
DROP TABLE IF EXISTS public.withdrawal_addresses;
DROP TABLE IF EXISTS public.admin_requests;
DROP TABLE IF EXISTS public.transactions;
DROP TABLE IF EXISTS public.users;


--
-- Create the `users` table
--
CREATE TABLE public.users (
    id uuid NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    username text NOT NULL UNIQUE,
    email text,
    is_admin boolean DEFAULT false,
    is_test_user boolean DEFAULT false,
    is_frozen boolean DEFAULT false,
    inviter text, -- username of the inviter
    invitation_code text UNIQUE,
    registered_at timestamptz DEFAULT timezone('utc'::text, now())
);
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

--
-- Create other tables
--
CREATE TABLE public.transactions (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES public.users(id),
    type text NOT NULL, -- 'deposit', 'withdrawal', 'adjustment'
    asset text NOT NULL,
    amount numeric NOT NULL,
    status text NOT NULL, -- 'pending', 'approved', 'rejected'
    address text,
    transaction_hash text,
    created_at timestamptz DEFAULT timezone('utc'::text, now())
);
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;


CREATE TABLE public.admin_requests (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES public.users(id),
    type text NOT NULL, -- 'password_reset'
    new_password text,
    status text NOT NULL, -- 'pending'
    created_at timestamptz DEFAULT timezone('utc'::text, now())
);
ALTER TABLE public.admin_requests ENABLE ROW LEVEL SECURITY;


CREATE TABLE public.withdrawal_addresses (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES public.users(id),
    name text NOT NULL,
    address text NOT NULL,
    network text NOT NULL
);
ALTER TABLE public.withdrawal_addresses ENABLE ROW LEVEL SECURITY;


CREATE TABLE public.contract_trades (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES public.users(id),
    trading_pair text NOT NULL,
    type text NOT NULL, -- 'buy' or 'sell'
    amount numeric NOT NULL,
    entry_price numeric NOT NULL,
    settlement_time timestamptz NOT NULL,
    period integer NOT NULL,
    profit_rate numeric NOT NULL,
    status text NOT NULL, -- 'active' or 'settled'
    settlement_price numeric,
    outcome text, -- 'win' or 'loss'
    profit numeric,
    created_at timestamptz DEFAULT timezone('utc'::text, now())
);
ALTER TABLE public.contract_trades ENABLE ROW LEVEL SECURITY;


CREATE TABLE public.spot_trades (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES public.users(id),
    trading_pair text NOT NULL,
    type text NOT NULL, -- 'buy' or 'sell'
    base_asset text NOT NULL,
    quote_asset text NOT NULL,
    amount numeric NOT NULL,
    total numeric NOT NULL,
    status text NOT NULL, -- 'filled' or 'cancelled'
    created_at timestamptz DEFAULT timezone('utc'::text, now())
);
ALTER TABLE public.spot_trades ENABLE ROW LEVEL SECURITY;


CREATE TABLE public.investments (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES public.users(id),
    product_name text NOT NULL,
    amount numeric NOT NULL,
    created_at timestamptz DEFAULT timezone('utc'::text, now())
);
ALTER TABLE public.investments ENABLE ROW LEVEL SECURITY;


CREATE TABLE public.commission_logs (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    upline_user_id uuid NOT NULL,
    source_user_id uuid NOT NULL,
    source_username text NOT NULL,
    source_level integer NOT NULL,
    trade_amount numeric NOT NULL,
    commission_rate numeric NOT NULL,
    commission_amount numeric NOT NULL,
    created_at timestamptz DEFAULT timezone('utc'::text, now())
);
ALTER TABLE public.commission_logs ENABLE ROW LEVEL SECURITY;


--
-- RLS Policies
--
CREATE POLICY "Allow users to see their own profile" ON public.users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Allow users to update their own profile" ON public.users FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Allow user to see their own transactions" ON public.transactions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Allow user to create their own transactions" ON public.transactions FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Allow user to see their own requests" ON public.admin_requests FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Allow user to create their own requests" ON public.admin_requests FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Allow user to manage their own withdrawal addresses" ON public.withdrawal_addresses FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Allow user to manage their own trades" ON public.contract_trades FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Allow user to manage their own trades" ON public.spot_trades FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Allow user to manage their own investments" ON public.investments FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Allow user to see their own commission logs" ON public.commission_logs FOR SELECT USING (auth.uid() = upline_user_id);

-- Admin can bypass RLS on all tables
CREATE POLICY "Allow admin full access" ON public.users FOR ALL USING ((SELECT is_admin FROM public.users WHERE id = auth.uid()) = true);
CREATE POLICY "Allow admin full access" ON public.transactions FOR ALL USING ((SELECT is_admin FROM public.users WHERE id = auth.uid()) = true);
CREATE POLICY "Allow admin full access" ON public.admin_requests FOR ALL USING ((SELECT is_admin FROM public.users WHERE id = auth.uid()) = true);
CREATE POLICY "Allow admin full access" ON public.withdrawal_addresses FOR ALL USING ((SELECT is_admin FROM public.users WHERE id = auth.uid()) = true);
CREATE POLICY "Allow admin full access" ON public.contract_trades FOR ALL USING ((SELECT is_admin FROM public.users WHERE id = auth.uid()) = true);
CREATE POLICY "Allow admin full access" ON public.spot_trades FOR ALL USING ((SELECT is_admin FROM public.users WHERE id = auth.uid()) = true);
CREATE POLICY "Allow admin full access" ON public.investments FOR ALL USING ((SELECT is_admin FROM public.users WHERE id = auth.uid()) = true);
CREATE POLICY "Allow admin full access" ON public.commission_logs FOR ALL USING ((SELECT is_admin FROM public.users WHERE id = auth.uid()) = true);


--
-- Database Functions (RPC)
--

-- Function to get a user's own profile
CREATE OR REPLACE FUNCTION public.get_user_profile_by_id(user_id_input uuid)
RETURNS SETOF public.users
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT * FROM public.users WHERE id = user_id_input;
$$;


-- Function for an admin to get all users
CREATE OR REPLACE FUNCTION public.get_all_users_for_admin()
RETURNS TABLE(id uuid, username text, email text, is_test_user boolean, is_admin boolean, is_frozen boolean, inviter text, invitation_code text, registered_at timestamptz)
LANGUAGE plpgsql
AS $$
BEGIN
    -- First, check if the caller is an admin
    IF (SELECT is_admin FROM public.users WHERE id = auth.uid()) THEN
        RETURN QUERY SELECT u.id, u.username, u.email, u.is_test_user, u.is_admin, u.is_frozen, u.inviter, u.invitation_code, u.registered_at FROM public.users u;
    END IF;
END;
$$;


-- Function to generate a unique 8-character invitation code
CREATE OR REPLACE FUNCTION public.generate_invitation_code()
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
    new_code text;
    is_unique boolean := false;
BEGIN
    WHILE NOT is_unique LOOP
        new_code := upper(substring(md5(random()::text) for 8));
        is_unique := NOT EXISTS (SELECT 1 FROM public.users WHERE invitation_code = new_code);
    END LOOP;
    RETURN new_code;
END;
$$;

-- Function to register a new user
CREATE OR REPLACE FUNCTION public.register_new_user(
    p_email text,
    p_password text,
    p_username text,
    p_inviter_username text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    new_user_id uuid;
    inviter_user_id uuid;
BEGIN
    -- 1. Find the inviter by their username
    SELECT id INTO inviter_user_id FROM public.users WHERE username = p_inviter_username;
    IF inviter_user_id IS NULL THEN
        RAISE EXCEPTION 'Invalid invitation: Inviter not found';
    END IF;

    -- 2. Create the user in auth.users
    new_user_id := (SELECT id FROM auth.users WHERE email = p_email);
    IF new_user_id IS NULL THEN
        INSERT INTO auth.users (id, email, encrypted_password, aud, role, created_at, updated_at, email_confirmed_at)
        VALUES (uuid_generate_v4(), p_email, crypt(p_password, gen_salt('bf')), 'authenticated', 'authenticated', NOW(), NOW(), NOW())
        RETURNING id INTO new_user_id;
    ELSE
        RAISE EXCEPTION 'User with this email already exists.';
    END IF;

    -- 3. Create the profile in public.users
    INSERT INTO public.users (id, username, email, inviter, invitation_code)
    VALUES (new_user_id, p_username, p_email, p_inviter_username, generate_invitation_code());
EXCEPTION
    WHEN unique_violation THEN
        -- If user creation failed because the user already exists in auth.users but not public.users, or username is taken
        -- we should clean up the auth user to allow retrying with a different username
        DELETE FROM auth.users WHERE id = new_user_id;
        RAISE EXCEPTION 'Username or email is already taken. Please try another one.';
END;
$$;


-- Function to get a user's multi-level downline (up to 3 levels)
CREATE OR REPLACE FUNCTION public.get_user_downline(p_user_id uuid)
RETURNS TABLE(username text, level integer, registered_at timestamptz)
LANGUAGE sql
AS $$
    WITH RECURSIVE downline_cte AS (
        -- Anchor member: direct invitees (Level 1)
        SELECT id, username, inviter, 1 AS level, registered_at
        FROM public.users
        WHERE inviter = (SELECT u.username FROM public.users u WHERE u.id = p_user_id)

        UNION ALL

        -- Recursive member: invitees of the previous level
        SELECT u.id, u.username, u.inviter, d.level + 1, u.registered_at
        FROM public.users u
        JOIN downline_cte d ON u.inviter = d.username
        WHERE d.level < 3 -- Limit recursion to 3 levels
    )
    SELECT d.username, d.level, d.registered_at FROM downline_cte d ORDER BY d.level, d.registered_at DESC;
$$;


-- Function to distribute commissions up to 3 levels
CREATE OR REPLACE FUNCTION public.distribute_commissions_recursively(
    p_source_user_id uuid,
    p_trade_amount numeric
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_upline_username text;
    v_upline_user_id uuid;
    v_source_username text;
    v_level integer := 1;
    v_commission_rate numeric;
    v_commission_amount numeric;
    COMMISSION_RATES numeric[] := ARRAY[0.08, 0.05, 0.02]; -- LV1, LV2, LV3
BEGIN
    SELECT username INTO v_source_username FROM public.users WHERE id = p_source_user_id;
    SELECT inviter INTO v_upline_username FROM public.users WHERE id = p_source_user_id;

    WHILE v_upline_username IS NOT NULL AND v_level <= 3 LOOP
        -- Get the upline user's ID
        SELECT id INTO v_upline_user_id FROM public.users WHERE username = v_upline_username;

        -- If upline user exists, process commission
        IF v_upline_user_id IS NOT NULL THEN
            -- Get commission rate for the current level
            v_commission_rate := COMMISSION_RATES[v_level];
            v_commission_amount := p_trade_amount * v_commission_rate;

            -- Log the commission
            INSERT INTO public.commission_logs (upline_user_id, source_user_id, source_username, source_level, trade_amount, commission_rate, commission_amount)
            VALUES (v_upline_user_id, p_source_user_id, v_source_username, v_level, p_trade_amount, v_commission_rate, v_commission_amount);
            
            -- Move to the next level up
            SELECT inviter INTO v_upline_username FROM public.users WHERE id = v_upline_user_id;
            v_level := v_level + 1;
        ELSE
            -- Stop if the chain is broken
            v_upline_username := NULL;
        END IF;
    END LOOP;
END;
$$;


--
-- Initial Data Seeding
--

-- Step 1: Create the authentication user for 'admin'
-- Removed 'confirmed_at' as it's a generated column in newer Supabase versions.
INSERT INTO auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, recovery_token, recovery_sent_at, last_sign_in_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, confirmation_token, email_change, email_change_sent_at)
VALUES (
    '00000000-0000-0000-0000-000000000000',
    uuid_generate_v4(), -- Generate a new UUID for the admin user
    'authenticated',
    'authenticated',
    'admin@rsf.app', -- Use a conventional email format for Supabase Auth
    crypt('password', gen_salt('bf')), -- Encrypt the password 'password'
    NOW(),
    '',
    NULL,
    NULL,
    '{"provider":"email","providers":["email"]}',
    '{}',
    NOW(),
    NOW(),
    '',
    '',
    NULL
);

-- Step 2: Create the corresponding profile in the public 'users' table
INSERT INTO public.users (id, username, email, is_admin, is_test_user, invitation_code)
VALUES (
    (SELECT id FROM auth.users WHERE email = 'admin@rsf.app'),
    'admin',
    'admin@rsf.app',
    true, -- Set the is_admin flag to true
    true, -- Set as test user to have initial funds for demonstration
    public.generate_invitation_code() -- Generate an invitation code for the admin
);
