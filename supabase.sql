-- supabase.sql

-- 1. 扩展 (Extensions)
-- 开启必要的扩展，如果不存在的话
create extension if not exists "uuid-ossp" with schema public;
create extension if not exists pgcrypto with schema public;
create extension if not exists pg_cron with schema public;


-- 2. 数据库表结构 (Tables)
-- 按功能模块组织，并使用 `if not exists` 保证幂等性

-- ========== 用户与认证体系 ==========
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
  avatar_url text
);
comment on table public.profiles is 'Stores all user public profiles, linked to auth.users.';
-- 索引
create index if not exists profiles_inviter_id_idx on public.profiles (inviter_id);
create index if not exists profiles_invitation_code_idx on public.profiles (invitation_code);


create table if not exists public.balances (
  id bigserial primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  asset text not null,
  available_balance double precision default 0,
  frozen_balance double precision default 0,
  unique(user_id, asset)
);
comment on table public.balances is 'Stores user asset balances.';


create table if not exists public.requests (
    id bigserial primary key,
    user_id uuid not null references public.profiles(id) on delete cascade,
    type text not null, -- 'deposit', 'withdrawal', 'password_reset'
    asset text,
    amount double precision,
    address text,
    transaction_hash text,
    new_password text,
    status text not null, -- 'pending', 'approved', 'rejected'
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);
comment on table public.requests is 'Tracks user requests like deposits, withdrawals, and password resets.';
create index if not exists requests_user_id_status_idx on public.requests (user_id, status);


-- ========== 交易与投资 ==========
create table if not exists public.trades (
  id bigserial primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  trading_pair text not null,
  orderType text not null check (orderType in ('spot', 'contract')),
  type text not null check (type in ('buy', 'sell')),
  status text not null, -- spot: 'filled'; contract: 'active', 'settled'
  amount double precision not null, -- For spot, it's base asset qty. For contract, it's quote asset investment.
  -- For Spot Trades
  total double precision, -- a.k.a quote_asset_amount
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
-- 索引
create index if not exists trades_user_id_idx on public.trades (user_id);
create index if not exists trades_status_settlement_time_idx on public.trades (status, settlement_time) where status = 'active';


create table if not exists public.investments (
    id bigserial primary key,
    user_id uuid not null references public.profiles(id) on delete cascade,
    product_name text not null,
    amount double precision not null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    settlement_date timestamp with time zone not null,
    status text not null, -- 'active', 'settled'
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
comment on table public.investments is 'Records user investments in financial products.';
-- 索引
create index if not exists investments_user_id_idx on public.investments (user_id);
create index if not exists investments_status_settlement_date_idx on public.investments (status, settlement_date) where status = 'active';


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
comment on table public.investment_products is 'Configuration for all investment products.';


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
comment on table public.swap_orders is 'Peer-to-peer swap orders.';


-- ========== 运营与活动 ==========
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
comment on table public.daily_tasks is 'Definitions for daily tasks available to users.';

create table if not exists public.user_task_states (
    id bigserial primary key,
    user_id uuid not null references public.profiles(id) on delete cascade,
    taskId text not null references public.daily_tasks(trigger) on delete cascade,
    date date not null,
    completed boolean default false,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    unique(user_id, taskId, date)
);
comment on table public.user_task_states is 'Tracks user completion of daily tasks.';
create index if not exists user_task_states_user_id_date_idx on public.user_task_states (user_id, date);


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
comment on table public.activities is 'Configuration for limited-time activities.';


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
-- A partial unique index to allow multiple rows for personal_message but only one for singletons
create unique index if not exists announcements_singletons_unique_idx on public.announcements (type) where user_id is null;
comment on table public.announcements is 'Stores various types of announcements.';


-- ========== 系统与市场 ==========
create table if not exists public.system_settings (
  id int primary key default 1,
  settings jsonb,
  constraint single_row_check check (id = 1)
);
comment on table public.system_settings is 'A single-row table for global system configurations.';


create table if not exists public.commission_rates (
    level integer primary key,
    rate double precision not null,
    check (level in (1,2,3))
);
comment on table public.commission_rates is 'Dynamic commission rates for the team feature.';
-- Seed default commission rates if table is empty
insert into public.commission_rates (level, rate) values (1, 0.08), (2, 0.05), (3, 0.02) on conflict (level) do nothing;


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
comment on table public.market_summary_data is 'Stores real-time market summary data for all pairs.';


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
comment on table public.market_kline_data is 'Stores OHLC (candlestick) data for market charts.';
create index if not exists market_kline_data_time_idx on public.market_kline_data (time desc);


-- ========== 日志与审计 ==========
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


create table if not exists public.cron_job_logs (
    id bigserial primary key,
    job_name text not null,
    run_at timestamp with time zone default timezone('utc'::text, now()) not null,
    duration_ms integer,
    status text, -- 'success', 'error'
    message text,
    records_affected integer
);
comment on table public.cron_job_logs is 'Logs the execution of scheduled cron jobs.';


create table if not exists public.reward_logs (
    id bigserial primary key,
    user_id uuid not null references public.profiles(id) on delete cascade,
    type text not null, -- 'dailyTask', 'team', 'event', 'system'
    amount double precision not null,
    asset text not null,
    source_id text,
    source_username text,
    source_level integer,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    description text
);
comment on table public.reward_logs is 'Logs all rewards and commissions credited to users.';
create index if not exists reward_logs_user_id_created_at_idx on public.reward_logs (user_id, created_at desc);


-- 3. 数据库函数 (Functions)

-- Function to create profile and initial balances for a new user
create or replace function public.handle_new_user()
returns trigger as $$
declare
  supported_assets text[] := array['USDT', 'BTC', 'ETH', 'SOL', 'XRP', 'LTC', 'BNB', 'MATIC', 'DOGE', 'ADA', 'SHIB', 'AVAX', 'LINK', 'DOT', 'UNI', 'TRX', 'XLM', 'VET', 'EOS', 'FIL', 'ICP', 'XAU', 'USD', 'EUR', 'GBP'];
  asset_name text;
begin
  -- Insert a new profile
  insert into public.profiles (id, username, nickname, email, inviter_id, is_test_user, invitation_code, avatar_url)
  values (
    new.id,
    new.raw_user_meta_data ->> 'username',
    new.raw_user_meta_data ->> 'nickname',
    new.email,
    (new.raw_user_meta_data ->> 'inviter_id')::uuid,
    coalesce((new.raw_user_meta_data ->> 'is_test_user')::boolean, true),
    new.raw_user_meta_data ->> 'invitation_code',
    new.raw_user_meta_data ->> 'avatar_url'
  );

  -- Create balance entries for all supported assets
  foreach asset_name in array supported_assets
  loop
    insert into public.balances (user_id, asset, available_balance)
    values (new.id, asset_name, 0);
  end loop;

  return new;
end;
$$ language plpgsql security definer;


-- Function to safely adjust user balances
create or replace function public.adjust_balance(
    p_user_id uuid,
    p_asset text,
    p_amount double precision,
    p_is_debit boolean default false,
    p_from_frozen boolean default false,
    p_to_frozen boolean default false
)
returns void as $$
begin
    if p_is_debit then
        if p_from_frozen then
            update public.balances set frozen_balance = frozen_balance - p_amount where user_id = p_user_id and asset = p_asset;
        else
            update public.balances set available_balance = available_balance - p_amount where user_id = p_user_id and asset = p_asset;
        end if;
    else -- is credit
        if p_to_frozen then
            update public.balances set frozen_balance = frozen_balance + p_amount where user_id = p_user_id and asset = p_asset;
        else
            update public.balances set available_balance = available_balance + p_amount where user_id = p_user_id and asset = p_asset;
        end if;
    end if;
end;
$$ language plpgsql volatile security definer;


-- Function to get the full downline of a user up to 3 levels
drop function if exists public.get_downline(uuid);
create function public.get_downline(p_user_id uuid)
returns table(id uuid, username text, nickname text, email text, inviter_id uuid, is_admin boolean, is_test_user boolean, is_frozen boolean, invitation_code text, credit_score integer, created_at timestamp with time zone, last_login_at timestamp with time zone, avatar_url text, level int) as $$
begin
  return query
  with recursive downline as (
    select p.*, 1 as level
    from public.profiles p
    where p.inviter_id = p_user_id
    union all
    select p.*, d.level + 1
    from public.profiles p
    inner join downline d on p.inviter_id = d.id
    where d.level < 3
  )
  select d.id, d.username, d.nickname, d.email, d.inviter_id, d.is_admin, d.is_test_user, d.is_frozen, d.invitation_code, d.credit_score, d.created_at, d.last_login_at, d.avatar_url, d.level from downline d;
end;
$$ language plpgsql;


-- Function to get total platform balance (USDT)
drop function if exists public.get_total_platform_balance();
create function public.get_total_platform_balance()
returns double precision as $$
begin
  return (select sum(available_balance + frozen_balance) from public.balances where asset = 'USDT');
end;
$$ language plpgsql;


-- Function to distribute commissions up to 3 levels from a trade
create or replace function public.distribute_trade_commissions()
returns trigger as $$
declare
    v_inviter_id uuid;
    v_source_user public.profiles;
    v_commission_amount double precision;
    v_trade_amount double precision;
    v_rate double precision;
    v_quote_asset text;
begin
    v_quote_asset := coalesce(new.quote_asset, split_part(new.trading_pair, '/', 2));

    -- We only care about trades where a commissionable asset (like USDT) is paid
    if v_quote_asset is not null then
        
        v_trade_amount := coalesce(new.total, new.amount, 0);

        select * into v_source_user from public.profiles where id = new.user_id;
        v_inviter_id := v_source_user.inviter_id;

        for level in 1..3 loop
            if v_inviter_id is null then exit; end if;

            select rate into v_rate from public.commission_rates where commission_rates.level = level;

            if v_rate is not null and v_rate > 0 then
                v_commission_amount := v_trade_amount * v_rate;
                
                perform public.adjust_balance(v_inviter_id, v_quote_asset, v_commission_amount);

                insert into public.reward_logs (user_id, type, amount, asset, source_id, source_username, source_level, description)
                values (v_inviter_id, 'team', v_commission_amount, v_quote_asset, new.id::text, v_source_user.username, level, 'Level ' || level || ' commission from trade ' || new.id);
            end if;

            select inviter_id into v_inviter_id from public.profiles where id = v_inviter_id;
        end loop;
    end if;

    return new;
end;
$$ language plpgsql;


-- Function to settle all due trades and investments
create or replace function public.settle_due_records()
returns integer as $$
declare
    trade_record record;
    investment_record record;
    settled_count integer := 0;
    quote_asset text;
    profit_or_loss double precision;
begin
    -- Settle contract trades
    for trade_record in
        select * from public.trades
        where status = 'active' and settlement_time <= now()
        loop
            quote_asset := coalesce(trade_record.quote_asset, split_part(trade_record.trading_pair, '/', 2));
            
            -- In a real scenario, you'd fetch the settlement price from market_summary_data
            -- For this simulation, we'll use entry price to simulate win/loss
            if (random() > 0.5) then -- Simulate win
                profit_or_loss := trade_record.amount * trade_record.profit_rate;
                update public.trades set status = 'settled', outcome = 'win', profit = profit_or_loss where id = trade_record.id;
                perform public.adjust_balance(trade_record.user_id, quote_asset, trade_record.amount + profit_or_loss, false, true); -- credit available, debit frozen
            else -- Simulate loss
                profit_or_loss := -trade_record.amount;
                update public.trades set status = 'settled', outcome = 'loss', profit = profit_or_loss where id = trade_record.id;
                perform public.adjust_balance(trade_record.user_id, quote_asset, 0, false, true); -- debit frozen, no credit
            end if;
            settled_count := settled_count + 1;
    end loop;

    -- Settle investments
    for investment_record in
        select * from public.investments
        where status = 'active' and settlement_date <= now()
        loop
            if investment_record.productType = 'daily' then
                profit_or_loss := investment_record.amount * investment_record.daily_rate * investment_record.period;
            elsif investment_record.productType = 'hourly' then
                profit_or_loss := investment_record.amount * investment_record.hourly_rate;
            else
                profit_or_loss := 0;
            end if;
            
            update public.investments set status = 'settled', profit = profit_or_loss where id = investment_record.id;
            
            -- Return principal + profit
            perform public.adjust_balance(investment_record.user_id, 'USDT', investment_record.amount + profit_or_loss);
            
            -- Unstake asset if applicable
            if investment_record.staking_asset is not null and investment_record.staking_amount is not null then
                 perform public.adjust_balance(investment_record.user_id, investment_record.staking_asset, investment_record.staking_amount, false, true);
            end if;
            
            settled_count := settled_count + 1;
    end loop;

    return settled_count;
end;
$$ language plpgsql volatile security definer;


-- Wrapper function for cron job logging
create or replace function public.settle_and_log()
returns void as $$
declare
    start_time timestamptz;
    end_time timestamptz;
    records_affected integer;
    error_message text;
begin
    start_time := clock_timestamp();
    begin
        select public.settle_due_records() into records_affected;
        error_message := 'success';
    exception when others then
        error_message := SQLERRM;
        records_affected := 0;
    end;
    end_time := clock_timestamp();

    insert into public.cron_job_logs(job_name, duration_ms, status, message, records_affected)
    values ('settle_due_records', (extract(epoch from end_time - start_time) * 1000)::integer, error_message, 'Settled ' || records_affected || ' records.', records_affected);
end;
$$ language plpgsql;


-- 4. 触发器 (Triggers)
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

drop trigger if exists after_trade_insert on public.trades;
create trigger after_trade_insert
  after insert on public.trades
  for each row
  execute procedure public.distribute_trade_commissions();


-- 5. 定时任务 (Cron Jobs)
-- Run the settlement job every minute.
-- Use SELECT cron.schedule instead of INSERT to avoid errors on subsequent runs.
select cron.schedule(
    'settle-orders-every-minute',
    '* * * * *', -- every minute
    'select public.settle_and_log()'
);


-- 6. 行级安全策略 (RLS)
alter table public.profiles enable row level security;
alter table public.balances enable row level security;
alter table public.trades enable row level security;
alter table public.investments enable row level security;
alter table public.requests enable row level security;
alter table public.reward_logs enable row level security;
alter table public.user_task_states enable row level security;
alter table public.swap_orders enable row level security;
alter table public.action_logs enable row level security;

-- Profiles: Users can see all profiles, but only edit their own.
drop policy if exists "Users can view all profiles" on public.profiles;
create policy "Users can view all profiles" on public.profiles for select using (true);

drop policy if exists "Users can insert their own profile" on public.profiles;
create policy "Users can insert their own profile" on public.profiles for insert with check (auth.uid() = id);

drop policy if exists "Users can update their own profile" on public.profiles;
create policy "Users can update their own profile" on public.profiles for update using (auth.uid() = id);

-- Balances: Users can only see their own balances. Admins can see all.
drop policy if exists "Users can view their own balances" on public.balances;
create policy "Users can view their own balances" on public.balances for select using (auth.uid() = user_id);
drop policy if exists "Admins can view all balances" on public.balances;
create policy "Admins can view all balances" on public.balances for select using (public.is_admin(auth.uid()));

-- Trades: Users can only see their own trades. Admins can see all.
drop policy if exists "Users can view their own trades" on public.trades;
create policy "Users can view their own trades" on public.trades for select using (auth.uid() = user_id);
drop policy if exists "Admins can view all trades" on public.trades;
create policy "Admins can view all trades" on public.trades for select using (public.is_admin(auth.uid()));

-- Investments: Users can only see their own investments. Admins can see all.
drop policy if exists "Users can view their own investments" on public.investments;
create policy "Users can view their own investments" on public.investments for select using (auth.uid() = user_id);
drop policy if exists "Admins can view all investments" on public.investments;
create policy "Admins can view all investments" on public.investments for select using (public.is_admin(auth.uid()));

-- Requests: Users can create and view their own requests. Admins can manage all.
drop policy if exists "Users can manage their own requests" on public.requests;
create policy "Users can manage their own requests" on public.requests for all using (auth.uid() = user_id);
drop policy if exists "Admins can manage all requests" on public.requests;
create policy "Admins can manage all requests" on public.requests for all using (public.is_admin(auth.uid()));

-- Reward Logs: Users can view their own logs. Admins can see all.
drop policy if exists "Users can view their own reward logs" on public.reward_logs;
create policy "Users can view their own reward logs" on public.reward_logs for select using (auth.uid() = user_id);
drop policy if exists "Admins can view all reward logs" on public.reward_logs;
create policy "Admins can view all reward logs" on public.reward_logs for select using (public.is_admin(auth.uid()));

-- User Task States: Users can manage their own task states. Admins can see all.
drop policy if exists "Users can manage their own task states" on public.user_task_states;
create policy "Users can manage their own task states" on public.user_task_states for all using (auth.uid() = user_id);
drop policy if exists "Admins can view all task states" on public.user_task_states;
create policy "Admins can view all task states" on public.user_task_states for select using (public.is_admin(auth.uid()));

-- Swap Orders: Authenticated users can see all. Users can manage their own.
drop policy if exists "Authenticated users can view all swap orders" on public.swap_orders;
create policy "Authenticated users can view all swap orders" on public.swap_orders for select using (auth.role() = 'authenticated');
drop policy if exists "Users can manage their own swap orders" on public.swap_orders;
create policy "Users can manage their own swap orders" on public.swap_orders for all using (auth.uid() = user_id or auth.uid() = taker_id);

-- Action Logs: Only admins can view.
drop policy if exists "Admins can view all action logs" on public.action_logs;
create policy "Admins can view all action logs" on public.action_logs for select using (public.is_admin(auth.uid()));

-- READ-ONLY tables are public
-- (system_settings, announcements, activities, daily_tasks, investment_products, market_summary_data, market_kline_data, commission_rates)


-- 7. 辅助函数
-- Helper function to check if the current user is an admin
create or replace function public.is_admin(p_user_id uuid)
returns boolean as $$
declare
    is_admin_user boolean;
begin
    select is_admin into is_admin_user from public.profiles where id = p_user_id;
    return coalesce(is_admin_user, false);
end;
$$ language plpgsql;


-- 8. K线数据分区 (未来优化建议)
/*
NOTE FOR FUTURE SCALING:
For very large volumes of K-line data, partitioning the `market_kline_data` table is recommended.
This can be done by time (e.g., monthly or quarterly partitions).
Supabase supports partitioning, often managed with extensions like `pg_partman`.

Example Manual Partitioning Concept:

1. Rename the main table:
   ALTER TABLE public.market_kline_data RENAME TO market_kline_data_main;

2. Create a partitioned table with the original name:
   CREATE TABLE public.market_kline_data (
     -- same columns as original --
   ) PARTITION BY RANGE (time);

3. Create partitions for specific time ranges:
   CREATE TABLE public.market_kline_data_2024_01 PARTITION OF public.market_kline_data
   FOR VALUES FROM ('2024-01-01') TO ('2024-02-01');

   CREATE TABLE public.market_kline_data_2024_02 PARTITION OF public.market_kline_data
   FOR VALUES FROM ('2024-02-01') TO ('2024-03-01');
   -- etc.

4. Create a function to automatically create new partitions as needed and attach it to a cron job.
*/
