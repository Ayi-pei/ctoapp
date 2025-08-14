--
-- This script contains the full schema and initial data for the TradeFlow application.
-- Execute this script in your Supabase SQL Editor to set up the database.
--

-- 1. Enable UUID extension
create extension if not exists "uuid-ossp" with schema "extensions";

-- 2. Create Tables

-- public.users table
create table if not exists public.users (
    id uuid not null primary key,
    username text not null,
    email text,
    is_admin boolean not null default false,
    is_test_user boolean not null default false,
    is_frozen boolean not null default false,
    inviter text,
    registered_at timestamp with time zone,
    invitation_code text,
    constraint users_username_key unique (username),
    constraint users_email_key unique (email),
    constraint users_invitation_code_key unique (invitation_code),
    constraint users_id_fkey foreign key (id) references auth.users (id) on delete cascade
);
comment on table public.users is 'User profile and application-specific data.';

-- public.transactions table
create table if not exists public.transactions (
    id uuid not null default uuid_generate_v4() primary key,
    user_id uuid not null,
    type text not null,
    asset text not null,
    amount numeric not null,
    status text not null,
    created_at timestamp with time zone not null default now(),
    address text,
    transaction_hash text,
    constraint transactions_user_id_fkey foreign key (user_id) references public.users (id)
);
comment on table public.transactions is 'Records deposits, withdrawals, and admin adjustments.';

-- public.contract_trades table
create table if not exists public.contract_trades (
    id uuid not null default uuid_generate_v4() primary key,
    user_id uuid not null,
    trading_pair text not null,
    order_type text not null,
    type text not null,
    amount numeric not null,
    entry_price numeric not null,
    settlement_time timestamp with time zone not null,
    period integer not null,
    profit_rate numeric not null,
    status text not null,
    settlement_price numeric,
    outcome text,
    profit numeric,
    created_at timestamp with time zone not null default now(),
    constraint contract_trades_user_id_fkey foreign key (user_id) references public.users (id)
);
comment on table public.contract_trades is 'Stores records of user contract trades.';

-- public.spot_trades table
create table if not exists public.spot_trades (
    id uuid not null default uuid_generate_v4() primary key,
    user_id uuid not null,
    trading_pair text not null,
    order_type text not null,
    type text not null,
    base_asset text not null,
    quote_asset text not null,
    amount numeric not null,
    total numeric not null,
    status text not null,
    created_at timestamp with time zone not null default now(),
    constraint spot_trades_user_id_fkey foreign key (user_id) references public.users (id)
);
comment on table public.spot_trades is 'Stores records of user spot trades.';

-- public.investments table
create table if not exists public.investments (
    id uuid not null default uuid_generate_v4() primary key,
    user_id uuid not null,
    product_name text not null,
    amount numeric not null,
    created_at timestamp with time zone not null default now(),
    constraint investments_user_id_fkey foreign key (user_id) references public.users (id)
);
comment on table public.investments is 'Stores user investments in financial products.';

-- public.withdrawal_addresses table
create table if not exists public.withdrawal_addresses (
    id uuid not null default uuid_generate_v4() primary key,
    user_id uuid not null,
    name text not null,
    address text not null,
    network text not null,
    constraint withdrawal_addresses_user_id_fkey foreign key (user_id) references public.users (id)
);
comment on table public.withdrawal_addresses is 'Stores user saved withdrawal addresses.';

-- public.admin_requests table
create table if not exists public.admin_requests (
    id uuid not null default uuid_generate_v4() primary key,
    user_id uuid not null,
    type text not null,
    new_password text,
    status text not null,
    created_at timestamp with time zone not null default now(),
    constraint admin_requests_user_id_fkey foreign key (user_id) references public.users (id)
);
comment on table public.admin_requests is 'Stores user requests for admin approval, like password resets.';

-- public.commission_logs table
create table if not exists public.commission_logs (
    id uuid not null default uuid_generate_v4() primary key,
    upline_user_id uuid not null,
    source_user_id uuid not null,
    source_username text not null,
    source_level integer not null,
    trade_amount numeric not null,
    commission_rate numeric not null,
    commission_amount numeric not null,
    created_at timestamp with time zone not null default now(),
    constraint commission_logs_upline_user_id_fkey foreign key (upline_user_id) references public.users (id),
    constraint commission_logs_source_user_id_fkey foreign key (source_user_id) references public.users (id)
);
comment on table public.commission_logs is 'Logs referral commissions earned by admins/users.';


-- 3. Row Level Security (RLS) Policies
-- Enable RLS for all tables
alter table public.users enable row level security;
alter table public.transactions enable row level security;
alter table public.contract_trades enable row level security;
alter table public.spot_trades enable row level security;
alter table public.investments enable row level security;
alter table public.withdrawal_addresses enable row level security;
alter table public.admin_requests enable row level security;
alter table public.commission_logs enable row level security;

-- Drop existing policies to ensure a clean slate
drop policy if exists "Users can only see their own profile." on public.users;
drop policy if exists "Admins can see all profiles." on public.users;
drop policy if exists "Users can manage their own data." on public.transactions;
drop policy if exists "Users can manage their own data." on public.contract_trades;
drop policy if exists "Users can manage their own data." on public.spot_trades;
drop policy if exists "Users can manage their own data." on public.investments;
drop policy if exists "Users can manage their own data." on public.withdrawal_addresses;
drop policy if exists "Users can manage their own data." on public.admin_requests;
drop policy if exists "Admins can view all commission logs." on public.commission_logs;
drop policy if exists "Users can see their own commissions." on public.commission_logs;


-- RLS Policies for public.users
create policy "Users can only see their own profile." on public.users for select using (auth.uid() = id);
create policy "Admins can see all profiles." on public.users for select using (
    (select is_admin from public.users where id = auth.uid()) = true
);

-- RLS Policies for user-specific tables
create policy "Users can manage their own data." on public.transactions for all using (auth.uid() = user_id);
create policy "Users can manage their own data." on public.contract_trades for all using (auth.uid() = user_id);
create policy "Users can manage their own data." on public.spot_trades for all using (auth.uid() = user_id);
create policy "Users can manage their own data." on public.investments for all using (auth.uid() = user_id);
create policy "Users can manage their own data." on public.withdrawal_addresses for all using (auth.uid() = user_id);
create policy "Users can manage their own data." on public.admin_requests for all using (auth.uid() = user_id);

-- RLS Policies for commission_logs
create policy "Admins can view all commission logs." on public.commission_logs for select using (
    (select is_admin from public.users where id = auth.uid()) = true
);
create policy "Users can see their own commissions." on public.commission_logs for select using (auth.uid() = upline_user_id);


-- 4. Database Functions (RPC)

-- Function to get a user's profile by ID
create or replace function public.get_user_profile_by_id(user_id_input uuid)
returns table (
    id uuid,
    email text,
    is_test_user boolean,
    is_admin boolean,
    is_frozen boolean,
    inviter text,
    registered_at timestamp with time zone,
    username text,
    invitation_code text
)
language sql security definer
as $$
    select
        users.id,
        users.email,
        users.is_test_user,
        users.is_admin,
        users.is_frozen,
        users.inviter,
        users.registered_at,
        users.username,
        users.invitation_code
    from public.users
    where users.id = user_id_input;
$$;

-- Function for an admin to get all users
create or replace function public.get_all_users_for_admin()
returns table (
    id uuid,
    email text,
    is_test_user boolean,
    is_admin boolean,
    is_frozen boolean,
    inviter text,
    registered_at timestamp with time zone,
    username text,
    invitation_code text
)
language plpgsql security definer
as $$
begin
    if (select is_admin from public.users where id = auth.uid()) then
        return query
        select
            u.id,
            u.email,
            u.is_test_user,
            u.is_admin,
            u.is_frozen,
            u.inviter,
            u.registered_at,
            u.username,
            u.invitation_code
        from public.users u;
    end if;
end;
$$;

-- Function to get total number of users
create or replace function public.get_total_users_count()
returns integer
language sql security definer
as $$
    select count(*)::integer from public.users;
$$;


-- 5. Initial Data Seeding (Admin User)
-- This section will create the initial admin user.
-- IMPORTANT: This should only be run once on a new database.
-- If an admin already exists, this might cause an error, which is safe to ignore.

DO $$
DECLARE
    admin_email TEXT := 'admin@rsf.app';
    admin_pass TEXT := 'password';
    admin_user_id UUID;
BEGIN
    -- Check if the admin user already exists in auth.users
    IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = admin_email) THEN
        -- Create the authentication user for 'admin'
        admin_user_id := uuid_generate_v4();

        INSERT INTO auth.users (id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, instance_id)
        VALUES (
            admin_user_id,
            'authenticated',
            'authenticated',
            admin_email,
            crypt(admin_pass, gen_salt('bf')),
            NOW(),
            '{"provider":"email","providers":["email"]}',
            '{}',
            NOW(),
            NOW(),
            '00000000-0000-0000-0000-000000000000'
        );

        -- Create the corresponding profile in the public 'users' table
        INSERT INTO public.users (id, username, email, is_admin, is_test_user, is_frozen, inviter, registered_at, invitation_code)
        VALUES (
            admin_user_id,
            'admin',
            admin_email,
            true, -- Set the is_admin flag to true
            true, -- Set as a test user to have initial funds for demonstration
            false,
            null,
            NOW(),
            'STARTERCODE' -- Initial invitation code for the admin
        );
        RAISE NOTICE 'Admin user created successfully.';
    ELSE
        RAISE NOTICE 'Admin user already exists. Skipping creation.';
    END IF;
END $$;
