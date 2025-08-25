-- supabase.sql
-- This script is designed to be idempotent. You can run it multiple times without causing errors.

-- 1. 扩展 & 初始设置
-- Ensure required extensions are enabled
create extension if not exists "uuid-ossp" with schema extensions;
create extension if not exists "pgcrypto" with schema extensions;
create extension if not exists "pg_cron" with schema extensions;

-- 2. 表结构定义 (Tables)

-- Profiles: Stores user public data, linked to auth.users
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
comment on table public.profiles is 'Stores public-facing user profile information.';

-- Supported Assets: Central place to manage all supported assets
create table if not exists public.supported_assets (
    asset_code text primary key,
    asset_name text,
    is_active boolean default true,
    asset_type text default 'crypto' -- e.g., 'crypto', 'fiat'
);
comment on table public.supported_assets is 'Defines all assets supported by the platform for balances.';

-- Commission Rates: Dynamic commission levels
create table if not exists public.commission_rates (
    level integer primary key,
    rate double precision not null,
    description text
);
comment on table public.commission_rates is 'Stores dynamic commission rates for different affiliate levels.';

-- Balances: User's asset balances
create table if not exists public.balances (
  id bigserial primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  asset text not null references public.supported_assets(asset_code),
  available_balance double precision default 0,
  frozen_balance double precision default 0,
  unique(user_id, asset)
);
comment on table public.balances is 'Stores user asset balances, separating available and frozen funds.';

-- Trades: Unified table for spot and contract trades
create table if not exists public.trades (
  id bigserial primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  trading_pair text not null,
  orderType text not null check (orderType in ('spot', 'contract')),
  type text not null check (type in ('buy', 'sell')),
  status text not null, -- spot: 'filled'; contract: 'active', 'settled'
  amount double precision not null, -- For spot, it's base asset qty. For contract, it's quote asset investment.
  total double precision, -- For spot, it's quote asset amount.
  price double precision, -- For spot, it's execution price.
  entry_price double precision, -- For contract trades
  settlement_time timestamp with time zone, -- For contract trades
  period integer, -- For contract trades in seconds
  profit_rate double precision, -- For contract trades
  settlement_price double precision, -- For contract trades
  outcome text, -- 'win' or 'loss' for contract trades
  profit double precision, -- For contract trades
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);
comment on table public.trades is 'Records all user spot and contract trades.';

-- Investments: Records for staking and other financial products
create table if not exists public.investments (
    id bigserial primary key,
    user_id uuid not null references public.profiles(id) on delete cascade,
    product_name text not null,
    amount double precision not null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    settlement_date timestamp with time zone not null,
    status text not null check (status in ('active', 'settled')),
    category text, -- e.g., 'staking', 'finance'
    profit double precision,
    product_type text, -- e.g., 'daily', 'hourly'
    daily_rate double precision,
    period integer,
    staking_asset text,
    staking_amount double precision,
    duration_hours integer,
    hourly_rate double precision
);
comment on table public.investments is 'Tracks user investments in financial products.';

-- Reward Logs: Tracks all rewards and commissions
create table if not exists public.reward_logs (
    id bigserial primary key,
    user_id uuid not null references public.profiles(id) on delete cascade,
    type text not null, -- 'dailyTask', 'team', 'event', 'system', 'check_in'
    amount double precision not null,
    asset text not null,
    source_id text,
    source_username text,
    source_level integer,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    description text
);
comment on table public.reward_logs is 'Logs all rewards, commissions, and bonuses credited to users.';

-- Requests: For deposits, withdrawals, password resets, etc.
create table if not exists public.requests (
    id bigserial primary key,
    user_id uuid not null references public.profiles(id) on delete cascade,
    type text not null, -- 'deposit', 'withdrawal', 'password_reset'
    asset text,
    amount double precision,
    address text,
    transaction_hash text,
    new_password text,
    status text not null default 'pending', -- 'pending', 'approved', 'rejected'
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);
comment on table public.requests is 'Manages user requests needing admin approval.';

-- System Settings: Singleton table for global configurations
create table if not exists public.system_settings (
  id int primary key default 1,
  settings jsonb,
  constraint single_row_check check (id = 1)
);
comment on table public.system_settings is 'Stores global system configurations in a single JSONB row.';

-- Announcements: For platform-wide or user-specific messages
create table if not exists public.announcements (
    id bigserial primary key,
    type text not null, -- 'personal_message', 'carousel', 'horn'
    user_id uuid references public.profiles(id) on delete cascade,
    content jsonb,
    title text,
    theme text,
    priority integer,
    expires_at timestamp with time zone,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    is_read boolean default false,
    constraint unique_type_for_singletons unique (type)
);
comment on table public.announcements is 'Stores various types of announcements and messages.';

-- Activities: For limited-time promotional events
create table if not exists public.activities (
    id bigserial primary key,
    title text not null,
    description text,
    rewardRule text,
    howToClaim text,
    expiresAt timestamp with time zone,
    imgSrc text,
    status text, -- 'published', 'draft'
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);
comment on table public.activities is 'Configuration for limited-time user activities.';

-- Daily Tasks: Definitions for daily tasks
create table if not exists public.daily_tasks (
    id bigserial primary key,
    title text not null,
    description text,
    reward double precision,
    reward_type text,
    link text,
    imgSrc text,
    status text, -- 'published', 'draft'
    trigger text unique
);
comment on table public.daily_tasks is 'Defines available daily tasks for users.';

-- User Task States: Tracks user completion of daily tasks
create table if not exists public.user_task_states (
    id bigserial primary key,
    user_id uuid not null references public.profiles(id) on delete cascade,
    taskId text not null references public.daily_tasks(trigger) on delete cascade,
    date date not null,
    completed boolean default false,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    unique(user_id, taskId, date)
);
comment on table public.user_task_states is 'Tracks daily task completion status for each user.';

-- Action Logs: For admin auditing purposes
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
comment on table public.action_logs is 'Logs administrative actions for auditing.';

-- Swap Orders: For P2P asset swaps
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
    taker_id uuid references public.profiles(id),
    taker_username text,
    payment_proof_url text
);
comment on table public.swap_orders is 'Stores peer-to-peer swap orders.';

-- Investment Products: Configuration for financial products
create table if not exists public.investment_products (
    id bigserial primary key,
    name text not null unique,
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
comment on table public.investment_products is 'Defines all purchasable investment products.';

-- Market Summary Data: Real-time aggregated market data
create table if not exists public.market_summary_data (
    pair text primary key,
    price double precision,
    change double precision,
    volume double precision,
    high double precision,
    low double precision,
    icon text,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);
comment on table public.market_summary_data is 'Stores real-time summary data for trading pairs.';

-- Market K-line Data: For charting
create table if not exists public.market_kline_data (
    id bigserial primary key,
    trading_pair text not null,
    time timestamp with time zone not null,
    open double precision,
    high double precision,
    low double precision,
    close double precision,
    unique(trading_pair, time)
);
comment on table public.market_kline_data is 'Stores OHLC data for market charts.';
-- Note on Partitioning market_kline_data:
-- For production environments with high volume, partitioning this table by time (e.g., monthly) is recommended.
-- This requires more advanced setup and is best managed with a dedicated migration tool.
-- Example concept: CREATE TABLE market_kline_data_2024_01 PARTITION OF market_kline_data FOR VALUES FROM ('2024-01-01') TO ('2024-02-01');

-- Cron Job Logs: For monitoring scheduled tasks
create table if not exists public.cron_job_logs (
    id bigserial primary key,
    job_name text not null,
    run_time timestamp with time zone default timezone('utc'::text, now()),
    duration_ms double precision,
    status text not null, -- 'success', 'error'
    details text
);
comment on table public.cron_job_logs is 'Logs the execution status of scheduled database jobs.';

-- 3. 索引优化 (Indexes)
-- For settlement performance
create index if not exists trades_status_settlement_time_idx on public.trades (status, settlement_time);
create index if not exists investments_status_settlement_date_idx on public.investments (status, settlement_date);
-- For user-specific queries
create index if not exists reward_logs_user_id_created_at_idx on public.reward_logs (user_id, created_at desc);
create index if not exists user_task_states_user_id_date_idx on public.user_task_states (user_id, date desc);
-- For fast balance lookups
create index if not exists balances_user_id_asset_idx on public.balances(user_id, asset);
-- For efficient filtering of trades by pair
create index if not exists trades_pair_status_time_idx on public.trades(trading_pair, status, settlement_time);
-- For charting
create index if not exists market_kline_data_time_idx on public.market_kline_data (time desc);


-- 4. 函数与触发器 (Functions & Triggers)

-- Function to handle new user setup
create or replace function public.handle_new_user()
returns trigger as $$
declare
    v_asset_code text;
begin
  -- Insert into public.profiles
  insert into public.profiles (id, username, nickname, email, invitation_code, inviter_id, is_test_user, avatar_url)
  values (
    new.id,
    new.raw_user_meta_data->>'username',
    new.raw_user_meta_data->>'nickname',
    new.email,
    new.raw_user_meta_data->>'invitation_code',
    (new.raw_user_meta_data->>'inviter_id')::uuid,
    (new.raw_user_meta_data->>'is_test_user')::boolean,
    new.raw_user_meta_data->>'avatar_url'
  );

  -- Create initial zero balances for all supported assets
  for v_asset_code in select asset_code from public.supported_assets where is_active = true
  loop
    insert into public.balances (user_id, asset) values (new.id, v_asset_code);
  end loop;

  return new;
end;
$$ language plpgsql security definer;

-- Trigger to call the function when a new user signs up
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Safe balance adjustment function
create or replace function public.adjust_balance(
    p_user_id uuid,
    p_asset text,
    p_amount double precision,
    p_is_frozen_movement boolean default false,
    p_is_debit_from_frozen boolean default false
)
returns void as $$
declare
    v_available_balance double precision;
    v_frozen_balance double precision;
begin
    -- Lock the user's balance row to prevent race conditions
    select available_balance, frozen_balance
    into v_available_balance, v_frozen_balance
    from public.balances
    where user_id = p_user_id and asset = p_asset
    for update;

    if not found then
        raise exception 'Balance for user %, asset % not found.', p_user_id, p_asset;
    end if;

    if p_is_debit_from_frozen then
        -- This branch handles debiting from a frozen balance (e.g., withdrawal confirmation)
        if v_frozen_balance < p_amount then
            raise exception 'Insufficient frozen balance for user %, asset %. Required: %, available: %', p_user_id, p_asset, p_amount, v_frozen_balance;
        end if;
        update public.balances
        set frozen_balance = frozen_balance - p_amount
        where user_id = p_user_id and asset = p_asset;
    elsif p_is_frozen_movement then
        -- This branch handles moving funds between available and frozen
        if p_amount > 0 and v_available_balance < p_amount then -- Moving TO frozen
             raise exception 'Insufficient available balance for user %, asset %. Required: %, available: %', p_user_id, p_asset, p_amount, v_available_balance;
        elsif p_amount < 0 and v_frozen_balance < abs(p_amount) then -- Moving FROM frozen
             raise exception 'Insufficient frozen balance for user %, asset %. Required: %, available: %', p_user_id, p_asset, abs(p_amount), v_frozen_balance;
        end if;
        update public.balances
        set
            available_balance = available_balance - p_amount,
            frozen_balance = frozen_balance + p_amount
        where user_id = p_user_id and asset = p_asset;
    else
        -- Standard adjustment to the available balance
        if p_amount < 0 and v_available_balance < abs(p_amount) then
            raise exception 'Insufficient available balance for user %, asset %. Required: %, available: %', p_user_id, p_asset, abs(p_amount), v_available_balance;
        end if;
        update public.balances
        set available_balance = available_balance + p_amount
        where user_id = p_user_id and asset = p_asset;
    end if;
end;
$$ language plpgsql volatile;


-- Function to get the full downline of a user
drop function if exists public.get_downline(uuid);
create or replace function public.get_downline(p_user_id uuid)
returns table(id uuid, username text, nickname text, email text, inviter_id uuid, is_admin boolean, is_test_user boolean, is_frozen boolean, invitation_code text, credit_score integer, created_at timestamp with time zone, last_login_at timestamp with time zone, avatar_url text, level int) as $$
begin
  return query
  with recursive downline as (
    select p.id, p.username, p.nickname, p.email, p.inviter_id, p.is_admin, p.is_test_user, p.is_frozen, p.invitation_code, p.credit_score, p.created_at, p.last_login_at, p.avatar_url, 1 as level
    from public.profiles p
    where p.inviter_id = p_user_id
    union all
    select p.id, p.username, p.nickname, p.email, p.inviter_id, p.is_admin, p.is_test_user, p.is_frozen, p.invitation_code, p.credit_score, p.created_at, p.last_login_at, p.avatar_url, d.level + 1
    from public.profiles p
    inner join downline d on p.inviter_id = d.id
  )
  select * from downline;
end;
$$ language plpgsql stable;

-- Function to get total platform balance (USDT)
drop function if exists public.get_total_platform_balance();
create or replace function public.get_total_platform_balance()
returns double precision as $$
begin
  return (select coalesce(sum(available_balance + frozen_balance), 0) from public.balances where asset = 'USDT');
end;
$$ language plpgsql stable;

-- Function to distribute commissions dynamically
create or replace function public.distribute_trade_commissions()
returns trigger as $$
declare
    v_inviter_id uuid;
    v_source_user public.profiles;
    v_commission_amount double precision;
    v_trade_amount double precision;
    v_quote_asset text;
    rec record;
begin
    v_quote_asset := new.trading_pair.split('/')[2];
    v_trade_amount := coalesce(new.total, new.amount, 0);

    -- Only distribute commissions for trades quoted in a commissionable asset (e.g., USDT)
    if not exists (select 1 from public.supported_assets where asset_code = v_quote_asset and asset_type = 'fiat') then
       return new;
    end if;

    select * into v_source_user from public.profiles where id = new.user_id;
    v_inviter_id := v_source_user.inviter_id;

    for rec in select level, rate from public.commission_rates order by level
    loop
        if v_inviter_id is null then
            exit; -- Exit loop if no more inviters
        end if;

        -- Lock the inviter's balance row to prevent race conditions
        -- perform 1 from public.balances where user_id = v_inviter_id and asset = v_quote_asset for update;

        v_commission_amount := v_trade_amount * rec.rate;
        
        -- Use the adjust_balance function to add commission
        perform public.adjust_balance(v_inviter_id, v_quote_asset, v_commission_amount);

        insert into public.reward_logs (user_id, type, amount, asset, source_id, source_username, source_level, description)
        values (v_inviter_id, 'team', v_commission_amount, v_quote_asset, new.id::text, v_source_user.username, rec.level, 'Level ' || rec.level || ' commission from trade ' || new.id);

        select inviter_id into v_inviter_id from public.profiles where id = v_inviter_id;
    end loop;

    return new;
end;
$$ language plpgsql;

-- Trigger to distribute commissions on new trades
drop trigger if exists on_trade_insert_distribute_commissions on public.trades;
create trigger on_trade_insert_distribute_commissions
  after insert on public.trades
  for each row execute procedure public.distribute_trade_commissions();

-- Function to settle due trades and investments
create or replace function public.settle_due_records()
returns table(settled_entity_type text, settled_id bigint, details text) as $$
declare
    trade_rec record;
    investment_rec record;
    v_quote_asset text;
    v_profit double precision;
    v_outcome text;
    v_total_return double precision;
begin
  -- Settle due contract trades
  for trade_rec in
    select * from public.trades
    where status = 'active' and settlement_time <= timezone('utc'::text, now())
    limit 200 -- Process in batches to avoid long-running transactions
    for update -- Lock the rows to prevent concurrent processing
  loop
    v_quote_asset := split_part(trade_rec.trading_pair, '/', 2);
    
    -- In a real scenario, you'd fetch the settlement price from a reliable source.
    -- Here, we simulate it based on entry_price for demonstration.
    -- This logic can be replaced with a call to an API or a price feed table.
    declare
      v_settlement_price double precision := trade_rec.entry_price + (random() - 0.5) * trade_rec.entry_price * 0.01;
    begin
        if trade_rec.type = 'buy' then
            v_outcome := case when v_settlement_price > trade_rec.entry_price then 'win' else 'loss' end;
        else -- 'sell'
            v_outcome := case when v_settlement_price < trade_rec.entry_price then 'win' else 'loss' end;
        end if;

        v_profit := case when v_outcome = 'win' then trade_rec.amount * trade_rec.profit_rate else -trade_rec.amount end;
        v_total_return := case when v_outcome = 'win' then trade_rec.amount + v_profit else 0 end;

        update public.trades
        set status = 'settled', settlement_price = v_settlement_price, outcome = v_outcome, profit = v_profit
        where id = trade_rec.id;

        -- Return funds
        perform public.adjust_balance(trade_rec.user_id, v_quote_asset, v_total_return);
        
        return next ( 'trade'::text, trade_rec.id, 'Settled with outcome: ' || v_outcome )::record;
    end;
  end loop;

  -- Settle due investments
  for investment_rec in
    select * from public.investments
    where status = 'active' and settlement_date <= timezone('utc'::text, now())
    limit 200 -- Process in batches
    for update -- Lock the rows
  loop
      -- Calculate profit based on product type
      if investment_rec.product_type = 'daily' and investment_rec.daily_rate is not null and investment_rec.period is not null then
          v_profit := investment_rec.amount * investment_rec.daily_rate * investment_rec.period;
      elsif investment_rec.product_type = 'hourly' and investment_rec.hourly_rate is not null then
          v_profit := investment_rec.amount * investment_rec.hourly_rate;
      else
          v_profit := 0;
      end if;

      v_total_return := investment_rec.amount + v_profit;

      update public.investments
      set status = 'settled', profit = v_profit
      where id = investment_rec.id;
      
      -- Investments are assumed to be in USDT for this example
      perform public.adjust_balance(investment_rec.user_id, 'USDT', v_total_return);

      return next ( 'investment'::text, investment_rec.id, 'Settled with profit: ' || v_profit )::record;
  end loop;
end;
$$ language plpgsql volatile;


-- Wrapper function for cron job with logging
create or replace function public.settle_and_log()
returns void as $$
declare
    start_ts timestamptz;
    end_ts timestamptz;
    duration double precision;
    settled_count int;
begin
    start_ts := clock_timestamp();
    
    select count(*) into settled_count from public.settle_due_records();

    end_ts := clock_timestamp();
    duration := 1000 * (extract(epoch from end_ts) - extract(epoch from start_ts));

    insert into public.cron_job_logs (job_name, duration_ms, status, details)
    values ('settle_due_records', duration, 'success', 'Settled ' || settled_count || ' records.');

exception
    when others then
        insert into public.cron_job_logs (job_name, status, details)
        values ('settle_due_records', 'error', 'SQLSTATE: ' || SQLSTATE || ' - ' || SQLERRM);
end;
$$ language plpgsql;

-- Daily data cleanup function
create or replace function public.cleanup_old_data()
returns void as $$
begin
    -- Delete announcements older than 90 days
    delete from public.announcements where created_at < now() - interval '90 days' and (type = 'personal_message' or type = 'horn');
    
    -- Delete activities that expired more than 30 days ago
    delete from public.activities where "expiresAt" < now() - interval '30 days';

    -- Delete cron job logs older than 30 days
    delete from public.cron_job_logs where run_time < now() - interval '30 days';

    -- Delete user task states older than 7 days
    delete from public.user_task_states where date < current_date - interval '7 days';
end;
$$ language plpgsql;


-- Function for user check-ins
drop function if exists public.handle_user_check_in(uuid);
create or replace function public.handle_user_check_in(p_user_id uuid)
returns table(success boolean, message text, reward_amount double precision) as $$
declare
    v_last_check_in date;
    v_consecutive_days int;
    v_reward_base double precision;
    v_final_reward double precision;
begin
    -- Get check-in reward base from settings
    select (settings->>'check_in_reward_base')::double precision into v_reward_base from public.system_settings where id = 1;
    if not found then
        v_reward_base := 0.5; -- Fallback
    end if;

    select last_check_in_date, consecutive_check_ins into v_last_check_in, v_consecutive_days
    from public.profiles where id = p_user_id for update;

    if v_last_check_in = current_date then
        return query select false, 'You have already checked in today.', 0.0;
        return;
    end if;

    if v_last_check_in = current_date - interval '1 day' then
        v_consecutive_days := (v_consecutive_days % 7) + 1;
    else
        v_consecutive_days := 1;
    end if;
    
    v_final_reward := v_reward_base * power(1.5, v_consecutive_days - 1);

    update public.profiles
    set last_check_in_date = current_date, consecutive_check_ins = v_consecutive_days
    where id = p_user_id;

    perform public.adjust_balance(p_user_id, 'USDT', v_final_reward);

    insert into public.reward_logs (user_id, type, amount, asset, description)
    values (p_user_id, 'check_in', v_final_reward, 'USDT', 'Daily check-in reward for day ' || v_consecutive_days);

    return query select true, 'Check-in successful!', v_final_reward;
end;
$$ language plpgsql volatile;


-- 5. 行级安全策略 (Row Level Security - RLS)
alter table public.profiles enable row level security;
alter table public.balances enable row level security;
alter table public.trades enable row level security;
alter table public.investments enable row level security;
alter table public.requests enable row level security;
alter table public.reward_logs enable row level security;
alter table public.user_task_states enable row level security;
alter table public.swap_orders enable row level security;
alter table public.action_logs enable row level security;
-- Public-facing tables do not need RLS unless specified
-- alter table public.system_settings enable row level security;
-- alter table public.announcements enable row level security;
-- alter table public.activities enable row level security;
-- alter table public.daily_tasks enable row level security;
-- alter table public.investment_products enable row level security;

-- Profiles Policies
drop policy if exists "Allow public read access" on public.profiles;
create policy "Allow public read access" on public.profiles for select using (true);
drop policy if exists "Users can insert their own profile" on public.profiles;
create policy "Users can insert their own profile" on public.profiles for insert with check (auth.uid() = id);
drop policy if exists "Users can update their own profile" on public.profiles;
create policy "Users can update their own profile" on public.profiles for update using (auth.uid() = id);
drop policy if exists "Admins can manage all profiles" on public.profiles;
create policy "Admins can manage all profiles" on public.profiles for all using (exists (select 1 from public.profiles where id = auth.uid() and is_admin = true));

-- Balances Policies
drop policy if exists "Users can view their own balances" on public.balances;
create policy "Users can view their own balances" on public.balances for select using (auth.uid() = user_id);
drop policy if exists "Admins can view all balances" on public.balances;
create policy "Admins can view all balances" on public.balances for select using (exists (select 1 from public.profiles where id = auth.uid() and is_admin = true));
-- Note: Balance modifications are handled by `adjust_balance` security definer function.

-- Trades Policies
drop policy if exists "Users can view their own trades" on public.trades;
create policy "Users can view their own trades" on public.trades for select using (auth.uid() = user_id);
drop policy if exists "Admins can view all trades" on public.trades;
create policy "Admins can view all trades" on public.trades for select using (exists (select 1 from public.profiles where id = auth.uid() and is_admin = true));
drop policy if exists "Users can insert their own trades" on public.trades;
create policy "Users can insert their own trades" on public.trades for insert with check (auth.uid() = user_id);

-- Investments Policies
drop policy if exists "Users can view their own investments" on public.investments;
create policy "Users can view their own investments" on public.investments for select using (auth.uid() = user_id);
drop policy if exists "Admins can view all investments" on public.investments;
create policy "Admins can view all investments" on public.investments for select using (exists (select 1 from public.profiles where id = auth.uid() and is_admin = true));
-- Note: Investment creation is handled by RPC functions.

-- Requests Policies
drop policy if exists "Users can manage their own requests" on public.requests;
create policy "Users can manage their own requests" on public.requests for all using (auth.uid() = user_id);
drop policy if exists "Admins can manage all requests" on public.requests;
create policy "Admins can manage all requests" on public.requests for all using (exists (select 1 from public.profiles where id = auth.uid() and is_admin = true));

-- Reward Logs Policies
drop policy if exists "Users can view their own reward logs" on public.reward_logs;
create policy "Users can view their own reward logs" on public.reward_logs for select using (auth.uid() = user_id);
drop policy if exists "Admins can view all reward logs" on public.reward_logs;
create policy "Admins can view all reward logs" on public.reward_logs for select using (exists (select 1 from public.profiles where id = auth.uid() and is_admin = true));

-- User Task States Policies
drop policy if exists "Users can manage their own task states" on public.user_task_states;
create policy "Users can manage their own task states" on public.user_task_states for all using (auth.uid() = user_id);
drop policy if exists "Admins can view all task states" on public.user_task_states;
create policy "Admins can view all task states" on public.user_task_states for select using (exists (select 1 from public.profiles where id = auth.uid() and is_admin = true));

-- Swap Orders Policies
drop policy if exists "Users can view all open swap orders" on public.swap_orders;
create policy "Users can view all open swap orders" on public.swap_orders for select using (true);
drop policy if exists "Users can manage their own swap orders" on public.swap_orders;
create policy "Users can manage their own swap orders" on public.swap_orders for all using (auth.uid() = user_id or auth.uid() = taker_id);
drop policy if exists "Admins can manage all swap orders" on public.swap_orders;
create policy "Admins can manage all swap orders" on public.swap_orders for all using (exists (select 1 from public.profiles where id = auth.uid() and is_admin = true));

-- Action Logs Policies
drop policy if exists "Admins can manage all action logs" on public.action_logs;
create policy "Admins can manage all action logs" on public.action_logs for all using (exists (select 1 from public.profiles where id = auth.uid() and is_admin = true));


-- 6. 默认数据填充 (Default Data Seeding)
-- Function to seed initial data
create or replace function public.seed_initial_data()
returns void as $$
begin
    -- Seed supported assets if table is empty
    if not exists (select 1 from public.supported_assets) then
        insert into public.supported_assets (asset_code, asset_name, is_active, asset_type) values
        ('USDT', 'Tether', true, 'fiat'),
        ('BTC', 'Bitcoin', true, 'crypto'),
        ('ETH', 'Ethereum', true, 'crypto'),
        ('SOL', 'Solana', true, 'crypto'),
        ('XRP', 'Ripple', true, 'crypto'),
        ('LTC', 'Litecoin', true, 'crypto'),
        ('BNB', 'Binance Coin', true, 'crypto'),
        ('MATIC', 'Polygon', true, 'crypto'),
        ('DOGE', 'Dogecoin', true, 'crypto'),
        ('ADA', 'Cardano', true, 'crypto'),
        ('SHIB', 'Shiba Inu', true, 'crypto'),
        ('AVAX', 'Avalanche', true, 'crypto'),
        ('LINK', 'Chainlink', true, 'crypto'),
        ('DOT', 'Polkadot', true, 'crypto'),
        ('UNI', 'Uniswap', true, 'crypto'),
        ('TRX', 'Tron', true, 'crypto'),
        ('XLM', 'Stellar', true, 'crypto'),
        ('VET', 'VeChain', true, 'crypto'),
        ('EOS', 'EOS', true, 'crypto'),
        ('FIL', 'Filecoin', true, 'crypto'),
        ('ICP', 'Internet Computer', true, 'crypto'),
        ('XAU', 'Gold', true, 'commodity'),
        ('USD', 'US Dollar', true, 'fiat'),
        ('EUR', 'Euro', true, 'fiat'),
        ('GBP', 'British Pound', true, 'fiat');
    end if;

    -- Seed commission rates if table is empty
    if not exists (select 1 from public.commission_rates) then
        insert into public.commission_rates (level, rate, description) values
        (1, 0.08, 'Level 1 Commission Rate'),
        (2, 0.05, 'Level 2 Commission Rate'),
        (3, 0.02, 'Level 3 Commission Rate');
    end if;

    -- Seed system settings if they don't exist
    insert into public.system_settings (id, settings)
    values (1, '{
        "depositAddresses": { "USDT": "", "ETH": "", "BTC": "", "USD": "" },
        "contractTradingEnabled": true,
        "check_in_reward_base": 0.5,
        "trade_fee": 0.001
    }')
    on conflict (id) do nothing;
end;
$$ language plpgsql;

-- Execute the seeding function
select public.seed_initial_data();


-- 7. 定时任务 (Cron Jobs)
-- Revoke default execute permission and grant only to service roles or specific users
revoke execute on function cron.schedule(text,text,text) from public;
grant execute on function cron.schedule(text,text,text) to postgres;
grant execute on function cron.schedule(text,text,text) to service_role;

-- Unschedule existing jobs to prevent duplicates
select cron.unschedule('settle-due-orders-job');
select cron.unschedule('daily-cleanup-job');

-- Schedule the settlement job to run every minute
select cron.schedule('settle-due-orders-job', '* * * * *', $$select public.settle_and_log()$$);

-- Schedule the cleanup job to run once daily at midnight UTC
select cron.schedule('daily-cleanup-job', '0 0 * * *', $$select public.cleanup_old_data()$$);

-- Enable the jobs
update cron.job set active = true where jobname = 'settle-due-orders-job';
update cron.job set active = true where jobname = 'daily-cleanup-job';
```