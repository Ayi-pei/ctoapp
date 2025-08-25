-- =================================================================
-- 1. EXTENSIONS
-- =================================================================
-- Enable necessary extensions if they are not already enabled.
create extension if not exists "uuid-ossp" with schema extensions;
create extension if not exists "pgcrypto" with schema extensions;
create extension if not exists "pg_cron" with schema extensions;


-- =================================================================
-- 2. TABLE CREATION
-- =================================================================
-- Core user profile table, linked to auth.users
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
comment on table public.profiles is 'Stores public user profile information.';

-- Supported assets for the platform (crypto and fiat)
create table if not exists public.supported_assets (
    asset_id text primary key,
    asset_type text not null check (asset_type in ('crypto', 'fiat')),
    is_active boolean default true,
    created_at timestamp with time zone default now()
);
comment on table public.supported_assets is 'Manages which assets are supported on the platform.';

-- User balances for each supported asset
create table if not exists public.balances (
  id bigserial primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  asset text not null references public.supported_assets(asset_id),
  available_balance double precision default 0,
  frozen_balance double precision default 0,
  unique(user_id, asset)
);
comment on table public.balances is 'Stores user asset balances.';

-- Trades table for both spot and contract trades
create table if not exists public.trades (
  id bigserial primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  trading_pair text not null,
  orderType text not null check (orderType in ('spot', 'contract')),
  type text not null check (type in ('buy', 'sell')),
  status text not null, -- spot: 'filled', 'cancelled'; contract: 'active', 'settled'
  amount double precision not null, -- For spot, this is base_asset qty; for contract, it's the investment amount in quote_asset
  -- For Spot Trades
  total double precision, -- Total amount in quote_asset
  price double precision,
  base_asset text,
  quote_asset text,
  -- For Contract Trades
  entry_price double precision,
  settlement_time timestamp with time zone,
  period integer,
  profit_rate double precision,
  settlement_price double precision,
  outcome text, -- 'win' or 'loss'
  profit double precision,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);
comment on table public.trades is 'Records all spot and contract trades.';

-- Investment records
create table if not exists public.investments (
    id bigserial primary key,
    user_id uuid not null references public.profiles(id) on delete cascade,
    product_name text not null,
    amount double precision not null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    settlement_date timestamp with time zone not null,
    status text not null check (status in ('active', 'settled')),
    category text, -- 'staking', 'finance'
    profit double precision,
    productType text, -- 'daily', 'hourly'
    daily_rate double precision,
    period integer,
    staking_asset text,
    staking_amount double precision,
    duration_hours integer,
    hourly_rate double precision
);
comment on table public.investments is 'Records all user investments in financial products.';

-- Commission rates for the referral system
create table if not exists public.commission_rates (
    level integer primary key,
    rate double precision not null,
    check (level >= 1 and level <= 3)
);
comment on table public.commission_rates is 'Defines commission rates for different referral levels.';

-- Logs for all rewards and commissions
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
comment on table public.reward_logs is 'Logs all rewards and commissions issued to users.';

-- User requests (deposit, withdrawal, password reset)
create table if not exists public.requests (
    id bigserial primary key,
    user_id uuid not null references public.profiles(id) on delete cascade,
    type text not null check (type in ('deposit', 'withdrawal', 'password_reset')),
    asset text,
    amount double precision,
    address text,
    transaction_hash text,
    new_password text,
    status text not null check (status in ('pending', 'approved', 'rejected')),
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);
comment on table public.requests is 'Tracks user requests requiring admin approval.';

-- Single-row table for global system settings
create table if not exists public.system_settings (
  id int primary key default 1,
  settings jsonb,
  constraint single_row_check check (id = 1)
);
comment on table public.system_settings is 'Stores global system configurations in a single JSONB column.';

-- Announcements table for personal, carousel, and horn messages
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
    is_read boolean default false
);
create unique index if not exists announcements_type_singleton_idx on public.announcements (type) where user_id is null;
comment on table public.announcements is 'Stores various types of announcements.';

-- Limited-time activities
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
    status text, -- 'published', 'draft'
    trigger text unique
);
comment on table public.daily_tasks is 'Defines the daily tasks available to users.';

-- User task completion states
create table if not exists public.user_task_states (
    id bigserial primary key,
    user_id uuid not null references public.profiles(id) on delete cascade,
    taskId text not null references public.daily_tasks(trigger) on delete cascade,
    date date not null,
    completed boolean default false,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    unique(user_id, taskId, date)
);
comment on table public.user_task_states is 'Tracks daily task completion for each user.';

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
comment on table public.action_logs is 'Logs actions performed by administrators.';

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
comment on table public.swap_orders is 'Stores P2P swap orders.';

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
comment on table public.investment_products is 'Defines all available investment products.';

-- Cron job execution logs
create table if not exists public.cron_job_logs (
    id bigserial primary key,
    job_name text not null,
    run_status text not null,
    details jsonb,
    started_at timestamp with time zone default now(),
    finished_at timestamp with time zone
);
comment on table public.cron_job_logs is 'Logs the execution status of cron jobs.';

-- Real-time market summary data
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

-- Real-time market K-line data
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
-- Future proofing: Suggestion for table partitioning for very large datasets
comment on table public.market_kline_data is 'Stores OHLC data. For large-scale production, partitioning this table by date range (e.g., monthly) is recommended for performance.';


-- =================================================================
-- 3. INITIAL DATA SEEDING
-- =================================================================
-- Seed supported assets
insert into public.supported_assets (asset_id, asset_type, is_active) values
('USDT', 'crypto', true),
('BTC', 'crypto', true),
('ETH', 'crypto', true),
('SOL', 'crypto', true),
('XRP', 'crypto', true),
('LTC', 'crypto', true),
('BNB', 'crypto', true),
('USD', 'fiat', true),
('EUR', 'fiat', true)
on conflict (asset_id) do nothing;

-- Seed commission rates
insert into public.commission_rates (level, rate) values
(1, 0.08),
(2, 0.05),
(3, 0.02)
on conflict (level) do update set rate = excluded.rate;

-- Seed default system settings as a single JSONB object
insert into public.system_settings (id, settings) values (1, '{
    "contractTradingEnabled": true,
    "check_in_reward_base": 0.5,
    "check_in_reward_multiplier": 1.5,
    "trade_fee": 0.001
}') on conflict (id) do update set settings = excluded.settings;


-- =================================================================
-- 4. FUNCTIONS AND TRIGGERS
-- =================================================================

-- Function to create a profile for a new user and initialize balances
create or replace function public.handle_new_user()
returns trigger as $$
declare
    v_asset_id text;
begin
    -- Create a profile
    insert into public.profiles (id, username, email, invitation_code, avatar_url, inviter_id)
    values (
        new.id,
        new.raw_user_meta_data->>'username',
        new.email,
        new.raw_user_meta_data->>'invitation_code',
        new.raw_user_meta_data->>'avatar_url',
        (new.raw_user_meta_data->>'inviter_id')::uuid
    );

    -- Initialize balances for all supported assets
    for v_asset_id in select asset_id from public.supported_assets where is_active = true loop
        insert into public.balances (user_id, asset, available_balance, frozen_balance)
        values (new.id, v_asset_id, 0, 0);
    end loop;

    return new;
end;
$$ language plpgsql security definer;

-- Trigger to call the function when a new user signs up
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();


-- Function to adjust user balances safely with overdraft protection
create or replace function public.adjust_balance(
    p_user_id uuid,
    p_asset text,
    p_amount double precision,
    p_is_frozen boolean default false,
    p_is_debit_frozen boolean default false
)
returns void as $$
declare
    v_available_balance double precision;
    v_frozen_balance double precision;
begin
    -- Lock the user's balance row to prevent race conditions
    select available_balance, frozen_balance into v_available_balance, v_frozen_balance
    from public.balances
    where user_id = p_user_id and asset = p_asset
    for update;

    if p_is_debit_frozen then
        -- This branch handles movements from the frozen balance (e.g., confirming a withdrawal)
        if v_frozen_balance < p_amount then
            raise exception 'Insufficient frozen balance for user % and asset %', p_user_id, p_asset;
        end if;
        update public.balances
        set frozen_balance = frozen_balance - p_amount
        where user_id = p_user_id and asset = p_asset;
    elsif p_is_frozen then
         -- This branch handles freezing funds (e.g., creating a withdrawal request)
        if v_available_balance < p_amount then
            raise exception 'Insufficient available balance for user % and asset %', p_user_id, p_asset;
        end if;
        update public.balances
        set
            available_balance = available_balance - p_amount,
            frozen_balance = frozen_balance + p_amount
        where user_id = p_user_id and asset = p_asset;
    else
        -- This is a standard adjustment to the available balance (e.g., deposit, commission)
        -- For debits, check for sufficient funds
        if p_amount < 0 and v_available_balance < abs(p_amount) then
            raise exception 'Insufficient available balance for user % and asset %', p_user_id, p_asset;
        end if;
        update public.balances
        set available_balance = available_balance + p_amount
        where user_id = p_user_id and asset = p_asset;
    end if;
end;
$$ language plpgsql volatile;


-- Function to get the full downline of a user (up to 3 levels)
drop function if exists public.get_downline(uuid);
create function public.get_downline(p_user_id uuid)
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
    where d.level < 3
  )
  select * from downline;
end;
$$ language plpgsql stable;

-- Function to get total platform balance (USDT only)
drop function if exists public.get_total_platform_balance();
create or replace function public.get_total_platform_balance()
returns double precision as $$
begin
  return (select coalesce(sum(available_balance + frozen_balance), 0) from public.balances where asset = 'USDT');
end;
$$ language plpgsql stable;


-- Function to distribute commissions up to 3 levels
create or replace function public.distribute_trade_commissions()
returns trigger as $$
declare
    v_inviter_id uuid;
    v_source_user public.profiles;
    v_commission_amount double precision;
    v_trade_amount double precision;
    v_rate double precision;
begin
    -- Only distribute commissions for trades where USDT is the quote asset
    if new.quote_asset = 'USDT' then
        
        v_trade_amount := coalesce(new.total, new.amount, 0);

        select * into v_source_user from public.profiles where id = new.user_id;
        v_inviter_id := v_source_user.inviter_id;

        -- Loop up to 3 levels
        for level in 1..3 loop
            if v_inviter_id is null then
                exit; -- Exit loop if no more inviters
            end if;

            -- Get commission rate from the configuration table
            select rate into v_rate from public.commission_rates where commission_rates.level = level;

            if found and v_rate > 0 then
                v_commission_amount := v_trade_amount * v_rate;
                
                -- Use the adjust_balance function to add commission
                perform public.adjust_balance(v_inviter_id, 'USDT', v_commission_amount);

                -- Log the commission
                insert into public.reward_logs (user_id, type, amount, asset, source_id, source_username, source_level, description)
                values (
                    v_inviter_id, 'team', v_commission_amount, 'USDT', new.id::text, v_source_user.username,
                    level, 'Level ' || level || ' commission from trade ' || new.id
                );
            end if;

            -- Get the next inviter up the chain, and lock the row to prevent race conditions
            select inviter_id into v_inviter_id from public.profiles where id = v_inviter_id for update;
        end loop;
    end if;

    return new;
end;
$$ language plpgsql;

-- Trigger to distribute commissions after a trade is inserted
drop trigger if exists on_trade_inserted on public.trades;
create trigger on_trade_inserted
  after insert on public.trades
  for each row
  when (new.status = 'filled' or new.status = 'active') -- Only for successful trades
  execute procedure public.distribute_trade_commissions();


-- Function to handle daily check-ins
create or replace function public.handle_user_check_in(p_user_id uuid)
returns table (success boolean, message text, reward_amount double precision) as $$
declare
    v_today date := current_date;
    v_last_check_in date;
    v_consecutive_days int;
    v_new_consecutive_days int;
    v_reward_base double precision;
    v_reward_multiplier double precision;
    v_reward double precision;
begin
    select last_check_in_date, consecutive_check_ins into v_last_check_in, v_consecutive_days
    from public.profiles where id = p_user_id;

    if v_last_check_in = v_today then
        return query select false, 'You have already checked in today.', 0.0;
        return;
    end if;

    -- Calculate consecutive days
    if v_last_check_in = v_today - interval '1 day' then
        v_new_consecutive_days := (v_consecutive_days % 7) + 1;
    else
        v_new_consecutive_days := 1;
    end if;

    -- Get reward config from settings
    select (settings->>'check_in_reward_base')::double precision,
           (settings->>'check_in_reward_multiplier')::double precision
    into v_reward_base, v_reward_multiplier
    from public.system_settings where id = 1;
    
    v_reward_base := coalesce(v_reward_base, 0.5); -- Default if not set
    v_reward_multiplier := coalesce(v_reward_multiplier, 1.5); -- Default if not set

    -- Calculate reward
    v_reward := v_reward_base * power(v_reward_multiplier, v_new_consecutive_days - 1);

    -- Update profile
    update public.profiles
    set last_check_in_date = v_today,
        consecutive_check_ins = v_new_consecutive_days
    where id = p_user_id;

    -- Grant reward
    perform public.adjust_balance(p_user_id, 'USDT', v_reward);

    -- Log reward
    insert into public.reward_logs (user_id, type, amount, asset, description)
    values (p_user_id, 'check_in', v_reward, 'USDT', 'Daily check-in reward for day ' || v_new_consecutive_days);

    return query select true, 'Check-in successful!', v_reward;
end;
$$ language plpgsql volatile;


-- Function to settle due trades and investments
create or replace function public.settle_due_records()
returns jsonb as $$
declare
    rec record;
    settled_trades int := 0;
    settled_investments int := 0;
    quote_asset text;
    profit double precision;
    total_return double precision;
begin
    -- Settle contract trades
    for rec in select * from public.trades where status = 'active' and settlement_time <= now() for update skip locked loop
        -- Determine quote asset from trading pair
        quote_asset := split_part(rec.trading_pair, '/', 2);

        -- Recalculate settlement price based on latest market data for accuracy
        select price into rec.settlement_price from public.market_summary_data where pair = rec.trading_pair;

        if rec.type = 'buy' then
            rec.outcome := case when rec.settlement_price > rec.entry_price then 'win' else 'loss' end;
        else -- sell
            rec.outcome := case when rec.settlement_price < rec.entry_price then 'win' else 'loss' end;
        end if;

        rec.profit := case when rec.outcome = 'win' then rec.amount * rec.profit_rate else -rec.amount end;
        total_return := case when rec.outcome = 'win' then rec.amount + rec.profit else 0 end;

        -- Unfreeze and return funds
        perform public.adjust_balance(rec.user_id, quote_asset, rec.amount, true, true); -- Debit from frozen
        if total_return > 0 then
             perform public.adjust_balance(rec.user_id, quote_asset, total_return); -- Credit to available
        end if;

        update public.trades set status = 'settled', outcome = rec.outcome, settlement_price = rec.settlement_price, profit = rec.profit where id = rec.id;
        settled_trades := settled_trades + 1;
    end loop;

    -- Settle investments
    for rec in select * from public.investments where status = 'active' and settlement_date <= now() for update skip locked loop
        -- Calculate profit based on product type
        if rec.productType = 'daily' and rec.daily_rate is not null and rec.period is not null then
            rec.profit := rec.amount * rec.daily_rate * rec.period;
        elsif rec.productType = 'hourly' and rec.hourly_rate is not null then
            rec.profit := rec.amount * rec.hourly_rate;
        else
            rec.profit := 0;
        end if;
        
        total_return := rec.amount + rec.profit;
        
        perform public.adjust_balance(rec.user_id, 'USDT', total_return);

        update public.investments set status = 'settled', profit = rec.profit where id = rec.id;
        settled_investments := settled_investments + 1;
    end loop;

    return jsonb_build_object('settled_trades', settled_trades, 'settled_investments', settled_investments);
end;
$$ language plpgsql;


-- Wrapper function for cron job logging
create or replace function public.settle_and_log()
returns void as $$
declare
    log_id int;
    result jsonb;
    error_details text;
begin
    insert into public.cron_job_logs (job_name, run_status, details)
    values ('settle_due_records', 'started', null) returning id into log_id;

    begin
        result := public.settle_due_records();
        update public.cron_job_logs
        set run_status = 'success', details = result, finished_at = now()
        where id = log_id;
    exception
        when others then
            get stacked diagnostics error_details = pg_exception_context || E'\n' || message_text;
            update public.cron_job_logs
            set run_status = 'failed', details = jsonb_build_object('error', error_details), finished_at = now()
            where id = log_id;
    end;
end;
$$ language plpgsql;

-- =================================================================
-- 5. INDEXING
-- =================================================================
create index if not exists idx_profiles_invitation_code on public.profiles(invitation_code);
create index if not exists idx_balances_user_asset on public.balances(user_id, asset);
create index if not exists idx_trades_status_time on public.trades(status, settlement_time);
create index if not exists idx_trades_user_id on public.trades(user_id);
create index if not exists idx_trades_pair_status_time on public.trades(trading_pair, status, settlement_time);
create index if not exists idx_investments_status_date on public.investments(status, settlement_date);
create index if not exists idx_investments_user_id on public.investments(user_id);
create index if not exists idx_reward_logs_user_id_time on public.reward_logs(user_id, created_at);
create index if not exists idx_user_task_states_user_date on public.user_task_states(user_id, date);
create index if not exists idx_market_kline_data_time on public.market_kline_data(time desc);
create index if not exists idx_swap_orders_status on public.swap_orders(status);

-- =================================================================
-- 6. ROW LEVEL SECURITY (RLS)
-- =================================================================
alter table public.profiles enable row level security;
alter table public.balances enable row level security;
alter table public.trades enable row level security;
alter table public.investments enable row level security;
alter table public.requests enable row level security;
alter table public.reward_logs enable row level security;
alter table public.user_task_states enable row level security;
alter table public.swap_orders enable row level security;
alter table public.action_logs enable row level security;
alter table public.announcements enable row level security;
alter table public.activities enable row level security;
-- System tables are not user-facing, so they don't need RLS in the same way.

-- Function to check for admin role
create or replace function public.is_admin()
returns boolean as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and is_admin = true
  );
$$ language sql security definer;


-- -- PROFILES --
drop policy if exists "Allow public read access to profiles" on public.profiles;
create policy "Allow public read access to profiles" on public.profiles for select using (true);
drop policy if exists "Users can insert their own profile" on public.profiles;
create policy "Users can insert their own profile" on public.profiles for insert with check (auth.uid() = id);
drop policy if exists "Users can update their own profile" on public.profiles;
create policy "Users can update their own profile" on public.profiles for update using (auth.uid() = id);
drop policy if exists "Admins can manage all profiles" on public.profiles;
create policy "Admins can manage all profiles" on public.profiles for all using (public.is_admin());

-- -- BALANCES --
drop policy if exists "Users can view their own balances" on public.balances;
create policy "Users can view their own balances" on public.balances for select using (auth.uid() = user_id);
drop policy if exists "Admins can manage all balances" on public.balances;
create policy "Admins can manage all balances" on public.balances for all using (public.is_admin());

-- -- TRADES --
drop policy if exists "Users can manage their own trades" on public.trades;
create policy "Users can manage their own trades" on public.trades for all using (auth.uid() = user_id);
drop policy if exists "Admins can manage all trades" on public.trades;
create policy "Admins can manage all trades" on public.trades for all using (public.is_admin());

-- -- INVESTMENTS --
drop policy if exists "Users can manage their own investments" on public.investments;
create policy "Users can manage their own investments" on public.investments for all using (auth.uid() = user_id);
drop policy if exists "Admins can manage all investments" on public.investments;
create policy "Admins can manage all investments" on public.investments for all using (public.is_admin());

-- -- REQUESTS --
drop policy if exists "Users can manage their own requests" on public.requests;
create policy "Users can manage their own requests" on public.requests for all using (auth.uid() = user_id);
drop policy if exists "Admins can manage all requests" on public.requests;
create policy "Admins can manage all requests" on public.requests for all using (public.is_admin());

-- -- REWARD_LOGS --
drop policy if exists "Users can view their own reward logs" on public.reward_logs;
create policy "Users can view their own reward logs" on public.reward_logs for select using (auth.uid() = user_id);
drop policy if exists "Admins can view all reward logs" on public.reward_logs;
create policy "Admins can view all reward logs" on public.reward_logs for select using (public.is_admin());

-- -- USER_TASK_STATES --
drop policy if exists "Users can manage their own task states" on public.user_task_states;
create policy "Users can manage their own task states" on public.user_task_states for all using (auth.uid() = user_id);
drop policy if exists "Admins can manage all task states" on public.user_task_states;
create policy "Admins can manage all task states" on public.user_task_states for all using (public.is_admin());

-- -- SWAP_ORDERS --
drop policy if exists "Users can view all open swap orders" on public.swap_orders;
create policy "Users can view all open swap orders" on public.swap_orders for select using (true);
drop policy if exists "Users can manage their own swap orders" on public.swap_orders;
create policy "Users can manage their own swap orders" on public.swap_orders for all using (auth.uid() = user_id or auth.uid() = taker_id);
drop policy if exists "Admins can manage all swap orders" on public.swap_orders;
create policy "Admins can manage all swap orders" on public.swap_orders for all using (public.is_admin());

-- -- ADMIN-ONLY TABLES --
drop policy if exists "Admins can manage all system settings" on public.system_settings;
create policy "Admins can manage all system settings" on public.system_settings for all using (public.is_admin());
drop policy if exists "Admins can manage all action logs" on public.action_logs;
create policy "Admins can manage all action logs" on public.action_logs for all using (public.is_admin());
drop policy if exists "Admins can manage all tasks" on public.daily_tasks;
create policy "Admins can manage all tasks" on public.daily_tasks for all using (public.is_admin());
drop policy if exists "Admins can manage all activities" on public.activities;
create policy "Admins can manage all activities" on public.activities for all using (public.is_admin());
drop policy if exists "Admins can manage all investment products" on public.investment_products;
create policy "Admins can manage all investment products" on public.investment_products for all using (public.is_admin());

-- -- ANNOUNCEMENTS --
drop policy if exists "Allow read access to all announcements" on public.announcements;
create policy "Allow read access to all announcements" on public.announcements for select using (true);
drop policy if exists "Admins can manage all announcements" on public.announcements;
create policy "Admins can manage all announcements" on public.announcements for all using (public.is_admin());


-- =================================================================
-- 7. CRON JOBS
-- =================================================================
-- Schedule the settlement job to run every minute
select cron.schedule('settle-due-orders-job', '* * * * *', $$select public.settle_and_log()$$);

-- Schedule a job to clean up old cron logs (e.g., older than 7 days)
select cron.schedule('cleanup-cron-logs', '0 0 * * *', $$delete from public.cron_job_logs where started_at < now() - interval '7 days'$$);

-- Schedule a job to clean up expired activities
select cron.schedule('cleanup-expired-activities', '0 1 * * *', $$delete from public.activities where "expiresAt" < now()$$);
