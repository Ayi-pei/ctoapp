-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA extensions;

-- Enable crypt() function for password hashing
CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA extensions;

-- Create the users table
CREATE TABLE public.users (
    id UUID PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE,
    inviter_id UUID REFERENCES public.users(id),
    is_admin BOOLEAN DEFAULT FALSE,
    is_test_user BOOLEAN DEFAULT FALSE,
    is_frozen BOOLEAN DEFAULT FALSE,
    invitation_code TEXT UNIQUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT fk_auth_users FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE
);
COMMENT ON TABLE public.users IS 'Stores public user profile information.';
COMMENT ON COLUMN public.users.is_frozen IS 'If true, the user account is suspended.';
COMMENT ON COLUMN public.users.invitation_code IS 'Unique code for inviting other users.';

-- Create the transactions table for deposits and withdrawals
CREATE TABLE public.transactions (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id),
    type TEXT NOT NULL, -- 'deposit', 'withdrawal', 'adjustment'
    asset TEXT NOT NULL,
    amount NUMERIC(30, 10) NOT NULL,
    status TEXT NOT NULL, -- 'pending', 'approved', 'rejected'
    address TEXT, -- For withdrawals
    transaction_hash TEXT, -- For deposits
    created_at TIMESTAMPTZ DEFAULT NOW()
);
COMMENT ON TABLE public.transactions IS 'Manages financial transactions like deposits, withdrawals, and admin adjustments.';
COMMENT ON COLUMN public.transactions.type IS 'The type of transaction (deposit, withdrawal, adjustment).';
COMMENT ON COLUMN public.transactions.status IS 'The current status of the transaction (pending, approved, rejected).';

-- Create the contract_trades table
CREATE TABLE public.contract_trades (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id),
    trading_pair TEXT NOT NULL,
    type TEXT NOT NULL, -- 'buy' or 'sell'
    amount NUMERIC(30, 10) NOT NULL,
    entry_price NUMERIC(30, 10) NOT NULL,
    settlement_time TIMESTAMPTZ NOT NULL,
    period INT NOT NULL, -- in seconds
    profit_rate NUMERIC(5, 4) NOT NULL,
    status TEXT NOT NULL, -- 'active', 'settled'
    settlement_price NUMERIC(30, 10),
    outcome TEXT, -- 'win', 'loss'
    profit NUMERIC(30, 10),
    created_at TIMESTAMPTZ DEFAULT NOW()
);
COMMENT ON TABLE public.contract_trades IS 'Stores user contract (binary options) trades.';

-- Create the spot_trades table
CREATE TABLE public.spot_trades (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id),
    trading_pair TEXT NOT NULL,
    type TEXT NOT NULL, -- 'buy' or 'sell'
    base_asset TEXT NOT NULL,
    quote_asset TEXT NOT NULL,
    amount NUMERIC(30, 10) NOT NULL, -- Amount in base_asset
    total NUMERIC(30, 10) NOT NULL, -- Amount in quote_asset
    status TEXT NOT NULL, -- 'filled', 'cancelled'
    created_at TIMESTAMPTZ DEFAULT NOW()
);
COMMENT ON TABLE public.spot_trades IS 'Stores user spot market trades.';

-- Create the admin_requests table for password resets
CREATE TABLE public.admin_requests (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id),
    type TEXT NOT NULL DEFAULT 'password_reset',
    new_password TEXT,
    status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
    created_at TIMESTAMPTZ DEFAULT NOW()
);
COMMENT ON TABLE public.admin_requests IS 'Handles administrative requests like password resets.';

-- Create the investments table
CREATE TABLE public.investments (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id),
    product_name TEXT NOT NULL,
    amount NUMERIC(30, 10) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
COMMENT ON TABLE public.investments IS 'Stores user investments in financial products.';

-- Create the withdrawal_addresses table
CREATE TABLE public.withdrawal_addresses (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id),
    name TEXT NOT NULL,
    address TEXT NOT NULL,
    network TEXT NOT NULL DEFAULT 'USDT-TRC20',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, address)
);
COMMENT ON TABLE public.withdrawal_addresses IS 'Stores user saved withdrawal addresses.';

-- Create the commission_logs table
CREATE TABLE public.commission_logs (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    upline_user_id UUID NOT NULL REFERENCES public.users(id),
    source_user_id UUID NOT NULL REFERENCES public.users(id),
    source_username TEXT NOT NULL,
    source_level INT NOT NULL,
    trade_amount NUMERIC(30, 10) NOT NULL,
    commission_rate NUMERIC(5, 4) NOT NULL,
    commission_amount NUMERIC(30, 10) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
COMMENT ON TABLE public.commission_logs IS 'Logs all generated commission payouts.';

-- Create the investment_products table
CREATE TABLE public.investment_products (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    name TEXT NOT NULL,
    description TEXT,
    min_amount NUMERIC(30, 10),
    max_amount NUMERIC(30, 10),
    profit_rate NUMERIC(5, 4),
    period INT, -- in days
    is_active BOOLEAN DEFAULT TRUE
);
COMMENT ON TABLE public.investment_products IS 'Stores the available investment products.';

-- Create the investment_settings table
CREATE TABLE public.investment_settings (
    id INT PRIMARY KEY DEFAULT 1, -- Singleton table
    is_investment_enabled BOOLEAN DEFAULT TRUE,
    global_min_investment NUMERIC(30, 10),
    global_max_investment NUMERIC(30, 10),
    CONSTRAINT investment_settings_singleton CHECK (id = 1)
);
COMMENT ON TABLE public.investment_settings IS 'Global settings for the investment feature.';


-- Indexes for performance
CREATE INDEX ON public.users (inviter_id);
CREATE INDEX ON public.users (invitation_code);
CREATE INDEX ON public.transactions (user_id, created_at DESC);
CREATE INDEX ON public.contract_trades (user_id, created_at DESC);
CREATE INDEX ON public.spot_trades (user_id, created_at DESC);
CREATE INDEX ON public.commission_logs (upline_user_id, created_at DESC);
CREATE INDEX ON public.withdrawal_addresses (user_id);
CREATE INDEX ON public.investments (user_id);
CREATE INDEX ON public.admin_requests (status);

-- Function to generate a random invitation code
CREATE OR REPLACE FUNCTION public.generate_invitation_code()
RETURNS TEXT AS $$
DECLARE
    new_code TEXT;
    is_duplicate BOOLEAN;
BEGIN
    LOOP
        new_code := (
            SELECT string_agg(ch, '')
            FROM (
                SELECT (array['A','B','C','D','E','F','G','H','J','K','L','M','N','P','Q','R','S','T','U','V','W','X','Y','Z','2','3','4','5','6','7','8','9'])[floor(random() * 32 + 1)]
                FROM generate_series(1, 8)
            ) AS ch
        );
        SELECT EXISTS (SELECT 1 FROM public.users WHERE invitation_code = new_code) INTO is_duplicate;
        EXIT WHEN NOT is_duplicate;
    END LOOP;
    RETURN new_code;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-generate invitation code for new users
CREATE OR REPLACE FUNCTION public.set_invitation_code()
RETURNS TRIGGER AS $$
BEGIN
    NEW.invitation_code := public.generate_invitation_code();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_new_user_set_invitation_code
BEFORE INSERT ON public.users
FOR EACH ROW
EXECUTE FUNCTION public.set_invitation_code();

-- Function to check for frozen account status, raises an exception if frozen.
CREATE OR REPLACE FUNCTION public.check_account_active(p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM public.users 
        WHERE id = p_user_id AND is_frozen = TRUE
    ) THEN
        RAISE EXCEPTION 'ACCOUNT_FROZEN' USING 
            MESSAGE = '检测账户状态异常',
            DETAIL = '此账户执行数据异常，请联系工作人员协助支持';
    END IF;
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;
COMMENT ON FUNCTION public.check_account_active(UUID) IS 'Checks if a user account is frozen. Raises an exception if it is.';


-- Function to register a new user, with invitation code validation and error handling
CREATE OR REPLACE FUNCTION public.register_new_user(
    p_email TEXT, 
    p_password TEXT, 
    p_username TEXT, 
    p_invitation_code TEXT
)
RETURNS json AS $$
DECLARE
    new_user_id UUID;
    v_inviter_id UUID;
BEGIN
    -- Find the inviter using the provided invitation code
    SELECT u.id INTO v_inviter_id 
    FROM public.users u 
    WHERE u.invitation_code = p_invitation_code;
    
    IF v_inviter_id IS NULL THEN
        RETURN json_build_object(
            'status', 'error',
            'message', '无效的邀请码'
        );
    END IF;

    -- Create the user in auth.users
    new_user_id := extensions.uuid_generate_v4();
    
    INSERT INTO auth.users (
        id, aud, role, email, 
        encrypted_password, email_confirmed_at, 
        created_at, updated_at
    ) VALUES (
        new_user_id,
        'authenticated',
        'authenticated',
        p_email,
        crypt(p_password, gen_salt('bf')),
        NOW(),
        NOW(),
        NOW()
    );

    -- Create the corresponding profile in public.users
    INSERT INTO public.users (id, username, email, inviter_id)
    VALUES (new_user_id, p_username, p_email, v_inviter_id);

    RETURN json_build_object(
        'status', 'success',
        'user_id', new_user_id,
        'message', '用户注册成功'
    );
EXCEPTION
    WHEN unique_violation THEN
        RETURN json_build_object(
            'status', 'error',
            'message', '邮箱或用户名已存在'
        );
    WHEN others THEN
        RETURN json_build_object(
            'status', 'error',
            'message', '注册错误: ' || SQLERRM
        );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
COMMENT ON FUNCTION public.register_new_user(TEXT, TEXT, TEXT, TEXT) IS 'Registers a new user, links them to an inviter, and returns a JSON result.';


-- Function to distribute commissions up to 3 levels.
CREATE OR REPLACE FUNCTION public.distribute_commissions(
    p_source_user_id UUID, 
    p_trade_amount NUMERIC
)
RETURNS void AS $$
DECLARE
    commission_rates NUMERIC[] := ARRAY[0.08, 0.05, 0.02];
    current_user_id UUID := p_source_user_id;
    current_inviter_id UUID;
    source_username TEXT;
    level INT := 1;
BEGIN
    -- Get the source username once
    SELECT username INTO source_username 
    FROM public.users 
    WHERE id = p_source_user_id;

    -- Loop up to 3 levels of inviters, with a hard boundary check
    WHILE level <= LEAST(array_length(commission_rates, 1), 3) LOOP
        -- Find the inviter of the current user
        SELECT inviter_id INTO current_inviter_id 
        FROM public.users 
        WHERE id = current_user_id;

        -- Exit the loop if there's no more inviter
        EXIT WHEN current_inviter_id IS NULL;
        
        -- Check if the upline user is frozen
        PERFORM public.check_account_active(current_inviter_id);

        -- Insert the commission log
        INSERT INTO public.commission_logs (
            upline_user_id, source_user_id, source_username, source_level,
            trade_amount, commission_rate, commission_amount
        ) VALUES (
            current_inviter_id, p_source_user_id, source_username, level,
            p_trade_amount, commission_rates[level], p_trade_amount * commission_rates[level]
        );

        -- Move up to the next level
        current_user_id := current_inviter_id;
        level := level + 1;
    END LOOP;
EXCEPTION
    WHEN SQLSTATE 'P0001' THEN -- Catches 'ACCOUNT_FROZEN' custom exception
        -- If an upline user is frozen, we simply stop the commission chain for that branch.
        -- This is a silent failure by design to not interrupt the trader's main action.
        RETURN;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
COMMENT ON FUNCTION public.distribute_commissions(UUID, NUMERIC) IS 'Calculates and distributes up to 3 levels of commission: LV1 8%, LV2 5%, LV3 2%. Stops if an upline user is frozen.';

-- Function to get all users (for admin)
CREATE OR REPLACE FUNCTION public.admin_get_all_users()
RETURNS SETOF public.users AS $$
BEGIN
    RETURN QUERY SELECT * FROM public.users;
END;
$$ LANGUAGE plpgsql SECURITY VOLATILE;

-- Function to get a user's multi-level downline team.
CREATE OR REPLACE FUNCTION public.get_user_downline(p_user_id UUID)
RETURNS TABLE(id UUID, username TEXT, level INT, created_at TIMESTAMPTZ) AS $$
BEGIN
    RETURN QUERY
    WITH RECURSIVE downline AS (
        SELECT u.id, u.username, u.created_at, u.inviter_id, 1 AS level
        FROM public.users u
        WHERE u.inviter_id = p_user_id

        UNION ALL

        SELECT u.id, u.username, u.created_at, u.inviter_id, d.level + 1
        FROM public.users u
        JOIN downline d ON u.inviter_id = d.id
        WHERE d.level < 3
    )
    SELECT d.id, d.username, d.level, d.created_at FROM downline d;
END;
$$ LANGUAGE plpgsql;
COMMENT ON FUNCTION public.get_user_downline(UUID) IS 'Retrieves a user''s downline team, up to 3 levels deep.';

-- Admin-specific function to get any user's team.
CREATE OR REPLACE FUNCTION public.admin_get_user_team(p_user_id UUID)
RETURNS TABLE(id UUID, username TEXT, level INT, created_at TIMESTAMPTZ) AS $$
BEGIN
    -- This function intentionally has no security checks,
    -- as it's meant to be called by an admin with BYPASSRLS.
    RETURN QUERY SELECT * FROM public.get_user_downline(p_user_id);
END;
$$ LANGUAGE plpgsql;


-- RLS Policies
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contract_trades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.spot_trades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.investments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.withdrawal_addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.commission_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.investment_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.investment_settings ENABLE ROW LEVEL SECURITY;

-- Admins can do anything
CREATE POLICY "Allow admin full access" ON public.users FOR ALL USING (public.is_admin(auth.uid()));
CREATE POLICY "Allow admin full access" ON public.transactions FOR ALL USING (public.is_admin(auth.uid()));
CREATE POLICY "Allow admin full access" ON public.contract_trades FOR ALL USING (public.is_admin(auth.uid()));
CREATE POLICY "Allow admin full access" ON public.spot_trades FOR ALL USING (public.is_admin(auth.uid()));
CREATE POLICY "Allow admin full access" ON public.admin_requests FOR ALL USING (public.is_admin(auth.uid()));
CREATE POLICY "Allow admin full access" ON public.investments FOR ALL USING (public.is_admin(auth.uid()));
CREATE POLICY "Allow admin full access" ON public.withdrawal_addresses FOR ALL USING (public.is_admin(auth.uid()));
CREATE POLICY "Allow admin full access" ON public.commission_logs FOR ALL USING (public.is_admin(auth.uid()));
CREATE POLICY "Allow admin full access on investment_products" ON public.investment_products FOR ALL USING (public.is_admin(auth.uid()));
CREATE POLICY "Allow admin full access on investment_settings" ON public.investment_settings FOR ALL USING (public.is_admin(auth.uid()));


-- Users can view their own profiles and their direct inviter
CREATE POLICY "Allow user to view their inviter" ON public.users FOR SELECT USING (id = (SELECT inviter_id FROM public.users WHERE id = auth.uid()));

-- Users can manage their own data
CREATE POLICY "Allow user to manage own transactions" ON public.transactions FOR ALL USING (user_id = auth.uid());
CREATE POLICY "Allow user to manage own contract trades" ON public.contract_trades FOR ALL USING (user_id = auth.uid());
CREATE POLICY "Allow user to manage own spot trades" ON public.spot_trades FOR ALL USING (user_id = auth.uid());
CREATE POLICY "Allow user to manage own admin requests" ON public.admin_requests FOR ALL USING (user_id = auth.uid());
CREATE POLICY "Allow user to manage own investments" ON public.investments FOR ALL USING (user_id = auth.uid());
CREATE POLICY "Allow user to manage own withdrawal addresses" ON public.withdrawal_addresses FOR ALL USING (user_id = auth.uid());

-- Users can view their own commission logs
CREATE POLICY "Allow user to view own commission logs" ON public.commission_logs FOR SELECT USING (upline_user_id = auth.uid());

-- Users can view products and settings
CREATE POLICY "Allow users to view investment products" ON public.investment_products FOR SELECT USING (true);
CREATE POLICY "Allow users to view investment settings" ON public.investment_settings FOR SELECT USING (true);


-- Helper function to check for admin role
CREATE OR REPLACE FUNCTION public.is_admin(p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    is_admin_user BOOLEAN;
BEGIN
    SELECT u.is_admin INTO is_admin_user
    FROM public.users u
    WHERE u.id = p_user_id;
    RETURN COALESCE(is_admin_user, FALSE);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- Give the 'postgres' user (used by Supabase internally for admin tasks) BYPASSRLS
-- This is the crucial step that allows admin RPC calls to bypass RLS.
ALTER USER postgres SET "request.jwt.claims" = '{"role":"postgres"}';
ALTER ROLE postgres BYPASSRLS;

-- Ensure authenticated users can call the necessary functions
GRANT EXECUTE ON FUNCTION public.register_new_user(TEXT, TEXT, TEXT, TEXT) TO anon_key, authenticated;
GRANT EXECUTE ON FUNCTION public.distribute_commissions(UUID, NUMERIC) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_downline(UUID) TO authenticated;

-- Grant admin-only functions to the postgres role
GRANT EXECUTE ON FUNCTION public.admin_get_all_users() TO postgres;
GRANT EXECUTE ON FUNCTION public.admin_get_user_team(UUID) TO postgres;
