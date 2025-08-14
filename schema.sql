
-- Drop existing tables, functions, and policies if they exist, in reverse order of dependency.
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON public.commission_logs;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.commission_logs;
DROP TABLE IF EXISTS public.commission_logs;

DROP POLICY IF EXISTS "Enable all access for admin users" ON public.investments;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.investments;
DROP POLICY IF EXISTS "Enable read access for owner" ON public.investments;
DROP TABLE IF EXISTS public.investments;

DROP POLICY IF EXISTS "Enable all access for admin users" ON public.withdrawal_addresses;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.withdrawal_addresses;
DROP POLICY IF EXISTS "Enable read access for owner" ON public.withdrawal_addresses;
DROP POLICY IF EXISTS "Enable delete for owner" ON public.withdrawal_addresses;
DROP TABLE IF EXISTS public.withdrawal_addresses;

DROP POLICY IF EXISTS "Enable all access for admin users" ON public.admin_requests;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.admin_requests;
DROP POLICY IF EXISTS "Enable read for admin users" ON public.admin_requests;
DROP TABLE IF EXISTS public.admin_requests;

DROP POLICY IF EXISTS "Enable all access for admin users" ON public.transactions;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.transactions;
DROP POLICY IF EXISTS "Enable read access for owner" ON public.transactions;
DROP TABLE IF EXISTS public.transactions;

DROP POLICY IF EXISTS "Enable all access for admin users" ON public.contract_trades;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.contract_trades;
DROP POLICY IF EXISTS "Enable read access for owner" ON public.contract_trades;
DROP TABLE IF EXISTS public.contract_trades;

DROP POLICY IF EXISTS "Enable all access for admin users" ON public.spot_trades;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.spot_trades;
DROP POLICY IF EXISTS "Enable read access for owner" ON public.spot_trades;
DROP TABLE IF EXISTS public.spot_trades;

DROP FUNCTION IF EXISTS public.get_user_downline;
DROP FUNCTION IF EXISTS public.distribute_commissions_recursively;
DROP FUNCTION IF EXISTS public.register_new_user;
DROP FUNCTION IF EXISTS public.get_user_profile_by_id;
DROP FUNCTION IF EXISTS public.get_all_users_for_admin;

DROP POLICY IF EXISTS "Enable update for users based on email" ON public.users;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.users;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.users;
DROP TABLE IF EXISTS public.users;

-- 1. Users Table
-- Stores public user data.
CREATE TABLE public.users (
    id uuid NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    username text UNIQUE NOT NULL,
    email text UNIQUE,
    inviter text, -- username of the user who invited this user
    is_admin boolean DEFAULT false,
    is_test_user boolean DEFAULT false,
    is_frozen boolean DEFAULT false,
    invitation_code text UNIQUE,
    created_at timestamp with time zone DEFAULT now()
);
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- 2. Spot Trades Table
CREATE TABLE public.spot_trades (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES public.users(id),
    trading_pair text NOT NULL,
    type text NOT NULL, -- 'buy' or 'sell'
    base_asset text NOT NULL,
    quote_asset text NOT NULL,
    amount double precision NOT NULL,
    total double precision NOT NULL,
    status text DEFAULT 'filled',
    created_at timestamp with time zone DEFAULT now()
);
ALTER TABLE public.spot_trades ENABLE ROW LEVEL SECURITY;

-- 3. Contract Trades Table
CREATE TABLE public.contract_trades (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES public.users(id),
    trading_pair text NOT NULL,
    type text NOT NULL, -- 'buy' or 'sell'
    amount double precision NOT NULL,
    entry_price double precision NOT NULL,
    settlement_time timestamp with time zone,
    period integer,
    profit_rate double precision,
    status text DEFAULT 'active',
    settlement_price double precision,
    outcome text,
    profit double precision,
    created_at timestamp with time zone DEFAULT now()
);
ALTER TABLE public.contract_trades ENABLE ROW LEVEL SECURITY;

-- 4. Transactions Table (Deposits/Withdrawals)
CREATE TABLE public.transactions (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES public.users(id),
    type text NOT NULL, -- 'deposit', 'withdrawal', 'adjustment'
    asset text NOT NULL,
    amount double precision NOT NULL,
    status text DEFAULT 'pending',
    address text,
    transaction_hash text,
    created_at timestamp with time zone DEFAULT now()
);
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- 5. Admin Requests Table (e.g., password resets)
CREATE TABLE public.admin_requests (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES public.users(id),
    type text NOT NULL, -- 'password_reset'
    new_password text,
    status text DEFAULT 'pending',
    created_at timestamp with time zone DEFAULT now()
);
ALTER TABLE public.admin_requests ENABLE ROW LEVEL SECURITY;

-- 6. Withdrawal Addresses Table
CREATE TABLE public.withdrawal_addresses (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES public.users(id),
    name text NOT NULL,
    address text NOT NULL,
    network text NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);
ALTER TABLE public.withdrawal_addresses ENABLE ROW LEVEL SECURITY;

-- 7. Investments Table
CREATE TABLE public.investments (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES public.users(id),
    product_name text NOT NULL,
    amount double precision NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);
ALTER TABLE public.investments ENABLE ROW LEVEL SECURITY;

-- 8. Commission Logs Table
CREATE TABLE public.commission_logs (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    upline_user_id uuid NOT NULL REFERENCES public.users(id),
    source_user_id uuid NOT NULL REFERENCES public.users(id),
    source_username text NOT NULL,
    source_level integer NOT NULL,
    trade_amount double precision NOT NULL,
    commission_rate double precision NOT NULL,
    commission_amount double precision NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);
ALTER TABLE public.commission_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Policies for users table
CREATE POLICY "Enable read access for all users" ON public.users FOR SELECT USING (true);
CREATE POLICY "Enable insert for authenticated users" ON public.users FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Enable update for users based on email" ON public.users FOR UPDATE USING (auth.jwt()->>'email' = email) WITH CHECK (auth.jwt()->>'email' = email);

-- Policies for spot_trades table
CREATE POLICY "Enable read access for owner" ON public.spot_trades FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Enable insert for authenticated users" ON public.spot_trades FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Enable all access for admin users" ON public.spot_trades FOR ALL USING (public.is_admin(auth.uid()));

-- Policies for contract_trades table
CREATE POLICY "Enable read access for owner" ON public.contract_trades FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Enable insert for authenticated users" ON public.contract_trades FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Enable all access for admin users" ON public.contract_trades FOR ALL USING (public.is_admin(auth.uid()));

-- Policies for transactions table
CREATE POLICY "Enable read access for owner" ON public.transactions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Enable insert for authenticated users" ON public.transactions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Enable all access for admin users" ON public.transactions FOR ALL USING (public.is_admin(auth.uid()));

-- Policies for admin_requests table
CREATE POLICY "Enable read for admin users" ON public.admin_requests FOR SELECT USING (public.is_admin(auth.uid()));
CREATE POLICY "Enable insert for authenticated users" ON public.admin_requests FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Enable all access for admin users" ON public.admin_requests FOR ALL USING (public.is_admin(auth.uid()));

-- Policies for withdrawal_addresses table
CREATE POLICY "Enable delete for owner" ON public.withdrawal_addresses FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Enable read access for owner" ON public.withdrawal_addresses FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Enable insert for authenticated users" ON public.withdrawal_addresses FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Enable all access for admin users" ON public.withdrawal_addresses FOR ALL USING (public.is_admin(auth.uid()));

-- Policies for investments table
CREATE POLICY "Enable read access for owner" ON public.investments FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Enable insert for authenticated users" ON public.investments FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Enable all access for admin users" ON public.investments FOR ALL USING (public.is_admin(auth.uid()));

-- Policies for commission_logs table
CREATE POLICY "Enable read access for all users" ON public.commission_logs FOR SELECT USING (auth.uid() = upline_user_id);
CREATE POLICY "Enable all access for authenticated users" ON public.commission_logs FOR ALL USING (public.is_admin(auth.uid()));

-- Helper function to check if a user is an admin
CREATE OR REPLACE FUNCTION public.is_admin(user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.users
    WHERE public.users.id = user_id AND public.users.is_admin = true
  );
END;
$$;

-- RPC function to get all users (admin only)
CREATE OR REPLACE FUNCTION public.get_all_users_for_admin()
RETURNS TABLE(id uuid, username text, email text, registered_at timestamp with time zone, is_test_user boolean, is_frozen boolean, inviter text, invitation_code text)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Only admin can access all users';
  END IF;
  RETURN QUERY SELECT u.id, u.username, u.email, u.created_at as registered_at, u.is_test_user, u.is_frozen, u.inviter, u.invitation_code FROM public.users u;
END;
$$;

-- RPC function to get a specific user's profile (admin or owner)
CREATE OR REPLACE FUNCTION public.get_user_profile_by_id(user_id_input uuid)
RETURNS TABLE(id uuid, username text, email text, registered_at timestamp with time zone, is_test_user boolean, is_frozen boolean, inviter text, invitation_code text, is_admin boolean)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NOT (public.is_admin(auth.uid()) OR auth.uid() = user_id_input) THEN
    RAISE EXCEPTION 'Not authorized to view this profile';
  END IF;
  RETURN QUERY SELECT u.id, u.username, u.email, u.created_at as registered_at, u.is_test_user, u.is_frozen, u.inviter, u.invitation_code, u.is_admin FROM public.users u WHERE u.id = user_id_input;
END;
$$;

-- RPC function to register a new user
CREATE OR REPLACE FUNCTION public.register_new_user(p_email text, p_password text, p_username text, p_inviter_username text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_user_id uuid;
  inviter_id_val uuid;
  new_invitation_code text;
BEGIN
  -- Check if inviter exists
  SELECT id INTO inviter_id_val FROM public.users WHERE username = p_inviter_username;
  IF inviter_id_val IS NULL THEN
    RAISE EXCEPTION 'Inviter not found';
  END IF;

  -- Create user in auth.users
  new_user_id := auth.uid() FROM (INSERT INTO auth.users (email, password) VALUES (p_email, p_password));

  -- Generate a unique invitation code
  LOOP
    new_invitation_code := 'rsf' || substr(md5(random()::text), 0, 7);
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.users WHERE invitation_code = new_invitation_code);
  END LOOP;

  -- Create user profile in public.users
  INSERT INTO public.users (id, username, email, inviter, invitation_code)
  VALUES (new_user_id, p_username, p_email, p_inviter_username, new_invitation_code);
END;
$$;

-- RPC function to distribute commissions up to 3 levels
CREATE OR REPLACE FUNCTION public.distribute_commissions_recursively(p_source_user_id uuid, p_trade_amount numeric)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
    v_inviter_username TEXT;
    v_upline_user_id UUID;
    v_source_username TEXT;
    v_commission_rate NUMERIC;
    v_level INT := 1;
BEGIN
    SELECT username INTO v_source_username FROM public.users WHERE id = p_source_user_id;
    SELECT inviter INTO v_inviter_username FROM public.users WHERE id = p_source_user_id;

    WHILE v_inviter_username IS NOT NULL AND v_level <= 3 LOOP
        SELECT id INTO v_upline_user_id FROM public.users WHERE username = v_inviter_username;
        IF v_upline_user_id IS NULL THEN
            EXIT;
        END IF;

        v_commission_rate := CASE v_level
                                WHEN 1 THEN 0.08
                                WHEN 2 THEN 0.05
                                WHEN 3 THEN 0.02
                                ELSE 0
                            END;

        IF v_commission_rate > 0 THEN
            INSERT INTO public.commission_logs (upline_user_id, source_user_id, source_username, source_level, trade_amount, commission_rate, commission_amount)
            VALUES (v_upline_user_id, p_source_user_id, v_source_username, v_level, p_trade_amount, v_commission_rate, p_trade_amount * v_commission_rate);
        END IF;

        v_level := v_level + 1;
        SELECT inviter INTO v_inviter_username FROM public.users WHERE id = v_upline_user_id;
    END LOOP;
END;
$$;


-- RPC function to get a user's downline up to 3 levels
CREATE OR REPLACE FUNCTION public.get_user_downline(p_user_id uuid)
RETURNS TABLE(username text, level int, registered_at timestamp with time zone)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    WITH RECURSIVE downline_cte AS (
        SELECT u.username as member_username, u.inviter, 1 as level, u.created_at
        FROM public.users u
        WHERE u.inviter = (SELECT u2.username FROM public.users u2 WHERE u2.id = p_user_id)

        UNION ALL

        SELECT u.username, u.inviter, d.level + 1, u.created_at
        FROM public.users u
        JOIN downline_cte d ON u.inviter = d.member_username
        WHERE d.level < 3
    )
    SELECT member_username, level, created_at FROM downline_cte;
END;
$$;


-- Initial Data Seeding --
-- Create the admin user
DO $$
DECLARE
  admin_user_id uuid;
BEGIN
  -- Create the authentication user for 'admin'
  INSERT INTO auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, recovery_token, recovery_sent_at, last_sign_in_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, confirmation_token, email_change, email_change_sent_at, confirmed_at)
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
      NULL,
      NOW()
  ) RETURNING id INTO admin_user_id;

  -- Create the corresponding profile in the public 'users' table
  INSERT INTO public.users (id, username, email, is_admin, is_test_user, invitation_code)
  VALUES (
      admin_user_id,
      'admin',
      'admin@rsf.app',
      true, -- Set the is_admin flag to true
      true, -- Set as test user to have initial funds for demonstration
      'ADMINCODE' -- Give admin a predictable invitation code
  );
END $$;
