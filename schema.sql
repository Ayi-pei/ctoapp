-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Custom Types for Enums
CREATE TYPE transaction_type AS ENUM ('deposit', 'withdrawal', 'adjustment');
CREATE TYPE transaction_status AS ENUM ('pending', 'approved', 'rejected');
CREATE TYPE trade_type AS ENUM ('buy', 'sell');
CREATE TYPE spot_trade_status AS ENUM ('filled', 'cancelled');
CREATE TYPE contract_trade_status AS ENUM ('active', 'settled');
CREATE TYPE contract_outcome AS ENUM ('win', 'loss');
CREATE TYPE request_type AS ENUM ('password_reset');
CREATE TYPE request_status AS ENUM ('pending', 'approved', 'rejected');


-- 1. Users Table
-- This table stores public user data and is linked to the private auth.users table.
CREATE TABLE users (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username text UNIQUE NOT NULL,
  email text UNIQUE,
  is_admin boolean DEFAULT false,
  is_test_user boolean DEFAULT false,
  is_frozen boolean DEFAULT false,
  inviter text,
  registered_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  invitation_code text UNIQUE
);

-- Policy: Allow users to read their own profile.
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow individual user read access" ON users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Allow admins full access" ON users FOR ALL USING (
  (SELECT is_admin FROM public.users WHERE id = auth.uid()) = true
);


-- 2. Transactions Table
-- For deposits, withdrawals, and admin balance adjustments.
CREATE TABLE transactions (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type transaction_type NOT NULL,
  asset text NOT NULL,
  amount numeric NOT NULL,
  address text, -- For withdrawals
  transaction_hash text, -- For deposits
  status transaction_status NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Policy: Allow users to see their own transactions, and admins to see all.
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow individual user read access" ON transactions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Allow user to create their own transaction requests" ON transactions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Allow admins full access" ON transactions FOR ALL USING (
  (SELECT is_admin FROM public.users WHERE id = auth.uid()) = true
);


-- 3. Spot Trades Table
CREATE TABLE spot_trades (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  trading_pair text NOT NULL,
  order_type text DEFAULT 'spot'::text NOT NULL,
  type trade_type NOT NULL,
  base_asset text NOT NULL,
  quote_asset text NOT NULL,
  amount numeric NOT NULL,
  total numeric NOT NULL,
  status spot_trade_status NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Policy: Allow users to manage their own spot trades, and admins to see all.
ALTER TABLE spot_trades ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow individual user access" ON spot_trades FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Allow admins full access" ON spot_trades FOR ALL USING (
  (SELECT is_admin FROM public.users WHERE id = auth.uid()) = true
);


-- 4. Contract Trades Table
CREATE TABLE contract_trades (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  trading_pair text NOT NULL,
  order_type text DEFAULT 'contract'::text NOT NULL,
  type trade_type NOT NULL,
  amount numeric NOT NULL,
  entry_price numeric NOT NULL,
  settlement_time timestamp with time zone NOT NULL,
  period integer NOT NULL,
  profit_rate numeric NOT NULL,
  status contract_trade_status NOT NULL,
  settlement_price numeric,
  outcome contract_outcome,
  profit numeric,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Policy: Allow users to manage their own contract trades, and admins to see all.
ALTER TABLE contract_trades ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow individual user access" ON contract_trades FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Allow admins full access" ON contract_trades FOR ALL USING (
  (SELECT is_admin FROM public.users WHERE id = auth.uid()) = true
);


-- 5. Withdrawal Addresses Table
CREATE TABLE withdrawal_addresses (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name text NOT NULL,
  address text NOT NULL UNIQUE,
  network text NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Policy: Allow users to manage their own addresses.
ALTER TABLE withdrawal_addresses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow individual user access" ON withdrawal_addresses FOR ALL USING (auth.uid() = user_id);


-- 6. Investments Table
CREATE TABLE investments (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  product_name text NOT NULL,
  amount numeric NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Policy: Allow users to manage their own investments.
ALTER TABLE investments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow individual user access" ON investments FOR ALL USING (auth.uid() = user_id);


-- 7. Commission Logs Table
CREATE TABLE commission_logs (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    upline_user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    source_user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    source_username text,
    source_level integer NOT NULL,
    trade_amount numeric NOT NULL,
    commission_rate numeric NOT NULL,
    commission_amount numeric NOT NULL,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Policy: Allow users to see their own commission logs.
ALTER TABLE commission_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow individual user read access" ON commission_logs FOR SELECT USING (auth.uid() = upline_user_id);


-- 8. Admin Requests (e.g., password resets)
CREATE TABLE admin_requests (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type request_type NOT NULL,
    new_password text,
    status request_status DEFAULT 'pending'::request_status NOT NULL,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Policy: Allow users to create requests, and admins to see all.
ALTER TABLE admin_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow user to create their own requests" ON admin_requests FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Allow admins full access" ON admin_requests FOR ALL USING (
  (SELECT is_admin FROM public.users WHERE id = auth.uid()) = true
);
