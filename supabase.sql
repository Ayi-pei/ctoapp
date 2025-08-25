-- TradeFlow - Supabase Database Setup
-- version: 1.5.0
-- A robust, scalable, and production-ready SQL script.

-- 1. 扩展 (Extensions)
-- Ensures required extensions are enabled for UUID generation and cron jobs.
create extension if not exists "uuid-ossp" with schema extensions;
create extension if not exists pgcrypto with schema extensions;
create extension if not exists pg_cron with schema extensions;


-- 2. 表结构 (Tables)

-- 核心用户表
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
comment on table public.profiles is 'Stores user profile information, linked to auth.users.';

-- 用户资产余额表
create table if not exists public.balances (
  id bigserial primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  asset text not null,
  available_balance double precision default 0,
  frozen_balance double precision default 0,
  unique(user_id, asset)
);
comment on table public.balances is 'Stores user asset balances, separating available and frozen funds.';

-- 交易记录表 (包含币币和秒合约)
create table if not exists public.trades (
  id bigserial primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  trading_pair text not null,
  orderType text not null check (orderType in ('spot', 'contract')),
  type text not null check (type in ('buy', 'sell')),
  status text not null, -- spot: 'filled', 'cancelled'; contract: 'active', 'settled'
  amount double precision not null, -- For spot: base asset quantity. For contract: investment amount.
  -- For Spot Trades
  total double precision, -- Total quote asset amount
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
comment on table public.trades is 'Records all spot and contract trades for users.';

-- 理财投资记录表
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

-- 奖励/佣金日志表
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
comment on table public.reward_logs is 'Logs all rewards and commissions issued to users.';

-- 用户请求表 (充值、提现、密码重置)
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
comment on table public.requests is 'Manages user requests like deposits and withdrawals for admin approval.';

-- 系统设置表 (单行记录，用于全局配置)
create table if not exists public.system_settings (
  id int primary key default 1,
  settings jsonb,
  constraint single_row_check check (id = 1)
);
comment on table public.system_settings is 'Stores global system configurations in a single JSONB row.';

-- 佣金比例配置表
create table if not exists public.commission_rates (
    level integer primary key,
    rate double precision not null
);
comment on table public.commission_rates is 'Stores commission rates for different referral levels.';
-- Seed default commission rates if the table is empty
insert into public.commission_rates (level, rate) values
(1, 0.08), (2, 0.05), (3, 0.02)
on conflict (level) do nothing;


-- 公告表
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
comment on table public.announcements is 'Stores various types of announcements, including personal, carousel, and horn messages.';

-- 活动表
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
comment on table public.activities is 'Defines limited-time activities for users.';

-- 每日任务定义表
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
comment on table public.daily_tasks is 'Defines the daily tasks available for users to complete.';

-- 用户任务完成状态表
create table if not exists public.user_task_states (
    id bigserial primary key,
    user_id uuid not null references public.profiles(id) on delete cascade,
    taskId text not null references public.daily_tasks(trigger),
    date date not null,
    completed boolean default false,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    unique(user_id, taskId, date)
);
comment on table public.user_task_states is 'Tracks the completion status of daily tasks for each user.';

-- 管理员操作日志
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

-- Cron Job 执行日志
create table if not exists public.cron_job_logs (
  id bigserial primary key,
  job_name text not null,
  run_time timestamp with time zone default timezone('utc'::text, now()) not null,
  status text not null, -- 'started', 'completed', 'failed'
  details jsonb
);
comment on table public.cron_job_logs is 'Logs the execution status and details of scheduled cron jobs.';


-- P2P闪兑订单表
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
comment on table public.swap_orders is 'Manages Peer-to-Peer swap orders.';


-- 理财产品配置表
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
comment on table public.investment_products is 'Configuration table for all investment products offered.';

-- 实时市场数据 - 汇总
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
comment on table public.market_summary_data is 'Stores the latest summary data for each market pair.';

-- 实时市场数据 - K线
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
comment on table public.market_kline_data is 'Stores OHLC (k-line) data for market charts. Recommended to partition by `time` for large datasets.';


-- 3. 索引优化 (Indexes)
-- Improves query performance for frequently accessed data.
create index if not exists trades_status_settlement_time_idx on public.trades (status, settlement_time);
create index if not exists investments_status_settlement_date_idx on public.investments (status, settlement_date);
create index if not exists reward_logs_user_id_created_at_idx on public.reward_logs (user_id, created_at);
create index if not exists user_task_states_user_id_date_idx on public.user_task_states (user_id, date);
create index if not exists market_kline_data_time_idx on public.market_kline_data (time desc);


-- 4. 数据库函数和触发器 (Functions & Triggers)

-- Function to create a profile and initial balances for a new user
create or replace function public.handle_new_user()
returns trigger as $$
declare
  -- Add all assets that new users should have a balance for.
  initial_assets text[] := array['USDT', 'BTC', 'ETH', 'SOL', 'XRP', 'LTC', 'BNB', 'MATIC', 'DOGE', 'ADA', 'SHIB', 'AVAX', 'LINK', 'DOT', 'UNI', 'TRX', 'XLM', 'VET', 'EOS', 'FIL', 'ICP', 'XAU', 'USD', 'EUR', 'GBP'];
  asset_name text;
begin
  -- Create a profile entry
  insert into public.profiles (id, username, nickname, email, inviter_id, is_test_user, invitation_code, avatar_url, credit_score)
  values (
    new.id,
    new.raw_user_meta_data ->> 'username',
    new.raw_user_meta_data ->> 'nickname',
    new.email,
    (new.raw_user_meta_data ->> 'inviter_id')::uuid,
    (new.raw_user_meta_data ->> 'is_test_user')::boolean,
    new.raw_user_meta_data ->> 'invitation_code',
    new.raw_user_meta_data ->> 'avatar_url',
    (new.raw_user_meta_data ->> 'credit_score')::integer
  );

  -- Create initial zero balances for all specified assets
  foreach asset_name in array initial_assets
  loop
    insert into public.balances (user_id, asset, available_balance, frozen_balance)
    values (new.id, asset_name, 0, 0);
  end loop;

  return new;
end;
$$ language plpgsql security definer;
comment on function public.handle_new_user() is 'Triggered on new user creation to populate profile and initial balances.';

-- Trigger to call the function when a new user signs up
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Function to adjust user balances safely within a transaction
create or replace function public.adjust_balance(
    p_user_id uuid,
    p_asset text,
    p_amount double precision,
    p_is_frozen boolean default false,
    p_is_debit_frozen boolean default false
)
returns void as $$
begin
    -- This function ensures that balance adjustments are atomic.
    if p_is_debit_frozen then
        -- This branch handles movements FROM the frozen balance (e.g., confirming or reverting a withdrawal)
        update public.balances
        set frozen_balance = frozen_balance - p_amount
        where user_id = p_user_id and asset = p_asset;
    elsif p_is_frozen then
         -- This branch handles movements INTO the frozen balance (e.g., placing a contract trade or requesting a withdrawal)
        update public.balances
        set 
            available_balance = available_balance - p_amount,
            frozen_balance = frozen_balance + p_amount
        where user_id = p_user_id and asset = p_asset;
    else
        -- This is a standard adjustment TO the available balance (e.g., deposit, commission)
        update public.balances
        set available_balance = available_balance + p_amount
        where user_id = p_user_id and asset = p_asset;
    end if;
end;
$$ language plpgsql volatile security definer;
comment on function public.adjust_balance(uuid, text, double precision, boolean, boolean) is 'Safely adjusts user balances, handling available and frozen funds atomically.';

-- Drop the old function signature if it exists to prevent replacement errors
drop function if exists public.get_downline(uuid);
-- Function to get the full downline of a user
create or replace function public.get_downline(p_user_id uuid)
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
comment on function public.get_downline(uuid) is 'Recursively fetches the referral downline for a user, up to 3 levels deep.';

-- Drop old function signature if it exists
drop function if exists public.get_total_platform_balance();
-- Function to get total platform balance
create or replace function public.get_total_platform_balance()
returns double precision as $$
begin
  return (select sum(available_balance + frozen_balance) from public.balances where asset = 'USDT');
end;
$$ language plpgsql;
comment on function public.get_total_platform_balance() is 'Calculates the total USDT balance across all users on the platform.';

-- Function to distribute commissions up to 3 levels
create or replace function public.distribute_trade_commissions()
returns trigger as $$
declare
    rates double precision[];
    v_inviter_id uuid;
    v_source_user public.profiles;
    v_commission_amount double precision;
    v_trade_amount double precision;
begin
    -- Only distribute commissions for trades involving USDT as the quote asset
    if new.quote_asset = 'USDT' then
        
        -- Fetch commission rates from the config table
        select array_agg(rate order by level) into rates from public.commission_rates where level <= 3;
        if array_length(rates, 1) IS NULL THEN
          rates := array[0.08, 0.05, 0.02]; -- Fallback to default if table is empty
        end if;
        
        v_trade_amount := coalesce(new.total, new.amount, 0);

        select * into v_source_user from public.profiles where id = new.user_id;
        v_inviter_id := v_source_user.inviter_id;

        for level in 1..3 loop
            if v_inviter_id is null then exit; end if;

            -- Check if inviter is valid (not frozen)
            if exists (select 1 from public.profiles where id = v_inviter_id and is_frozen = false) then
                v_commission_amount := v_trade_amount * rates[level];
                
                perform public.adjust_balance(v_inviter_id, 'USDT', v_commission_amount);

                insert into public.reward_logs (user_id, type, amount, asset, source_id, source_username, source_level, description)
                values (v_inviter_id, 'team', v_commission_amount, 'USDT', new.id::text, v_source_user.username, level, 'Level ' || level || ' commission from trade ' || new.id);

                select inviter_id into v_inviter_id from public.profiles where id = v_inviter_id;
            else
                exit; -- Stop if an upline user is frozen
            end if;
        end loop;
    end if;
    return new;
end;
$$ language plpgsql;
comment on function public.distribute_trade_commissions() is 'Trigger function to automatically distribute commissions up to 3 levels upon a new trade.';

-- Trigger for trade commission distribution
drop trigger if exists after_trade_insert_distribute_commissions on public.trades;
create trigger after_trade_insert_distribute_commissions
  after insert on public.trades
  for each row
  execute procedure public.distribute_trade_commissions();
  
-- Function to settle all due trades and investments
create or replace function public.settle_due_records()
returns jsonb as $$
declare
    settled_trade record;
    settled_investment record;
    current_price double precision;
    profit_amount double precision;
    total_return double precision;
    v_quote_asset text;
    log_details jsonb;
    trade_count int := 0;
    investment_count int := 0;
begin
    -- Settle contract trades
    for settled_trade in 
        select * from public.trades 
        where status = 'active' and orderType = 'contract' and settlement_time <= now()
    loop
        -- Fetch the latest price for the trading pair
        select price into current_price from public.market_summary_data where pair = settled_trade.trading_pair;
        v_quote_asset := settled_trade.quote_asset;
        
        -- If for some reason price is not available, skip settlement for this trade
        if current_price is null then
            continue;
        end if;

        -- Determine outcome and profit
        if (settled_trade.type = 'buy' and current_price > settled_trade.entry_price) or (settled_trade.type = 'sell' and current_price < settled_trade.entry_price) then
            profit_amount := settled_trade.amount * settled_trade.profit_rate;
            total_return := settled_trade.amount + profit_amount;
            
            update public.trades 
            set status = 'settled', settlement_price = current_price, outcome = 'win', profit = profit_amount 
            where id = settled_trade.id;

            -- Unfreeze principal and add profit
            perform public.adjust_balance(settled_trade.user_id, v_quote_asset, total_return, true, true);
        else
            profit_amount := -settled_trade.amount;
            
            update public.trades 
            set status = 'settled', settlement_price = current_price, outcome = 'loss', profit = profit_amount 
            where id = settled_trade.id;
            
            -- Only unfreeze the principal, as it was lost
            perform public.adjust_balance(settled_trade.user_id, v_quote_asset, settled_trade.amount, true, true);
        end if;
        trade_count := trade_count + 1;
    end loop;

    -- Settle investments
    for settled_investment in
        select * from public.investments where status = 'active' and settlement_date <= now()
    loop
        -- Calculate profit based on product type
        if settled_investment.productType = 'daily' then
            profit_amount := settled_investment.amount * settled_investment.daily_rate * settled_investment.period;
        elsif settled_investment.productType = 'hourly' then
            profit_amount := settled_investment.amount * settled_investment.hourly_rate * settled_investment.duration_hours;
        else
            profit_amount := 0;
        end if;

        total_return := settled_investment.amount + profit_amount;
        
        update public.investments set status = 'settled', profit = profit_amount where id = settled_investment.id;

        -- Return principal and profit (assuming USDT)
        perform public.adjust_balance(settled_investment.user_id, 'USDT', total_return);
        
        -- If there was a staked asset, unfreeze it
        if settled_investment.staking_asset is not null and settled_investment.staking_amount is not null then
            perform public.adjust_balance(settled_investment.user_id, settled_investment.staking_asset, settled_investment.staking_amount, true, true);
        end if;

        investment_count := investment_count + 1;
    end loop;

    log_details := jsonb_build_object('settled_trades', trade_count, 'settled_investments', investment_count);
    return log_details;
end;
$$ language plpgsql volatile security definer;
comment on function public.settle_due_records() is 'Core settlement function for all contract trades and investments. Designed to be run by pg_cron.';

-- Wrapper function for cron job with logging
create or replace function public.settle_and_log()
returns void as $$
declare
  log_payload jsonb;
begin
    insert into public.cron_job_logs (job_name, status) values ('settle_due_records', 'started');

    begin
        select public.settle_due_records() into log_payload;
        update public.cron_job_logs set status = 'completed', details = log_payload where id = (select max(id) from public.cron_job_logs where job_name = 'settle_due_records');
    exception when others then
        update public.cron_job_logs set status = 'failed', details = jsonb_build_object('error', SQLERRM) where id = (select max(id) from public.cron_job_logs where job_name = 'settle_due_records');
    end;
end;
$$ language plpgsql;
comment on function public.settle_and_log() is 'A wrapper for settle_due_records to provide logging for cron job execution.';


-- 5. 定时任务 (Cron Jobs)
-- Schedule the settlement job to run every minute.
-- Use "select cron.unschedule('settle-orders');" to remove if needed.
select cron.schedule(
  'settle-orders',
  '* * * * *', -- every minute
  $$select public.settle_and_log()$$
);

-- 6. 行级安全策略 (RLS)
-- Enable RLS for all relevant tables
alter table public.profiles enable row level security;
alter table public.balances enable row level security;
alter table public.trades enable row level security;
alter table public.investments enable row level security;
alter table public.requests enable row level security;
alter table public.reward_logs enable row level security;
alter table public.user_task_states enable row level security;
alter table public.swap_orders enable row level security;
-- Public or admin-only tables might not need RLS enabled from the start.
-- alter table public.system_settings enable row level security;
-- alter table public.daily_tasks enable row level security;


-- PROFILES table policies
drop policy if exists "Users can view all profiles" on public.profiles;
create policy "Users can view all profiles" on public.profiles for select using (true);

drop policy if exists "Users can insert their own profile" on public.profiles;
create policy "Users can insert their own profile" on public.profiles for insert with check (auth.uid() = id);

drop policy if exists "Users can update their own profile" on public.profiles;
create policy "Users can update their own profile" on public.profiles for update using (auth.uid() = id) with check (auth.uid() = id);

drop policy if exists "Admins can manage all profiles" on public.profiles;
create policy "Admins can manage all profiles" on public.profiles for all using (public.is_admin(auth.uid()));

-- BALANCES table policies
drop policy if exists "Users can view their own balances" on public.balances;
create policy "Users can view their own balances" on public.balances for select using (auth.uid() = user_id);
drop policy if exists "Admins can manage all balances" on public.balances;
create policy "Admins can manage all balances" on public.balances for all using (public.is_admin(auth.uid()));


-- TRADES table policies
drop policy if exists "Users can view their own trades" on public.trades;
create policy "Users can view their own trades" on public.trades for select using (auth.uid() = user_id);
drop policy if exists "Users can create their own trades" on public.trades;
create policy "Users can create their own trades" on public.trades for insert with check (auth.uid() = user_id);
drop policy if exists "Admins can view all trades" on public.trades;
create policy "Admins can view all trades" on public.trades for select using (public.is_admin(auth.uid()));

-- INVESTMENTS table policies
drop policy if exists "Users can view their own investments" on public.investments;
create policy "Users can view their own investments" on public.investments for select using (auth.uid() = user_id);
drop policy if exists "Users can create their own investments" on public.investments;
create policy "Users can create their own investments" on public.investments for insert with check (auth.uid() = user_id);
drop policy if exists "Admins can view all investments" on public.investments;
create policy "Admins can view all investments" on public.investments for select using (public.is_admin(auth.uid()));


-- REQUESTS table policies
drop policy if exists "Users can view their own requests" on public.requests;
create policy "Users can view their own requests" on public.requests for select using (auth.uid() = user_id);
drop policy if exists "Users can create their own requests" on public.requests;
create policy "Users can create their own requests" on public.requests for insert with check (auth.uid() = user_id);
drop policy if exists "Admins can manage all requests" on public.requests;
create policy "Admins can manage all requests" on public.requests for all using (public.is_admin(auth.uid()));


-- REWARD_LOGS table policies
drop policy if exists "Users can view their own reward logs" on public.reward_logs;
create policy "Users can view their own reward logs" on public.reward_logs for select using (auth.uid() = user_id);
drop policy if exists "Admins can view all reward logs" on public.reward_logs;
create policy "Admins can view all reward logs" on public.reward_logs for select using (public.is_admin(auth.uid()));


-- USER_TASK_STATES table policies
drop policy if exists "Users can manage their own task states" on public.user_task_states;
create policy "Users can manage their own task states" on public.user_task_states for all using (auth.uid() = user_id);


-- SWAP_ORDERS table policies
drop policy if exists "Users can view all swap orders" on public.swap_orders;
create policy "Users can view all swap orders" on public.swap_orders for select using (true);
drop policy if exists "Users can manage their own swap orders" on public.swap_orders;
create policy "Users can manage their own swap orders" on public.swap_orders for all using (auth.uid() = user_id or auth.uid() = taker_id);
drop policy if exists "Admins can manage all swap orders" on public.swap_orders;
create policy "Admins can manage all swap orders" on public.swap_orders for all using (public.is_admin(auth.uid()));


-- Helper function to check if the current user is an admin.
create or replace function public.is_admin(p_user_id uuid)
returns boolean as $$
declare
    v_is_admin boolean;
begin
    select is_admin into v_is_admin from public.profiles where id = p_user_id;
    return coalesce(v_is_admin, false);
end;
$$ language plpgsql;
comment on function public.is_admin(uuid) is 'Checks if a given user_id corresponds to an administrator.';

-- Admin-only tables
alter table public.system_settings enable row level security;
drop policy if exists "Admins can manage system settings" on public.system_settings;
create policy "Admins can manage system settings" on public.system_settings for all using (public.is_admin(auth.uid()));

alter table public.daily_tasks enable row level security;
drop policy if exists "All users can view tasks" on public.daily_tasks;
create policy "All users can view tasks" on public.daily_tasks for select using (true);
drop policy if exists "Admins can manage tasks" on public.daily_tasks;
create policy "Admins can manage tasks" on public.daily_tasks for all using (public.is_admin(auth.uid()));

alter table public.investment_products enable row level security;
drop policy if exists "All users can view investment products" on public.investment_products;
create policy "All users can view investment products" on public.investment_products for select using (true);
drop policy if exists "Admins can manage investment products" on public.investment_products;
create policy "Admins can manage investment products" on public.investment_products for all using (public.is_admin(auth.uid()));

alter table public.commission_rates enable row level security;
drop policy if exists "Admins can manage commission rates" on public.commission_rates;
create policy "Admins can manage commission rates" on public.commission_rates for all using (public.is_admin(auth.uid()));
drop policy if exists "Users can read commission rates" on public.commission_rates;
create policy "Users can read commission rates" on public.commission_rates for select using (true);

alter table public.action_logs enable row level security;
drop policy if exists "Admins can view all action logs" on public.action_logs;
create policy "Admins can view all action logs" on public.action_logs for select using (public.is_admin(auth.uid()));

alter table public.activities enable row level security;
drop policy if exists "All users can view activities" on public.activities;
create policy "All users can view activities" on public.activities for select using (true);
drop policy if exists "Admins can manage activities" on public.activities;
create policy "Admins can manage activities" on public.activities for all using (public.is_admin(auth.uid()));
