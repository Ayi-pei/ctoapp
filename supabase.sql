-- 1. 数据库扩展
-- 开启PostgreSQL的扩展，以支持UUID生成和定时任务
create extension if not exists "uuid-ossp" with schema extensions;
create extension if not exists pgcrypto with schema extensions;
create extension if not exists pg_cron with schema extensions;

-- 2. 表结构定义

-- 用户核心信息表 (关联 auth.users)
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
  -- for check-in feature
  last_check_in_date date,
  consecutive_check_ins integer default 0
);
comment on table public.profiles is 'Stores public-facing user profile information.';

-- 动态资产列表
create table if not exists public.supported_assets (
  asset_code text primary key,
  is_active boolean default true,
  description text
);
comment on table public.supported_assets is 'Defines all assets supported by the platform for balances.';

-- 动态佣金率配置表
create table if not exists public.commission_rates (
  level integer primary key,
  rate double precision not null,
  constraint level_check check (level in (1,2,3))
);
comment on table public.commission_rates is 'Stores commission rates for up to 3 referral levels.';


-- 用户资产余额表
create table if not exists public.balances (
  id bigserial primary key,
  user_id uuid not null references public.profiles(id),
  asset text not null references public.supported_assets(asset_code),
  available_balance double precision default 0,
  frozen_balance double precision default 0,
  unique(user_id, asset)
);
comment on table public.balances is 'Stores user balances for different assets.';

-- 交易记录表 (包含币币和秒合约)
create table if not exists public.trades (
  id bigserial primary key,
  user_id uuid not null references public.profiles(id),
  trading_pair text not null,
  orderType text not null check (orderType in ('spot', 'contract')),
  type text not null check (type in ('buy', 'sell')),
  status text not null, -- spot: 'filled'; contract: 'active', 'settled'
  amount double precision not null, -- 对于spot是基础货币数量, 对于contract是投资额(quote_asset)
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

-- 理财投资记录表
create table if not exists public.investments (
    id bigserial primary key,
    user_id uuid not null references public.profiles(id),
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

-- 奖励/佣金日志表
create table if not exists public.reward_logs (
    id bigserial primary key,
    user_id uuid not null references public.profiles(id),
    type text not null, -- 'dailyTask', 'team', 'event', 'system', 'check_in'
    amount double precision not null,
    asset text not null,
    source_id text,
    source_username text,
    source_level integer,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    description text
);

-- 用户请求表 (充值、提现、密码重置)
create table if not exists public.requests (
    id bigserial primary key,
    user_id uuid not null references public.profiles(id),
    type text not null, -- 'deposit', 'withdrawal', 'password_reset'
    asset text,
    amount double precision,
    address text,
    transaction_hash text,
    new_password text,
    status text not null, -- 'pending', 'approved', 'rejected'
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 系统设置表 (单行记录，用于全局配置)
create table if not exists public.system_settings (
  id int primary key default 1,
  settings jsonb,
  constraint single_row_check check (id = 1)
);

-- 公告表
create table if not exists public.announcements (
    id bigserial primary key,
    type text not null, -- 'personal_message', 'carousel', 'horn'
    user_id uuid references public.profiles(id),
    content jsonb,
    title text,
    theme text,
    priority integer,
    expires_at timestamp with time zone,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    is_read boolean default false,
    constraint unique_type_for_singletons unique (type)
);

-- 活动表
create table if not exists public.activities (
    id bigserial primary key,
    title text not null,
    description text,
    "rewardRule" text,
    "howToClaim" text,
    "expiresAt" timestamp with time zone,
    "imgSrc" text,
    status text, -- 'published', 'draft'
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

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

-- 用户任务完成状态表
create table if not exists public.user_task_states (
    id bigserial primary key,
    user_id uuid not null references public.profiles(id),
    taskId text not null references public.daily_tasks(trigger),
    date date not null,
    completed boolean default false,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    unique(user_id, taskId, date)
);

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

-- P2P闪兑订单表
create table if not exists public.swap_orders (
    id bigserial primary key,
    user_id uuid not null references public.profiles(id),
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

-- 理财产品配置表
create table if not exists public.investment_products (
    id bigserial primary key,
    name text not null,
    price double precision,
    "dailyRate" double precision,
    period integer,
    "maxPurchase" integer,
    "imgSrc" text,
    category text,
    "productType" text,
    "activeStartTime" text,
    "activeEndTime" text,
    "hourlyTiers" jsonb,
    "stakingAsset" text,
    "stakingAmount" double precision
);

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

-- Cron Job 日志表
create table if not exists public.cron_job_logs (
  id bigserial primary key,
  job_name text not null,
  start_time timestamp with time zone,
  end_time timestamp with time zone,
  status text, -- 'started', 'completed', 'failed'
  details text,
  items_processed integer
);


-- 3. 索引优化
create index if not exists balances_user_id_asset_idx on public.balances (user_id, asset);
create index if not exists trades_status_settlement_time_idx on public.trades (status, settlement_time);
create index if not exists trades_trading_pair_status_settlement_time_idx on public.trades (trading_pair, status, settlement_time);
create index if not exists investments_status_settlement_date_idx on public.investments (status, settlement_date);
create index if not exists reward_logs_user_id_created_at_idx on public.reward_logs (user_id, created_at);
create index if not exists user_task_states_user_id_date_idx on public.user_task_states (user_id, date);
create index if not exists market_kline_data_time_idx on public.market_kline_data (time desc);


-- 4. 数据库函数与触发器

-- 4.1 用户创建与初始化
drop function if exists public.handle_new_user();
create or replace function public.handle_new_user()
returns trigger as $$
begin
  -- 在 profiles 表中插入新用户记录
  insert into public.profiles (id, username, nickname, email, inviter_id, invitation_code, avatar_url)
  values (
    new.id,
    new.raw_user_meta_data->>'username',
    new.raw_user_meta_data->>'nickname',
    new.email,
    (new.raw_user_meta_data->>'inviter_id')::uuid,
    new.raw_user_meta_data->>'invitation_code',
    new.raw_user_meta_data->>'avatar_url'
  );
  -- 为新用户初始化所有支持的资产余额
  insert into public.balances (user_id, asset)
  select new.id, asset_code from public.supported_assets where is_active = true;
  return new;
end;
$$ language plpgsql security definer;

-- Trigger to call the function when a new user signs up in auth.users
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();


-- 4.2 核心业务函数
drop function if exists public.adjust_balance(uuid, text, double precision, boolean, boolean);
create or replace function public.adjust_balance(
    p_user_id uuid,
    p_asset text,
    p_amount double precision,
    p_is_frozen boolean default false
)
returns void as $$
declare
    v_available_balance double precision;
begin
    -- 锁定用户的余额行以防止并发问题
    select available_balance into v_available_balance from public.balances 
    where user_id = p_user_id and asset = p_asset for update;

    if p_is_frozen then
        -- This branch moves funds between available and frozen
        -- Check for sufficient available balance before freezing
        if v_available_balance < p_amount then
            raise exception 'Insufficient available balance to freeze for user % and asset %', p_user_id, p_asset;
        end if;
        update public.balances
        set 
            available_balance = available_balance - p_amount,
            frozen_balance = frozen_balance + p_amount
        where user_id = p_user_id and asset = p_asset;
    else
        -- This is a standard adjustment (deposit or withdrawal confirmation)
        update public.balances
        set available_balance = available_balance + p_amount
        where user_id = p_user_id and asset = p_asset;
    end if;
end;
$$ language plpgsql volatile;


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
    where d.level < 3
  )
  select * from downline;
end;
$$ language plpgsql;

drop function if exists public.get_total_platform_balance();
create or replace function public.get_total_platform_balance()
returns double precision as $$
begin
  return (select sum(available_balance + frozen_balance) from public.balances where asset = 'USDT');
end;
$$ language plpgsql;

drop function if exists public.distribute_trade_commissions();
create or replace function public.distribute_trade_commissions()
returns trigger as $$
declare
    v_inviter_id uuid;
    v_source_user public.profiles;
    v_commission_amount double precision;
    v_trade_amount double precision;
    v_rate double precision;
begin
    v_trade_amount := coalesce(new.total, new.amount, 0);

    -- Get the user who made the trade
    select * into v_source_user from public.profiles where id = new.user_id;
    v_inviter_id := v_source_user.inviter_id;

    -- Loop up to 3 levels
    for level in 1..3 loop
        if v_inviter_id is null then
            exit;
        end if;
        
        -- Get rate for the current level from the config table
        select rate into v_rate from public.commission_rates where commission_rates.level = level;

        if found then
            v_commission_amount := v_trade_amount * v_rate;
            
            -- Perform the balance update with pessimistic locking
            perform public.adjust_balance(v_inviter_id, new.quote_asset, v_commission_amount);

            insert into public.reward_logs (user_id, type, amount, asset, source_id, source_username, source_level, description)
            values (v_inviter_id, 'team', v_commission_amount, new.quote_asset, new.id::text, v_source_user.username, level, 'Level ' || level || ' commission');

            select inviter_id into v_inviter_id from public.profiles where id = v_inviter_id;
        else
            exit; -- Exit if no rate is configured for the level
        end if;
    end loop;

    return new;
end;
$$ language plpgsql;

drop trigger if exists on_trade_insert on public.trades;
create trigger on_trade_insert
  after insert on public.trades
  for each row execute procedure public.distribute_trade_commissions();


-- 4.3 每日签到
drop function if exists public.handle_user_check_in(uuid);
create or replace function public.handle_user_check_in(p_user_id uuid)
returns table(success boolean, message text, reward_amount double precision) as $$
declare
    v_last_check_in date;
    v_consecutive_days int;
    v_reward_base double precision;
    v_final_reward double precision;
begin
    select last_check_in_date, consecutive_check_ins into v_last_check_in, v_consecutive_days
    from public.profiles where id = p_user_id;
    
    -- Check if already checked in today
    if v_last_check_in = current_date then
        return query select false, '您今日已签到', 0.0;
        return;
    end if;
    
    -- Calculate consecutive days
    if v_last_check_in = current_date - interval '1 day' then
        v_consecutive_days := (v_consecutive_days % 7) + 1;
    else
        v_consecutive_days := 1;
    end if;

    -- Get base reward from settings
    select (settings->>'check_in_reward_base')::double precision into v_reward_base
    from public.system_settings where id = 1;
    v_reward_base := coalesce(v_reward_base, 0.5); -- Fallback value

    -- Calculate final reward (e.g., base * 1.5^(days-1))
    v_final_reward := v_reward_base * power(1.5, v_consecutive_days - 1);
    
    -- Perform updates within a transaction
    begin
        update public.profiles
        set last_check_in_date = current_date,
            consecutive_check_ins = v_consecutive_days
        where id = p_user_id;
        
        perform public.adjust_balance(p_user_id, 'USDT', v_final_reward);

        insert into public.reward_logs (user_id, type, amount, asset, description)
        values (p_user_id, 'check_in', v_final_reward, 'USDT', '连续签到 ' || v_consecutive_days || ' 天奖励');

    exception when others then
        raise exception 'Failed to process check-in for user %', p_user_id;
    end;

    return query select true, '签到成功!', v_final_reward;
end;
$$ language plpgsql;


-- 4.4 定时任务与结算
drop function if exists public.settle_due_records();
create or replace function public.settle_due_records()
returns integer as $$
declare
    rec record;
    items_processed integer := 0;
    quote_asset text;
    profit_or_loss double precision;
begin
    -- Settle contract trades
    for rec in select * from public.trades where status = 'active' and settlement_time <= now() loop
        begin
            quote_asset := rec.quote_asset;

            -- Determine outcome
            if (rec.type = 'buy' and rec.settlement_price > rec.entry_price) or (rec.type = 'sell' and rec.settlement_price < rec.entry_price) then
                profit_or_loss := rec.amount * rec.profit_rate;
                update public.trades set status = 'settled', outcome = 'win', profit = profit_or_loss where id = rec.id;
                perform public.adjust_balance(rec.user_id, quote_asset, rec.amount + profit_or_loss, true);
            else
                profit_or_loss := -rec.amount;
                update public.trades set status = 'settled', outcome = 'loss', profit = profit_or_loss where id = rec.id;
                perform public.adjust_balance(rec.user_id, quote_asset, 0, true); -- Only unfreeze amount
            end if;
            items_processed := items_processed + 1;
        exception when others then
             -- Log error for this specific trade and continue
             insert into public.cron_job_logs (job_name, status, details) values ('settle_due_records', 'failed', 'Failed to settle trade ID ' || rec.id || ': ' || SQLERRM);
        end;
    end loop;

    -- Settle investments
    for rec in select * from public.investments where status = 'active' and settlement_date <= now() loop
         begin
            profit_or_loss := coalesce(rec.profit, 0);
            update public.investments set status = 'settled' where id = rec.id;
            perform public.adjust_balance(rec.user_id, 'USDT', rec.amount + profit_or_loss);
            items_processed := items_processed + 1;
        exception when others then
             insert into public.cron_job_logs (job_name, status, details) values ('settle_due_records', 'failed', 'Failed to settle investment ID ' || rec.id || ': ' || SQLERRM);
        end;
    end loop;

    return items_processed;
end;
$$ language plpgsql;

drop function if exists public.settle_and_log();
create or replace function public.settle_and_log()
returns void as $$
declare
    log_id bigint;
    processed_count integer;
begin
    insert into public.cron_job_logs (job_name, start_time, status)
    values ('settle_due_records', now(), 'started') returning id into log_id;

    begin
        select public.settle_due_records() into processed_count;
        update public.cron_job_logs 
        set end_time = now(), status = 'completed', items_processed = processed_count, details = 'Successfully processed ' || processed_count || ' items.'
        where id = log_id;
    exception when others then
        update public.cron_job_logs
        set end_time = now(), status = 'failed', details = 'SQLSTATE: ' || SQLSTATE || ' - ' || SQLERRM
        where id = log_id;
    end;
end;
$$ language plpgsql;


-- 5. 行级安全策略 (RLS)
alter table public.profiles enable row level security;
alter table public.balances enable row level security;
alter table public.trades enable row level security;
alter table public.investments enable row level security;
alter table public.requests enable row level security;
alter table public.reward_logs enable row level security;
alter table public.user_task_states enable row level security;
alter table public.swap_orders enable row level security;

-- Profiles: Users can see all profiles, but only manage their own.
drop policy if exists "Users can view all profiles" on public.profiles;
create policy "Users can view all profiles" on public.profiles for select using (true);
drop policy if exists "Users can insert their own profile" on public.profiles;
create policy "Users can insert their own profile" on public.profiles for insert with check (auth.uid() = id);
drop policy if exists "Users can update their own profile" on public.profiles;
create policy "Users can update their own profile" on public.profiles for update using (auth.uid() = id);

-- Balances, Trades, Investments, Requests, Reward Logs, Tasks: Users can only manage their own records.
drop policy if exists "Users can manage their own balances" on public.balances;
create policy "Users can manage their own balances" on public.balances for all using (auth.uid() = user_id);
drop policy if exists "Users can manage their own trades" on public.trades;
create policy "Users can manage their own trades" on public.trades for all using (auth.uid() = user_id);
drop policy if exists "Users can manage their own investments" on public.investments;
create policy "Users can manage their own investments" on public.investments for all using (auth.uid() = user_id);
drop policy if exists "Users can manage their own requests" on public.requests;
create policy "Users can manage their own requests" on public.requests for all using (auth.uid() = user_id);
drop policy if exists "Users can manage their own reward logs" on public.reward_logs;
create policy "Users can manage their own reward logs" on public.reward_logs for all using (auth.uid() = user_id);
drop policy if exists "Users can manage their own task states" on public.user_task_states;
create policy "Users can manage their own task states" on public.user_task_states for all using (auth.uid() = user_id);

-- Swap Orders: Users can see all, but only manage their own or ones they've taken.
drop policy if exists "Users can view all swap orders" on public.swap_orders;
create policy "Users can view all swap orders" on public.swap_orders for select using (true);
drop policy if exists "Users can manage their own swap orders" on public.swap_orders;
create policy "Users can manage their own swap orders" on public.swap_orders for all using (auth.uid() = user_id or auth.uid() = taker_id);

-- Admins have full access to everything.
drop policy if exists "Admins have full access" on public.profiles;
create policy "Admins have full access" on public.profiles for all using ((select is_admin from public.profiles where id = auth.uid()) = true);
drop policy if exists "Admins have full access" on public.balances;
create policy "Admins have full access" on public.balances for all using ((select is_admin from public.profiles where id = auth.uid()) = true);
drop policy if exists "Admins have full access" on public.trades;
create policy "Admins have full access" on public.trades for all using ((select is_admin from public.profiles where id = auth.uid()) = true);
drop policy if exists "Admins have full access" on public.investments;
create policy "Admins have full access" on public.investments for all using ((select is_admin from public.profiles where id = auth.uid()) = true);
drop policy if exists "Admins have full access" on public.requests;
create policy "Admins have full access" on public.requests for all using ((select is_admin from public.profiles where id = auth.uid()) = true);
drop policy if exists "Admins have full access" on public.reward_logs;
create policy "Admins have full access" on public.reward_logs for all using ((select is_admin from public.profiles where id = auth.uid()) = true);
drop policy if exists "Admins have full access" on public.user_task_states;
create policy "Admins have full access" on public.user_task_states for all using ((select is_admin from public.profiles where id = auth.uid()) = true);
drop policy if exists "Admins have full access" on public.swap_orders;
create policy "Admins have full access" on public.swap_orders for all using ((select is_admin from public.profiles where id = auth.uid()) = true);
drop policy if exists "Admins have full access" on public.system_settings;
create policy "Admins have full access" on public.system_settings for all using ((select is_admin from public.profiles where id = auth.uid()) = true);
drop policy if exists "Admins have full access" on public.announcements;
create policy "Admins have full access" on public.announcements for all using ((select is_admin from public.profiles where id = auth.uid()) = true);
drop policy if exists "Admins have full access" on public.activities;
create policy "Admins have full access" on public.activities for all using ((select is_admin from public.profiles where id = auth.uid()) = true);
drop policy if exists "Admins have full access" on public.daily_tasks;
create policy "Admins have full access" on public.daily_tasks for all using ((select is_admin from public.profiles where id = auth.uid()) = true);


-- 6. 初始化数据
-- Insert supported assets
insert into public.supported_assets (asset_code, description) values
('USDT', 'Tether USD'),
('BTC', 'Bitcoin'),
('ETH', 'Ethereum'),
('SOL', 'Solana'),
('XRP', 'Ripple'),
('LTC', 'Litecoin'),
('BNB', 'Binance Coin'),
('DOGE', 'Dogecoin'),
('ADA', 'Cardano'),
('MATIC', 'Polygon'),
('SHIB', 'Shiba Inu'),
('AVAX', 'Avalanche'),
('LINK', 'Chainlink'),
('DOT', 'Polkadot'),
('UNI', 'Uniswap'),
('TRX', 'Tron'),
('XLM', 'Stellar'),
('VET', 'VeChain'),
('EOS', 'EOS.IO'),
('FIL', 'Filecoin'),
('ICP', 'Internet Computer'),
('XAU', 'Gold'),
('USD', 'US Dollar'),
('EUR', 'Euro'),
('GBP', 'British Pound')
on conflict (asset_code) do nothing;

-- Insert commission rates
insert into public.commission_rates (level, rate) values
(1, 0.08),
(2, 0.05),
(3, 0.02)
on conflict (level) do update set rate = excluded.rate;

-- Insert default system settings
insert into public.system_settings (id, settings)
values (1, '{
    "trade_fee": 0.001,
    "kline_refresh_interval_sec": 60,
    "check_in_reward_base": 0.5
}')
on conflict (id) do update
set settings = excluded.settings;


-- 7. 定时任务调度 (Cron)
-- Schedule the settlement function to run every minute
select cron.schedule('settle-due-orders-job', '* * * * *', $$select public.settle_and_log()$$);
