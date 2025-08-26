-- supabase.sql
-- This script is designed to be idempotent and can be run multiple times safely.
-- 删除已存在的表，避免字段冲突
DROP TABLE IF EXISTS public.profiles CASCADE;
DROP TABLE IF EXISTS public.balances CASCADE;
DROP TABLE IF EXISTS public.trades CASCADE;
DROP TABLE IF EXISTS public.investments CASCADE;
DROP TABLE IF EXISTS public.reward_logs CASCADE;
DROP TABLE IF EXISTS public.requests CASCADE;
DROP TABLE IF EXISTS public.system_settings CASCADE;
DROP TABLE IF EXISTS public.announcements CASCADE;
DROP TABLE IF EXISTS public.activities CASCADE;
DROP TABLE IF EXISTS public.daily_tasks CASCADE;
DROP TABLE IF EXISTS public.user_task_states CASCADE;
DROP TABLE IF EXISTS public.action_logs CASCADE;
DROP TABLE IF EXISTS public.swap_orders CASCADE;
DROP TABLE IF EXISTS public.investment_products CASCADE;
DROP TABLE IF EXISTS public.market_summary_data CASCADE;
DROP TABLE IF EXISTS public.market_kline_data CASCADE;
DROP TABLE IF EXISTS public.market_kline_raw CASCADE;
DROP TABLE IF EXISTS public.market_interventions CASCADE;
DROP TABLE IF EXISTS public.commission_rates CASCADE;
DROP TABLE IF EXISTS public.supported_assets CASCADE;
DROP TABLE IF EXISTS public.cron_job_logs CASCADE;
-- 1. Extensions
create extension if not exists "uuid-ossp" with schema extensions;
create extension if not exists pgcrypto with schema extensions;
create extension if not exists pg_cron with schema extensions;
-- 2. Table Definitions
-- Core user table, linked to auth.users
create table if not exists public.profiles (
    id uuid not null primary key,
    username text unique,
    nickname text,
    email text unique,
    inviter_id uuid references public.profiles(id),
    is_admin boolean default false,
    is_test_user boolean default true,
    is_frozen boolean default false,
    invitation_code text unique,
    credit_score integer default 100,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    last_login_at timestamp with time zone,
    avatar_url text,
    last_check_in_date date,
    consecutive_check_ins integer default 0
);
comment on table public.profiles is 'Stores public user profile information, linked to auth.users.';
-- Asset balances for each user
create table if not exists public.balances (
    id bigserial primary key,
    user_id uuid not null references public.profiles(id) on delete cascade,
    asset text not null,
    available_balance double precision default 0,
    frozen_balance double precision default 0,
    unique(user_id, asset)
);
create index if not exists balances_user_id_asset_idx on public.balances(user_id, asset);
comment on table public.balances is 'Stores the available and frozen balances for each user and asset type.';
-- Combined trades table for both Spot and Contract trades
create table if not exists public.trades (
    id bigserial primary key,
    user_id uuid not null references public.profiles(id) on delete cascade,
    trading_pair text not null,
    orderType text not null check (orderType in ('spot', 'contract')),
    type text not null check (type in ('buy', 'sell')),
    status text not null,
    -- 'filled', 'cancelled' for spot; 'active', 'settled' for contract
    amount double precision not null,
    -- For spot, it's base asset amount. For contract, it's quote asset investment.
    total double precision,
    -- For spot trades, total value in quote asset.
    price double precision,
    -- For spot trades
    base_asset text,
    quote_asset text,
    entry_price double precision,
    -- For contract trades
    settlement_time timestamp with time zone,
    -- For contract trades
    period integer,
    -- For contract trades
    profit_rate double precision,
    -- For contract trades
    settlement_price double precision,
    -- For contract trades
    outcome text,
    -- 'win' or 'loss' for contract trades
    profit double precision,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);
create index if not exists trades_status_settlement_time_idx on public.trades(status, settlement_time);
create index if not exists trades_trading_pair_status_idx on public.trades(trading_pair, status, settlement_time);
comment on table public.trades is 'Records all user spot and contract trading activities.';
-- Investment records
create table if not exists public.investments (
    id bigserial primary key,
    user_id uuid not null references public.profiles(id) on delete cascade,
    product_name text not null,
    amount double precision not null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    settlement_date timestamp with time zone not null,
    status text not null check (status in ('active', 'settled')),
    category text,
    -- 'staking', 'finance'
    profit double precision,
    productType text,
    -- 'daily', 'hourly'
    daily_rate double precision,
    period integer,
    staking_asset text,
    staking_amount double precision,
    duration_hours integer,
    hourly_rate double precision
);
create index if not exists investments_status_settlement_date_idx on public.investments(status, settlement_date);
comment on table public.investments is 'Tracks user investments in various financial products.';
-- Reward and commission logs
create table if not exists public.reward_logs (
    id bigserial primary key,
    user_id uuid not null references public.profiles(id) on delete cascade,
    type text not null,
    -- 'dailyTask', 'team', 'event', 'system', 'check_in'
    amount double precision not null,
    asset text not null,
    source_id text,
    source_username text,
    source_level integer,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    description text
);
create index if not exists reward_logs_user_id_created_at_idx on public.reward_logs(user_id, created_at);
comment on table public.reward_logs is 'A log of all rewards and commissions distributed to users.';
-- User requests (deposit, withdrawal, password reset)
create table if not exists public.requests (
    id bigserial primary key,
    user_id uuid not null references public.profiles(id) on delete cascade,
    type text not null,
    asset text,
    amount double precision,
    address text,
    transaction_hash text,
    new_password text,
    status text not null,
    -- 'pending', 'approved', 'rejected'
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);
comment on table public.requests is 'Tracks user-submitted requests requiring admin approval.';
-- System-wide settings stored in a single JSONB row
create table if not exists public.system_settings (
    id int primary key default 1,
    settings jsonb,
    constraint single_row_check check (id = 1)
);
comment on table public.system_settings is 'Stores global configurations in a single JSONB column.';
-- Announcements table for system, carousel, and personal messages
create table if not exists public.announcements (
    id bigserial primary key,
    type text not null,
    user_id uuid references public.profiles(id) on delete cascade,
    content jsonb,
    title text,
    theme text,
    priority integer,
    expires_at timestamp with time zone,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    is_read boolean default false,
    constraint unique_type_for_singletons check (
        type not in ('carousel')
        or user_id is null
    )
);
comment on table public.announcements is 'Stores various types of announcements and messages.';
-- Limited-time activities
create table if not exists public.activities (
    id bigserial primary key,
    title text not null,
    description text,
    rewardRule text,
    howToClaim text,
    expiresAt timestamp with time zone,
    imgSrc text,
    status text,
    -- 'published', 'draft'
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);
comment on table public.activities is 'Defines limited-time promotional activities.';
-- Daily task definitions
create table if not exists public.daily_tasks (
    id bigserial primary key,
    title text not null,
    description text,
    reward double precision,
    reward_type text,
    link text,
    imgSrc text,
    status text,
    -- 'published', 'draft'
    trigger text unique
);
comment on table public.daily_tasks is 'Definitions for daily tasks users can complete for rewards.';
-- User's daily task completion status
create table if not exists public.user_task_states (
    id bigserial primary key,
    user_id uuid not null references public.profiles(id) on delete cascade,
    taskId text not null references public.daily_tasks(trigger) on delete cascade,
    date date not null,
    completed boolean default false,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    unique(user_id, taskId, date)
);
create index if not exists user_task_states_user_id_date_idx on public.user_task_states(user_id, date);
comment on table public.user_task_states is 'Tracks completion status of daily tasks for each user.';
-- Admin action logs
create table if not exists public.action_logs (
    id bigserial primary key,
    entity_type text,
    entity_id text,
    action text,
    operator_id uuid references public.profiles(id),
    operator_username text,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    details text
);
comment on table public.action_logs is 'Logs actions performed by administrators for auditing purposes.';
-- P2P Swap Orders
create table if not exists public.swap_orders (
    id bigserial primary key,
    user_id uuid not null references public.profiles(id) on delete cascade,
    username text,
    from_asset text,
    from_amount double precision,
    to_asset text,
    to_amount double precision,
    status text,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    taker_id uuid references public.profiles(id) on delete cascade,
    taker_username text,
    payment_proof_url text
);
comment on table public.swap_orders is 'Stores orders for the Peer-to-Peer asset swap feature.';
-- Investment product configurations
create table if not exists public.investment_products (
    id bigserial primary key,
    name text not null,
    price double precision,
    dailyRate double precision,
    period integer,
    maxPurchase integer,
    imgSrc text,
    category text,
    productType text,
    activeStartTime text,
    activeEndTime text,
    hourlyTiers jsonb,
    stakingAsset text,
    stakingAmount double precision
);
comment on table public.investment_products is 'Configuration for various investment products offered.';
-- Real-time market summary data
create table if not exists public.market_summary_data (
    pair text not null,
    price numeric(30, 8) not null,
    change numeric(12, 4) default 0,
    volume numeric(24, 8) default 0,
    high numeric(30, 8) default 0,
    low numeric(30, 8) default 0,
    source text,
    updated_at timestamp with time zone default now(),
    primary key (pair)
);
create index if not exists idx_market_summary_updated_at on public.market_summary_data(updated_at);
comment on table public.market_summary_data is 'Stores the latest summary data for each trading pair.';
-- Raw K-line data for auditing
create table if not exists public.market_kline_raw (
    id bigserial primary key,
    trading_pair text not null,
    time bigint not null,
    open numeric(30, 8),
    high numeric(30, 8),
    low numeric(30, 8),
    close numeric(30, 8),
    volume numeric(24, 8),
    source text,
    created_at timestamp with time zone default now()
);
create index if not exists idx_kline_raw_pair_time on public.market_kline_raw(trading_pair, time);
-- Display K-line data with delay and intervention
create table if not exists public.market_kline_data (
    id bigserial primary key,
    trading_pair text not null,
    time bigint not null,
    open numeric(30, 8),
    high numeric(30, 8),
    low numeric(30, 8),
    close numeric(30, 8),
    volume numeric(24, 8),
    is_intervened boolean default false,
    created_at timestamp with time zone default now(),
    unique (trading_pair, time)
);
create index if not exists idx_kline_data_pair_time on public.market_kline_data(trading_pair, time);
-- Intervention rules table
create table if not exists public.market_interventions (
    id bigserial primary key,
    trading_pair text not null,
    start_time timestamp with time zone not null,
    end_time timestamp with time zone not null,
    rule jsonb not null,
    priority int default 1,
    created_by text,
    created_at timestamp with time zone default now()
);
create index if not exists idx_intervention_pair_time on public.market_interventions(trading_pair, start_time, end_time);
-- Table for configurable commission rates
create table if not exists public.commission_rates (
    level integer primary key,
    rate double precision not null
);
comment on table public.commission_rates is 'Stores configurable commission rates for different affiliate levels.';
-- Table for assets to be auto-initialized for new users
create table if not exists public.supported_assets (
    asset text primary key,
    is_active boolean default true,
    asset_type text default 'crypto' -- e.g., 'crypto', 'fiat'
);
comment on table public.supported_assets is 'Manages which assets are supported and initialized for new users.';
-- Log table for cron job executions
create table if not exists public.cron_job_logs (
    id bigserial primary key,
    job_name text not null,
    run_status text not null,
    details text,
    start_time timestamp with time zone,
    end_time timestamp with time zone
);
comment on table public.cron_job_logs is 'Logs the execution status and details of scheduled cron jobs.';
-- 删除已存在的策略，避免策略冲突（移到建表之后）
DROP POLICY IF EXISTS "Allow public read access to profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can do anything to profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can view their own balances" ON public.balances;
DROP POLICY IF EXISTS "Users can view their own trades" ON public.trades;
DROP POLICY IF EXISTS "Users can view their own investments" ON public.investments;
DROP POLICY IF EXISTS "Users can view their own reward logs" ON public.reward_logs;
DROP POLICY IF EXISTS "Users can manage their own task states" ON public.user_task_states;
DROP POLICY IF EXISTS "Users can view their own requests" ON public.requests;
DROP POLICY IF EXISTS "Users can create requests" ON public.requests;
DROP POLICY IF EXISTS "Users can view all open swap orders" ON public.swap_orders;
DROP POLICY IF EXISTS "Users can manage their own swap orders" ON public.swap_orders;
DROP POLICY IF EXISTS "Allow read access to non-personal announcements" ON public.announcements;
DROP POLICY IF EXISTS "Users can view their own messages" ON public.announcements;
DROP POLICY IF EXISTS "Admins can manage system_settings" ON public.system_settings;
DROP POLICY IF EXISTS "Admins can manage daily_tasks" ON public.daily_tasks;
DROP POLICY IF EXISTS "Admins can manage investment_products" ON public.investment_products;
DROP POLICY IF EXISTS "Admins can manage commission_rates" ON public.commission_rates;
-- 3. Initial Data Seeding (Idempotent)
-- Seed system settings if they don't exist
insert into public.system_settings (id, settings)
values (
        1,
        '{"trade_fee": 0.001, "kline_refresh_interval_sec": 60, "check_in_reward_base": 0.5}'
    ) on conflict (id) do nothing;
-- Seed default commission rates
insert into public.commission_rates (level, rate)
values (1, 0.08),
    (2, 0.05),
    (3, 0.02) on conflict (level) do nothing;
-- Seed supported assets
insert into public.supported_assets (asset, is_active, asset_type)
values ('USDT', true, 'crypto'),
    ('BTC', true, 'crypto'),
    ('ETH', true, 'crypto'),
    ('USD', true, 'fiat'),
    ('EUR', true, 'fiat'),
    ('GBP', true, 'fiat') on conflict (asset) do nothing;
-- 4. Functions and Triggers
-- Function to create profile and initial balances for a new user
create or replace function public.handle_new_user() returns trigger as $$
declare v_asset_record record;
begin -- Create a profile
insert into public.profiles (
        id,
        username,
        nickname,
        email,
        inviter_id,
        invitation_code,
        avatar_url
    )
values (
        new.id,
        new.raw_user_meta_data->>'username',
        new.raw_user_meta_data->>'nickname',
        new.email,
        (new.raw_user_meta_data->>'inviter_id')::uuid,
        new.raw_user_meta_data->>'invitation_code',
        new.raw_user_meta_data->>'avatar_url'
    );
-- Create initial zero balances for all supported assets
for v_asset_record in
select asset
from public.supported_assets
where is_active = true loop
insert into public.balances (
        user_id,
        asset,
        available_balance,
        frozen_balance
    )
values (new.id, v_asset_record.asset, 0, 0);
end loop;
return new;
end;
$$ language plpgsql volatile security definer;
-- Trigger to call the function when a new user signs up
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after
insert on auth.users for each row execute procedure public.handle_new_user();
-- Function to adjust user balances safely
create or replace function public.adjust_balance(
        p_user_id uuid,
        p_asset text,
        p_amount double precision,
        p_is_frozen boolean default false,
        p_is_debit_frozen boolean default false
    ) returns void as $$
declare v_available double precision;
begin if p_is_debit_frozen then
update public.balances
set frozen_balance = frozen_balance - p_amount
where user_id = p_user_id
    and asset = p_asset;
elsif p_is_frozen then -- Check for sufficient available balance before freezing
select available_balance into v_available
from public.balances
where user_id = p_user_id
    and asset = p_asset for
update;
if v_available < p_amount then raise exception 'Insufficient available balance to freeze for user %, asset %',
p_user_id,
p_asset;
end if;
update public.balances
set available_balance = available_balance - p_amount,
    frozen_balance = frozen_balance + p_amount
where user_id = p_user_id
    and asset = p_asset;
else
update public.balances
set available_balance = available_balance + p_amount
where user_id = p_user_id
    and asset = p_asset;
end if;
end;
$$ language plpgsql volatile security definer;
-- Function to get the full downline of a user
drop function if exists public.get_downline(uuid);
create or replace function public.get_downline(p_user_id uuid) returns table(
        id uuid,
        username text,
        nickname text,
        email text,
        inviter_id uuid,
        is_admin boolean,
        is_test_user boolean,
        is_frozen boolean,
        invitation_code text,
        credit_score integer,
        created_at timestamp with time zone,
        last_login_at timestamp with time zone,
        avatar_url text,
        level int
    ) as $$ begin return query with recursive downline as (
        select p.id,
            p.username,
            p.nickname,
            p.email,
            p.inviter_id,
            p.is_admin,
            p.is_test_user,
            p.is_frozen,
            p.invitation_code,
            p.credit_score,
            p.created_at,
            p.last_login_at,
            p.avatar_url,
            1 as level
        from public.profiles p
        where p.inviter_id = p_user_id
        union all
        select p.id,
            p.username,
            p.nickname,
            p.email,
            p.inviter_id,
            p.is_admin,
            p.is_test_user,
            p.is_frozen,
            p.invitation_code,
            p.credit_score,
            p.created_at,
            p.last_login_at,
            p.avatar_url,
            d.level + 1
        from public.profiles p
            inner join downline d on p.inviter_id = d.id
        where d.level < 3
    )
select *
from downline;
end;
$$ language plpgsql;
-- Function to get total platform balance
drop function if exists public.get_total_platform_balance();
create or replace function public.get_total_platform_balance() returns double precision as $$ begin return (
        select sum(available_balance + frozen_balance)
        from public.balances
        where asset_type = 'crypto'
        limit 1
    );
end;
$$ language plpgsql;
-- Function to distribute commissions up to 3 levels
create or replace function public.distribute_trade_commissions() returns trigger as $$
declare v_inviter_id uuid;
v_source_user public.profiles;
v_commission_amount double precision;
v_trade_amount double precision;
v_level int;
v_rate double precision;
begin -- Only distribute commissions for trades with a valid quote asset
if new.quote_asset is not null then v_trade_amount := coalesce(new.total, new.amount, 0);
select * into v_source_user
from public.profiles
where id = new.user_id;
v_inviter_id := v_source_user.inviter_id;
for v_level in 1..3 loop if v_inviter_id is null then exit;
end if;
select rate into v_rate
from public.commission_rates
where level = v_level;
if not found then exit;
end if;
v_commission_amount := v_trade_amount * v_rate;
-- Lock the inviter's balance row to prevent race conditions
lock table public.balances in row exclusive mode;
perform public.adjust_balance(
    v_inviter_id,
    new.quote_asset,
    v_commission_amount
);
insert into public.reward_logs (
        user_id,
        type,
        amount,
        asset,
        source_id,
        source_username,
        source_level,
        description
    )
values (
        v_inviter_id,
        'team',
        v_commission_amount,
        new.quote_asset,
        new.id::text,
        v_source_user.username,
        v_level,
        'Level ' || v_level || ' commission from trade ' || new.id
    );
select inviter_id into v_inviter_id
from public.profiles
where id = v_inviter_id;
end loop;
end if;
return new;
end;
$$ language plpgsql;
-- Trigger to distribute commissions after a trade
drop trigger if exists on_trade_insert_distribute_commissions on public.trades;
create trigger on_trade_insert_distribute_commissions
after
insert on public.trades for each row execute procedure public.distribute_trade_commissions();
-- Function for daily check-in
create or replace function public.handle_user_check_in(p_user_id uuid) returns table(
        success boolean,
        message text,
        reward_amount double precision
    ) as $$
declare v_last_check_in_date date;
v_consecutive_days int;
v_reward_base double precision;
v_final_reward double precision;
begin
select last_check_in_date,
    consecutive_check_ins into v_last_check_in_date,
    v_consecutive_days
from public.profiles
where id = p_user_id;
if v_last_check_in_date = current_date then return query
select false,
    'You have already checked in today.',
    0.0;
return;
end if;
if v_last_check_in_date = current_date - interval '1 day' then v_consecutive_days := v_consecutive_days + 1;
else v_consecutive_days := 1;
end if;
select (settings->>'check_in_reward_base')::double precision into v_reward_base
from public.system_settings
where id = 1;
v_final_reward := v_reward_base * power(1.5, v_consecutive_days - 1);
perform public.adjust_balance(p_user_id, 'USDT', v_final_reward);
update public.profiles
set last_check_in_date = current_date,
    consecutive_check_ins = v_consecutive_days
where id = p_user_id;
insert into public.reward_logs (user_id, type, amount, asset, description)
values (
        p_user_id,
        'check_in',
        v_final_reward,
        'USDT',
        'Daily check-in reward for day ' || v_consecutive_days
    );
return query
select true,
    'Check-in successful!',
    v_final_reward;
end;
$$ language plpgsql volatile;
-- Function to settle due trades and investments
drop function if exists public.settle_due_records();
create or replace function public.settle_due_records() returns text as $$
declare trade_record record;
investment_record record;
profit double precision;
outcome text;
settlement_price double precision;
total_return double precision;
processed_trades int := 0;
processed_investments int := 0;
quote_asset text;
begin -- Settle contract trades
for trade_record in
select *
from public.trades
where status = 'active'
    and settlement_time <= now()
limit 100 -- Process in batches
    loop -- Simulate fetching the current price for settlement
select price into settlement_price
from public.market_summary_data
where pair = trade_record.trading_pair;
if not found then continue;
-- Skip if no market data is available
end if;
if trade_record.type = 'buy' then outcome := case
    when settlement_price > trade_record.entry_price then 'win'
    else 'loss'
end;
else -- sell
outcome := case
    when settlement_price < trade_record.entry_price then 'win'
    else 'loss'
end;
end if;
profit := case
    when outcome = 'win' then trade_record.amount * trade_record.profit_rate
    else - trade_record.amount
end;
quote_asset := trade_record.quote_asset;
update public.trades
set status = 'settled',
    settlement_price = settlement_price,
    outcome = outcome,
    profit = profit
where id = trade_record.id;
if outcome = 'win' then perform public.adjust_balance(
    trade_record.user_id,
    quote_asset,
    trade_record.amount + profit,
    false,
    true
);
else perform public.adjust_balance(
    trade_record.user_id,
    quote_asset,
    0,
    false,
    true
);
end if;
processed_trades := processed_trades + 1;
end loop;
-- Settle investments
for investment_record in
select *
from public.investments
where status = 'active'
    and settlement_date <= now()
limit 100 -- Process in batches
    loop if investment_record.productType = 'daily' then profit := investment_record.amount * investment_record.daily_rate * investment_record.period;
elsif investment_record.productType = 'hourly' then profit := investment_record.amount * investment_record.hourly_rate * investment_record.duration_hours;
else profit := 0;
end if;
total_return := investment_record.amount + profit;
update public.investments
set status = 'settled',
    profit = profit
where id = investment_record.id;
-- Return principal and profit to USDT balance
perform public.adjust_balance(investment_record.user_id, 'USDT', total_return);
processed_investments := processed_investments + 1;
end loop;
return 'Settled ' || processed_trades || ' trades and ' || processed_investments || ' investments.';
end;
$$ language plpgsql;
-- Wrapper function for cron job logging
drop function if exists public.settle_and_log();
create or replace function public.settle_and_log() returns void as $$
declare log_id bigint;
result_text text;
v_sqlstate text;
v_message text;
v_context text;
begin
insert into public.cron_job_logs (job_name, run_status, start_time)
values ('settle_due_records', 'started', now())
returning id into log_id;
begin result_text := public.settle_due_records();
update public.cron_job_logs
set run_status = 'success',
    details = result_text,
    end_time = now()
where id = log_id;
exception
when others then get stacked diagnostics v_sqlstate = returned_sqlstate,
v_message = message_text,
v_context = pg_exception_context;
update public.cron_job_logs
set run_status = 'failed',
    details = 'SQLSTATE: ' || v_sqlstate || ' | ' || v_message || ' | CONTEXT: ' || v_context,
    end_time = now()
where id = log_id;
end;
end;
$$ language plpgsql;
-- 5. Row Level Security (RLS)
alter table public.profiles enable row level security;
alter table public.balances enable row level security;
alter table public.trades enable row level security;
alter table public.investments enable row level security;
alter table public.requests enable row level security;
alter table public.reward_logs enable row level security;
alter table public.user_task_states enable row level security;
alter table public.swap_orders enable row level security;
alter table public.announcements enable row level security;
-- Admin-only tables get policies below
alter table public.system_settings enable row level security;
alter table public.daily_tasks enable row level security;
alter table public.investment_products enable row level security;
alter table public.commission_rates enable row level security;
-- Policies for profiles
drop policy if exists "Allow public read access to profiles" on public.profiles;
create policy "Allow public read access to profiles" on public.profiles for
select using (true);
drop policy if exists "Users can insert their own profile" on public.profiles;
create policy "Users can insert their own profile" on public.profiles for
insert with check (auth.uid() = id);
drop policy if exists "Users can update their own profile" on public.profiles;
create policy "Users can update their own profile" on public.profiles for
update using (auth.uid() = id);
drop policy if exists "Admins can do anything to profiles" on public.profiles;
create policy "Admins can do anything to profiles" on public.profiles for all using (
    (
        select is_admin
        from public.profiles
        where id = auth.uid()
    )
);
-- Policies for user-specific data
drop policy if exists "Users can view their own balances" on public.balances;
create policy "Users can view their own balances" on public.balances for
select using (auth.uid() = user_id);
drop policy if exists "Users can view their own trades" on public.trades;
create policy "Users can view their own trades" on public.trades for
select using (auth.uid() = user_id);
drop policy if exists "Users can view their own investments" on public.investments;
create policy "Users can view their own investments" on public.investments for
select using (auth.uid() = user_id);
drop policy if exists "Users can view their own reward logs" on public.reward_logs;
create policy "Users can view their own reward logs" on public.reward_logs for
select using (auth.uid() = user_id);
drop policy if exists "Users can manage their own task states" on public.user_task_states;
create policy "Users can manage their own task states" on public.user_task_states for all using (auth.uid() = user_id);
-- Policies for requests
drop policy if exists "Users can view their own requests" on public.requests;
create policy "Users can view their own requests" on public.requests for
select using (auth.uid() = user_id);
drop policy if exists "Users can create requests" on public.requests;
create policy "Users can create requests" on public.requests for
insert with check (auth.uid() = user_id);
-- Policies for swap orders
drop policy if exists "Users can view all open swap orders" on public.swap_orders;
create policy "Users can view all open swap orders" on public.swap_orders for
select using (true);
drop policy if exists "Users can manage their own swap orders" on public.swap_orders;
create policy "Users can manage their own swap orders" on public.swap_orders for all using (
    auth.uid() = user_id
    or auth.uid() = taker_id
);
-- Policies for announcements
drop policy if exists "Allow read access to non-personal announcements" on public.announcements;
create policy "Allow read access to non-personal announcements" on public.announcements for
select using (user_id is null);
drop policy if exists "Users can view their own messages" on public.announcements;
create policy "Users can view their own messages" on public.announcements for
select using (auth.uid() = user_id);
-- Admin Policies for management tables
drop policy if exists "Admins can manage system_settings" on public.system_settings;
create policy "Admins can manage system_settings" on public.system_settings for all using (
    (
        select is_admin
        from public.profiles
        where id = auth.uid()
    )
);
drop policy if exists "Admins can manage daily_tasks" on public.daily_tasks;
create policy "Admins can manage daily_tasks" on public.daily_tasks for all using (
    (
        select is_admin
        from public.profiles
        where id = auth.uid()
    )
);
drop policy if exists "Admins can manage investment_products" on public.investment_products;
create policy "Admins can manage investment_products" on public.investment_products for all using (
    (
        select is_admin
        from public.profiles
        where id = auth.uid()
    )
);
drop policy if exists "Admins can manage commission_rates" on public.commission_rates;
create policy "Admins can manage commission_rates" on public.commission_rates for all using (
    (
        select is_admin
        from public.profiles
        where id = auth.uid()
    )
);
-- 6. Cron Job Scheduling
-- Unschedule existing job to prevent duplicates, then schedule the new one.
DO $$
DECLARE job_id int;
BEGIN
SELECT jobid INTO job_id
FROM cron.job
WHERE jobname = 'settle-due-orders-job';
IF job_id IS NOT NULL THEN PERFORM cron.unschedule('settle-due-orders-job');
END IF;
END $$;
select cron.schedule(
        'settle-due-orders-job',
        '* * * * *',
        'select public.settle_and_log()'
    );
DO $$
DECLARE job_id int;
BEGIN
SELECT jobid INTO job_id
FROM cron.job
WHERE jobname = 'cleanup-old-data-job';
IF job_id IS NOT NULL THEN PERFORM cron.unschedule('cleanup-old-data-job');
END IF;
END $$;
select cron.schedule(
        'cleanup-old-data-job',
        '0 1 * * *',
        -- Run once daily at 1 AM UTC
        'delete from public.action_logs where created_at < now() - interval ''30 days''; delete from public.cron_job_logs where start_time < now() - interval ''30 days'';'
    );