
-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- USERS TABLE
-- This table stores public user data, extending Supabase's auth.users table.
CREATE TABLE IF NOT EXISTS public.users (
    id uuid NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    username text UNIQUE,
    email text UNIQUE,
    is_admin boolean DEFAULT false,
    is_test_user boolean DEFAULT false,
    is_frozen boolean DEFAULT false,
    invitation_code text UNIQUE,
    inviter text REFERENCES public.users(username) ON DELETE SET NULL,
    registered_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);
-- Add comments for clarity
COMMENT ON TABLE public.users IS 'Public user profiles, extending Supabase auth.';
COMMENT ON COLUMN public.users.id IS 'Links to Supabase auth.users.id';

-- TRANSACTIONS TABLE
-- This table tracks all financial movements like deposits, withdrawals, and admin adjustments.
CREATE TABLE IF NOT EXISTS public.transactions (
    id uuid DEFAULT uuid_generate_v4() NOT NULL PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    type text NOT NULL, -- 'deposit', 'withdrawal', 'adjustment'
    asset text NOT NULL,
    amount double precision NOT NULL,
    status text NOT NULL, -- 'pending', 'approved', 'rejected'
    address text,
    transaction_hash text,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);
COMMENT ON TABLE public.transactions IS 'Tracks user deposits, withdrawals, and administrative balance adjustments.';


-- SPOT TRADES TABLE
-- This table logs all spot market trades made by users.
CREATE TABLE IF NOT EXISTS public.spot_trades (
    id uuid DEFAULT uuid_generate_v4() NOT NULL PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    trading_pair text NOT NULL,
    base_asset text NOT NULL,
    quote_asset text NOT NULL,
    type text NOT NULL, -- 'buy' or 'sell'
    amount double precision NOT NULL,
    total double precision NOT NULL,
    status text NOT NULL, -- 'filled', 'cancelled'
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);
COMMENT ON TABLE public.spot_trades IS 'Logs all user spot market trades.';


-- CONTRACT TRADES TABLE
-- This table logs all contract (options) trades made by users.
CREATE TABLE IF NOT EXISTS public.contract_trades (
    id uuid DEFAULT uuid_generate_v4() NOT NULL PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    trading_pair text NOT NULL,
    type text NOT NULL, -- 'buy' or 'sell'
    amount double precision NOT NULL,
    entry_price double precision NOT NULL,
    settlement_time timestamp with time zone NOT NULL,
    period integer NOT NULL,
    profit_rate double precision NOT NULL,
    status text NOT NULL, -- 'active' or 'settled'
    settlement_price double precision,
    outcome text, -- 'win' or 'loss'
    profit double precision,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);
COMMENT ON TABLE public.contract_trades IS 'Logs all user contract (options) trades.';


-- WITHDRAWAL ADDRESSES TABLE
-- This table stores user-saved addresses for withdrawals.
CREATE TABLE IF NOT EXISTS public.withdrawal_addresses (
    id uuid DEFAULT uuid_generate_v4() NOT NULL PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    name text NOT NULL,
    address text NOT NULL,
    network text NOT NULL
);
COMMENT ON TABLE public.withdrawal_addresses IS 'Stores user-saved cryptocurrency withdrawal addresses.';


-- ADMIN REQUESTS TABLE
-- This table is for admin-reviewable actions, like password changes.
CREATE TABLE IF NOT EXISTS public.admin_requests (
    id uuid DEFAULT uuid_generate_v4() NOT NULL PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    type text NOT NULL, -- e.g., 'password_reset'
    new_password text,
    status text NOT NULL, -- 'pending', 'approved', 'rejected'
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);
COMMENT ON TABLE public.admin_requests IS 'Queue for requests needing admin approval, like password changes.';


-- INVESTMENTS TABLE
-- This table logs user investments in financial products.
CREATE TABLE IF NOT EXISTS public.investments (
    id uuid DEFAULT uuid_generate_v4() NOT NULL PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    product_name text NOT NULL,
    amount double precision NOT NULL,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);
COMMENT ON TABLE public.investments IS 'Logs user investments in various financial products.';


-- COMMISSION LOGS TABLE
-- This table records all commissions earned by users from their downline.
CREATE TABLE IF NOT EXISTS public.commission_logs (
    id uuid DEFAULT uuid_generate_v4() NOT NULL PRIMARY KEY,
    upline_user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    source_user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    source_username text NOT NULL,
    source_level integer NOT NULL,
    commission_amount double precision NOT NULL,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);
COMMENT ON TABLE public.commission_logs IS 'Records commissions paid out to users from their referrals.';


-- =============================================
-- RLS (Row Level Security) POLICIES
-- =============================================

-- USERS Table RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow users to view their own data" ON public.users;
CREATE POLICY "Allow users to view their own data" ON public.users FOR SELECT USING (auth.uid() = id);
DROP POLICY IF EXISTS "Allow users to update their own data" ON public.users;
CREATE POLICY "Allow users to update their own data" ON public.users FOR UPDATE USING (auth.uid() = id);
DROP POLICY IF EXISTS "Allow admins to access all user data" ON public.users;
CREATE POLICY "Allow admins to access all user data" ON public.users FOR ALL USING ((SELECT is_admin FROM public.users WHERE id = auth.uid()) = true);


-- OTHER Tables RLS (User-specific access)
DO $$
DECLARE
    t_name TEXT;
BEGIN
    FOR t_name IN
        SELECT table_name FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name IN (
            'transactions', 'spot_trades', 'contract_trades', 'withdrawal_addresses',
            'admin_requests', 'investments', 'commission_logs'
        )
    LOOP
        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', t_name);
        EXECUTE format('DROP POLICY IF EXISTS "Allow users to access their own records" ON public.%I;', t_name);
        EXECUTE format('CREATE POLICY "Allow users to access their own records" ON public.%I FOR ALL USING (auth.uid() = user_id);', t_name);
        EXECUTE format('DROP POLICY IF EXISTS "Allow admins to access all records" ON public.%I;', t_name);
        EXECUTE format('CREATE POLICY "Allow admins to access all records" ON public.%I FOR ALL USING ((SELECT is_admin FROM public.users WHERE id = auth.uid()) = true) WITH CHECK ((SELECT is_admin FROM public.users WHERE id = auth.uid()) = true);', t_name);
    END LOOP;
END;
$$;


-- =============================================
-- DATABASE FUNCTIONS (RPC)
-- =============================================

-- Function to generate a unique 6-digit invitation code
CREATE OR REPLACE FUNCTION generate_invitation_code()
RETURNS text AS $$
DECLARE
  new_code text;
  is_duplicate boolean;
BEGIN
  LOOP
    new_code := (LPAD(floor(random()*1000000)::text, 6, '0'));
    SELECT EXISTS (SELECT 1 FROM public.users WHERE invitation_code = new_code) INTO is_duplicate;
    EXIT WHEN NOT is_duplicate;
  END LOOP;
  RETURN new_code;
END;
$$ LANGUAGE plpgsql;


-- Function to register a new user
CREATE OR REPLACE FUNCTION register_new_user(p_email text, p_password text, p_username text, p_inviter_username text)
RETURNS void AS $$
DECLARE
  new_user_id uuid;
  inviter_user_id uuid;
BEGIN
  -- Find the inviter's ID from their username
  SELECT id INTO inviter_user_id FROM public.users WHERE username = p_inviter_username;
  IF inviter_user_id IS NULL THEN
    RAISE EXCEPTION 'Invalid inviter username';
  END IF;

  -- Create the user in Supabase Auth
  INSERT INTO auth.users (id, email, encrypted_password, aud, role, created_at, updated_at)
  VALUES (uuid_generate_v4(), p_email, crypt(p_password, gen_salt('bf')), 'authenticated', 'authenticated', NOW(), NOW())
  RETURNING id INTO new_user_id;

  -- Create the public profile for the new user
  INSERT INTO public.users (id, username, email, inviter, invitation_code)
  VALUES (new_user_id, p_username, p_email, p_inviter_username, generate_invitation_code());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- Function for admin to get all user data
CREATE OR REPLACE FUNCTION get_all_users_for_admin()
RETURNS TABLE(
    id uuid,
    username text,
    is_test_user boolean,
    is_frozen boolean,
    registered_at timestamptz
) AS $$
BEGIN
  IF (SELECT is_admin FROM public.users WHERE id = auth.uid()) THEN
    RETURN QUERY SELECT u.id, u.username, u.is_test_user, u.is_frozen, u.registered_at FROM public.users u;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- Function to get a single user's profile
CREATE OR REPLACE FUNCTION get_user_profile_by_id(user_id_input uuid)
RETURNS TABLE(
    id uuid,
    username text,
    email text,
    is_test_user boolean,
    is_admin boolean,
    is_frozen boolean,
    inviter text,
    registered_at timestamptz,
    invitation_code text
) AS $$
BEGIN
    RETURN QUERY SELECT u.id, u.username, u.email, u.is_test_user, u.is_admin, u.is_frozen, u.inviter, u.registered_at, u.invitation_code
                 FROM public.users u
                 WHERE u.id = user_id_input;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- Function to get a user's downline (recursive)
CREATE OR REPLACE FUNCTION get_user_downline(p_user_id uuid)
RETURNS TABLE(username text, level integer, registered_at timestamptz) AS $$
BEGIN
    RETURN QUERY
    WITH RECURSIVE downline_cte AS (
        SELECT u.id, u.username as member_username, u.registered_at as member_registered_at, 1 AS level
        FROM public.users u
        WHERE u.inviter = (SELECT username FROM public.users WHERE id = p_user_id)

        UNION ALL

        SELECT u.id, u.username, u.registered_at, d.level + 1
        FROM public.users u
        JOIN downline_cte d ON u.inviter = d.member_username
        WHERE d.level < 3 -- Limit to 3 levels deep
    )
    SELECT member_username, level, member_registered_at FROM downline_cte;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- Function to distribute commissions recursively up to 3 levels
CREATE OR REPLACE FUNCTION distribute_commissions_recursively(p_source_user_id uuid, p_trade_amount numeric)
RETURNS void AS $$
DECLARE
    commission_rates numeric[] := ARRAY[0.08, 0.05, 0.02];
    current_inviter_username text;
    current_upline_id uuid;
    source_user_username text;
    i integer := 1;
BEGIN
    -- Get the username of the user who made the trade
    SELECT username INTO source_user_username FROM public.users WHERE id = p_source_user_id;

    -- Get the direct inviter's username
    SELECT inviter INTO current_inviter_username FROM public.users WHERE id = p_source_user_id;

    -- Loop up to 3 levels
    WHILE i <= 3 AND current_inviter_username IS NOT NULL LOOP
        -- Find the upline user's ID
        SELECT id INTO current_upline_id FROM public.users WHERE username = current_inviter_username;

        -- If the upline user exists, insert the commission log
        IF current_upline_id IS NOT NULL THEN
            INSERT INTO public.commission_logs (upline_user_id, source_user_id, source_username, source_level, commission_amount)
            VALUES (current_upline_id, p_source_user_id, source_user_username, i, p_trade_amount * commission_rates[i]);
        END IF;

        -- Move to the next level up
        SELECT inviter INTO current_inviter_username FROM public.users WHERE id = current_upline_id;
        i := i + 1;
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- =============================================
-- INITIAL DATA SEEDING
-- =============================================

-- Step 1: Create the authentication user for 'admin'
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
)
ON CONFLICT (email) DO NOTHING;


-- Step 2: Create the corresponding profile in the public 'users' table for the admin
INSERT INTO public.users (id, username, email, is_admin, is_test_user, invitation_code)
VALUES (
    (SELECT id FROM auth.users WHERE email = 'admin@rsf.app'),
    'admin',
    'admin@rsf.app',
    true, -- Set the is_admin flag to true
    true, -- Set as test user to have initial funds for demonstration
    generate_invitation_code()
)
ON CONFLICT (id) DO NOTHING;

