
-- Drop existing tables and types if they exist, in reverse order of dependency
DROP TABLE IF EXISTS public.commission_logs;
DROP TABLE IF EXISTS public.investments;
DROP TABLE IF EXISTS public.spot_trades;
DROP TABLE IF EXISTS public.contract_trades;
DROP TABLE IF EXISTS public.transactions;
DROP TABLE IF EXISTS public.withdrawal_addresses;
DROP TABLE IF EXISTS public.admin_requests;
DROP TABLE IF EXISTS public.users;


-- Create the users table to store public user data
CREATE TABLE public.users (
    id UUID PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    is_admin BOOLEAN DEFAULT FALSE,
    is_test_user BOOLEAN DEFAULT FALSE,
    is_frozen BOOLEAN DEFAULT FALSE,
    inviter_id UUID REFERENCES public.users(id),
    invitation_code TEXT UNIQUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT users_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Create a trigger function to generate a unique invitation code for new users
CREATE OR REPLACE FUNCTION public.generate_invitation_code()
RETURNS TRIGGER AS $$
BEGIN
    NEW.invitation_code := substr(md5(random()::text), 0, 9);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Attach the trigger to the users table
CREATE TRIGGER on_new_user_before_insert
BEFORE INSERT ON public.users
FOR EACH ROW
EXECUTE FUNCTION public.generate_invitation_code();


-- Financial transactions table
CREATE TABLE public.transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id),
    type TEXT NOT NULL CHECK (type IN ('deposit', 'withdrawal', 'adjustment')),
    asset TEXT NOT NULL,
    amount NUMERIC(20, 8) NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('pending', 'approved', 'rejected')),
    address TEXT,
    transaction_hash TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);


-- Contract trades table
CREATE TABLE public.contract_trades (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id),
    trading_pair TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('buy', 'sell')),
    amount NUMERIC(20, 8) NOT NULL,
    entry_price NUMERIC(20, 8) NOT NULL,
    settlement_time TIMESTAMPTZ NOT NULL,
    period INT NOT NULL,
    profit_rate NUMERIC(5, 4) NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('active', 'settled')),
    settlement_price NUMERIC(20, 8),
    outcome TEXT CHECK (outcome IN ('win', 'loss')),
    profit NUMERIC(20, 8),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Spot trades table
CREATE TABLE public.spot_trades (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id),
    trading_pair TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('buy', 'sell')),
    base_asset TEXT NOT NULL,
    quote_asset TEXT NOT NULL,
    amount NUMERIC(20, 8) NOT NULL,
    total NUMERIC(20, 8) NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('filled', 'cancelled')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);


-- Commission logs table
CREATE TABLE public.commission_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    upline_user_id UUID NOT NULL REFERENCES public.users(id),
    source_user_id UUID NOT NULL REFERENCES public.users(id),
    source_username TEXT NOT NULL,
    source_level INT NOT NULL,
    trade_amount NUMERIC(20, 8) NOT NULL,
    commission_rate NUMERIC(5, 4) NOT NULL,
    commission_amount NUMERIC(20, 8) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Investment records table
CREATE TABLE public.investments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id),
    product_name TEXT NOT NULL,
    amount NUMERIC(20, 8) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);


-- Withdrawal addresses table
CREATE TABLE public.withdrawal_addresses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id),
    name TEXT NOT NULL,
    address TEXT NOT NULL,
    network TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Password reset and other admin requests table
CREATE TABLE public.admin_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id),
    type TEXT NOT NULL DEFAULT 'password_reset',
    new_password TEXT,
    status TEXT NOT NULL DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT NOW()
);


-- ========== ROW LEVEL SECURITY (RLS) POLICIES ==========

-- Enable RLS for all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contract_trades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.spot_trades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.commission_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.investments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.withdrawal_addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_requests ENABLE ROW LEVEL SECURITY;

-- Policies for users table
CREATE POLICY "Allow admins full access" ON public.users FOR ALL TO authenticated USING ((SELECT is_admin FROM public.users WHERE id = auth.uid()) = true);
CREATE POLICY "Allow users to view their own data" ON public.users FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "Allow users to view their inviter/downline basic info" ON public.users FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND (u.inviter_id = public.users.id OR public.users.inviter_id = u.id)));

-- Policies for other tables (general user access)
CREATE POLICY "Allow users to access their own records" ON public.transactions FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Allow users to access their own records" ON public.contract_trades FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Allow users to access their own records" ON public.spot_trades FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Allow users to access their own records" ON public.investments FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Allow users to access their own records" ON public.withdrawal_addresses FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Allow users to access their own records" ON public.admin_requests FOR ALL USING (auth.uid() = user_id);

-- Policy for commission_logs (Users can only see commissions they earned)
CREATE POLICY "Allow users to access their own records" ON public.commission_logs FOR ALL USING (auth.uid() = upline_user_id);

-- Admins can bypass all RLS policies
ALTER TABLE public.users BYPASS ROW LEVEL SECURITY;
ALTER TABLE public.transactions BYPASS ROW LEVEL SECURITY;
ALTER TABLE public.contract_trades BYPASS ROW LEVEL SECURITY;
ALTER TABLE public.spot_trades BYPASS ROW LEVEL SECURITY;
ALTER TABLE public.commission_logs BYPASS ROW LEVEL SECURITY;
ALTER TABLE public.investments BYPASS ROW LEVEL SECURITY;
ALTER TABLE public.withdrawal_addresses BYPASS ROW LEVEL SECURITY;
ALTER TABLE public.admin_requests BYPASS ROW LEVEL SECURITY;


-- ========== DATABASE FUNCTIONS (RPC) ==========

-- Function to get a user's full downline (recursive)
CREATE OR REPLACE FUNCTION public.get_user_downline(p_user_id UUID)
RETURNS TABLE(username TEXT, level INT, registered_at TIMESTAMPTZ) AS $$
BEGIN
    RETURN QUERY
    WITH RECURSIVE downline_cte AS (
        SELECT id, username, inviter_id, created_at, 1 AS level
        FROM public.users
        WHERE inviter_id = p_user_id

        UNION ALL

        SELECT u.id, u.username, u.inviter_id, u.created_at, d.level + 1
        FROM public.users u
        JOIN downline_cte d ON u.inviter_id = d.id
        WHERE d.level < 3 -- Limit to 3 levels
    )
    SELECT d.username, d.level, d.created_at
    FROM downline_cte d;
END;
$$ LANGUAGE plpgsql;


-- Function to handle new user registration
CREATE OR REPLACE FUNCTION public.register_new_user(p_email TEXT, p_password TEXT, p_username TEXT, p_inviter_username TEXT)
RETURNS void AS $$
DECLARE
    new_user_id UUID;
    v_inviter_id UUID;
BEGIN
    -- Find the inviter's ID
    SELECT id INTO v_inviter_id FROM public.users WHERE username = p_inviter_username;
    IF v_inviter_id IS NULL THEN
        RAISE EXCEPTION 'Invalid invitation code (inviter not found)';
    END IF;

    -- Create the user in auth.users
    new_user_id := (SELECT id FROM auth.users WHERE email = p_email);
    IF new_user_id IS NULL THEN
         INSERT INTO auth.users (id, email, encrypted_password, aud, role, created_at, updated_at, email_confirmed_at)
         VALUES (uuid_generate_v4(), p_email, crypt(p_password, gen_salt('bf')), 'authenticated', 'authenticated', NOW(), NOW(), NOW())
         RETURNING id INTO new_user_id;
    ELSE
         RAISE EXCEPTION 'User with this email already exists';
    END IF;

    -- Create the profile in public.users
    INSERT INTO public.users (id, username, email, inviter_id)
    VALUES (new_user_id, p_username, p_email, v_inviter_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- Function to distribute commissions up to 3 levels
CREATE OR REPLACE FUNCTION public.distribute_commissions_recursively(p_source_user_id UUID, p_trade_amount NUMERIC)
RETURNS void AS $$
DECLARE
    commission_rates NUMERIC[] := ARRAY[0.08, 0.05, 0.02];
    current_user_id UUID := p_source_user_id;
    current_inviter_id UUID;
    source_user_info RECORD;
    level INT := 1;
BEGIN
    SELECT username INTO source_user_info FROM public.users WHERE id = p_source_user_id;

    WHILE level <= 3 LOOP
        -- Find the inviter of the current user
        SELECT inviter_id INTO current_inviter_id FROM public.users WHERE id = current_user_id;

        -- If there is no inviter, or we've reached the top, stop.
        IF current_inviter_id IS NULL THEN
            EXIT;
        END IF;

        -- Calculate and insert commission for the inviter
        INSERT INTO public.commission_logs (
            upline_user_id,
            source_user_id,
            source_username,
            source_level,
            trade_amount,
            commission_rate,
            commission_amount
        )
        VALUES (
            current_inviter_id,
            p_source_user_id,
            source_user_info.username,
            level,
            p_trade_amount,
            commission_rates[level],
            p_trade_amount * commission_rates[level]
        );

        -- Move up to the next level
        current_user_id := current_inviter_id;
        level := level + 1;
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- Helper functions for admins to get user data bypassing RLS
CREATE OR REPLACE FUNCTION public.get_all_users_for_admin()
RETURNS SETOF public.users AS $$
BEGIN
    IF (SELECT is_admin FROM public.users WHERE id = auth.uid()) THEN
        RETURN QUERY SELECT * FROM public.users;
    ELSE
        RAISE EXCEPTION 'Only admins can perform this action';
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.get_user_profile_by_id(user_id_input UUID)
RETURNS SETOF public.users AS $$
BEGIN
    -- Allow any authenticated user to fetch a profile by ID
    -- RLS on the table itself will ultimately control what they can see,
    -- but this function allows the query to proceed.
    -- The SECURITY DEFINER context with the admin check provides the bypass.
    IF (SELECT is_admin FROM public.users WHERE id = auth.uid()) THEN
      RETURN QUERY SELECT * FROM public.users WHERE id = user_id_input;
    ELSE
      -- A non-admin can only get their own profile this way
      IF auth.uid() = user_id_input THEN
        RETURN QUERY SELECT * FROM public.users WHERE id = user_id_input;
      ELSE
         RAISE EXCEPTION 'You are not authorized to view this profile.';
      END IF;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;



-- ========== INITIAL DATA SEEDING ==========

-- Create a preset Admin user
DO $$
DECLARE
    admin_user_id UUID;
BEGIN
    -- Insert into auth.users and capture the ID
    INSERT INTO auth.users (id, email, encrypted_password, aud, role, email_confirmed_at, created_at, updated_at)
    VALUES (uuid_generate_v4(), 'admin@rsf.app', crypt('password', gen_salt('bf')), 'authenticated', 'authenticated', NOW(), NOW(), NOW())
    ON CONFLICT (email) DO NOTHING
    RETURNING id INTO admin_user_id;

    -- Use the captured ID to insert into public.users
    IF admin_user_id IS NOT NULL THEN
        INSERT INTO public.users (id, username, email, is_admin, is_test_user)
        VALUES (admin_user_id, 'admin', 'admin@rsf.app', true, true)
        ON CONFLICT (id) DO NOTHING;
    END IF;
END $$;
