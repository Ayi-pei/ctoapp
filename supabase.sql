-- 1. 数据库扩展
create extension if not exists "uuid-ossp" with schema extensions;
create extension if not exists "pgcrypto" with schema extensions;
create extension if not exists "pg_cron" with schema extensions;


-- 2. 表结构定义

-- 核心用户表
create table if not exists public.profiles (
  id uuid not null primary key,
  username text unique not null,
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
comment on table public.profiles is 'Stores user profile information, linked to auth.users.';

-- 支持的资产列表
create table if not exists public.supported_assets (
    asset_name text primary key,
    is_active boolean default true,
    asset_type text default 'crypto' -- 'crypto' or 'fiat'
);
comment on table public.supported_assets is 'Defines which assets are supported in the system for balances.';

-- 佣金比例配置表
create table if not exists public.commission_rates (
    level integer primary key,
    rate double precision not null,
    check (level between 1 and 3)
);
comment on table public.commission_rates is 'Configuration for tiered commission rates.';

-- 用户资产余额表
create table if not exists public.balances (
  id bigserial primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  asset text not null references public.supported_assets(asset_name),
  available_balance double precision default 0,
  frozen_balance double precision default 0,
  unique(user_id, asset)
);
comment on table public.balances is 'Stores available and frozen balances for each user and asset.';

-- 交易记录表 (包含币币和秒合约)
create table if not exists public.trades (
  id bigserial primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  trading_pair text not null,
  orderType text not null check (orderType in ('spot', 'contract')),
  type text not null check (type in ('buy', 'sell')),
  status text not null,
  amount double precision not null,
  total double precision,
  price double precision,
  base_asset text,
  quote_asset text,
  entry_price double precision,
  settlement_time timestamp with time zone,
  period integer,
  profit_rate double precision,
  settlement_price double precision,
  outcome text,
  profit double precision,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);
comment on table public.trades is 'Logs all spot and contract trades.';

-- 理财投资记录表
create table if not exists public.investments (
    id bigserial primary key,
    user_id uuid not null references public.profiles(id) on delete cascade,
    product_name text not null,
    amount double precision not null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    settlement_date timestamp with time zone not null,
    status text not null,
    category text,
    profit double precision,
    productType text,
    daily_rate double precision,
    period integer,
    staking_asset text,
    staking_amount double precision,
    duration_hours integer,
    hourly_rate double precision
);
comment on table public.investments is 'Records all user investments in staking or finance products.';

-- 奖励/佣金日志表
create table if not exists public.reward_logs (
    id bigserial primary key,
    user_id uuid not null references public.profiles(id) on delete cascade,
    type text not null,
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
    type text not null,
    asset text,
    amount double precision,
    address text,
    transaction_hash text,
    new_password text,
    status text not null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);
comment on table public.requests is 'Tracks user requests like deposits, withdrawals, and password resets.';

-- 系统设置表 (单行记录，用于全局配置)
create table if not exists public.system_settings (
  id int primary key default 1,
  settings jsonb,
  constraint single_row_check check (id = 1)
);
comment on table public.system_settings is 'A single-row table to store global JSONB settings.';

-- 公告表
create table if not exists public.announcements (
    id bigserial primary key,
    type text not null,
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
comment on table public.announcements is 'Stores various types of announcements.';

-- 活动表
create table if not exists public.activities (
    id bigserial primary key,
    title text not null,
    description text,
    rewardRule text,
    howToClaim text,
    expiresAt timestamp with time zone,
    imgSrc text,
    status text,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);
comment on table public.activities is 'Configuration for limited-time activities.';

-- 每日任务定义表
create table if not exists public.daily_tasks (
    id bigserial primary key,
    title text not null,
    description text,
    reward double precision,
    reward_type text,
    link text,
    imgSrc text,
    status text,
    trigger text unique
);
comment on table public.daily_tasks is 'Defines available daily tasks for users.';

-- 用户任务完成状态表
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
comment on table public.action_logs is 'Logs actions performed by administrators.';

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
    taker_id uuid references public.profiles(id),
    taker_username text,
    payment_proof_url text
);
comment on table public.swap_orders is 'Stores Peer-to-Peer swap orders.';

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
comment on table public.investment_products is 'Configuration for various investment products.';

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
comment on table public.market_summary_data is 'Stores latest summary data for market pairs.';

-- 实时市场数据 - K线
create table if not exists public.market_kline_data (
    id bigserial primary key,
    trading_pair text not null,
    "time" timestamp with time zone not null,
    "open" double precision,
    high double precision,
    low double precision,
    "close" double precision,
    unique(trading_pair, "time")
);
comment on table public.market_kline_data is 'Stores OHLC (k-line) data for market pairs.';

-- 定时任务执行日志表
create table if not exists public.cron_job_logs (
  id bigserial primary key,
  job_name text not null,
  start_time timestamp with time zone not null,
  end_time timestamp with time zone,
  status text not null, -- 'started', 'completed', 'failed'
  details jsonb
);
comment on table public.cron_job_logs is 'Logs the execution status of scheduled cron jobs.';

-- 3. 索引优化
create index if not exists trades_status_settlement_time_idx on public.trades (status, settlement_time);
create index if not exists investments_status_settlement_date_idx on public.investments (status, settlement_date);
create index if not exists reward_logs_user_id_created_at_idx on public.reward_logs (user_id, created_at);
create index if not exists user_task_states_user_id_date_idx on public.user_task_states (user_id, date);
create index if not exists market_kline_data_time_idx on public.market_kline_data (time desc);


-- 4. 数据库函数与触发器

-- Function to create profile and initial balances for a new user
create or replace function public.handle_new_user()
returns trigger as $$
declare
  asset_rec record;
begin
  -- Insert a new profile
  insert into public.profiles (id, username, nickname, email, inviter_id, invitation_code, avatar_url, is_test_user)
  values (
    new.id,
    new.raw_user_meta_data->>'username',
    new.raw_user_meta_data->>'nickname',
    new.email,
    (new.raw_user_meta_data->>'inviter_id')::uuid,
    new.raw_user_meta_data->>'invitation_code',
    new.raw_user_meta_data->>'avatar_url',
    coalesce((new.raw_user_meta_data->>'is_test_user')::boolean, true)
  );

  -- Create zero balances for all supported assets
  for asset_rec in select asset_name from public.supported_assets where is_active = true loop
    insert into public.balances(user_id, asset, available_balance, frozen_balance)
    values (new.id, asset_rec.asset_name, 0, 0);
  end loop;

  return new;
end;
$$ language plpgsql security definer;

-- Trigger to call the function when a new user signs up
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Function to adjust user balances safely
create or replace function public.adjust_balance(
    p_user_id uuid,
    p_asset text,
    p_amount double precision,
    p_is_frozen boolean default false,
    p_is_debit_frozen boolean default false
)
returns void as $$
begin
    if p_is_debit_frozen then
        update public.balances set frozen_balance = frozen_balance - p_amount where user_id = p_user_id and asset = p_asset;
    elsif p_is_frozen then
        update public.balances set available_balance = available_balance - p_amount, frozen_balance = frozen_balance + p_amount where user_id = p_user_id and asset = p_asset;
    else
        update public.balances set available_balance = available_balance + p_amount where user_id = p_user_id and asset = p_asset;
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
    where d.level < 3
  )
  select * from downline;
end;
$$ language plpgsql;

-- Function to get total platform balance
drop function if exists public.get_total_platform_balance();
create or replace function public.get_total_platform_balance()
returns double precision as $$
begin
  return (select sum(available_balance + frozen_balance) from public.balances where asset = 'USDT');
end;
$$ language plpgsql;

-- Function to distribute commissions up to 3 levels
create or replace function public.distribute_trade_commissions()
returns trigger as $$
declare
    v_inviter_id uuid;
    v_source_user public.profiles;
    v_commission_amount double precision;
    v_trade_amount double precision;
    v_commission_rate double precision;
    v_level integer;
begin
    if new.quote_asset = 'USDT' then
        v_trade_amount := coalesce(new.total, new.amount, 0);
        select * into v_source_user from public.profiles where id = new.user_id;
        v_inviter_id := v_source_user.inviter_id;

        for v_level in 1..3 loop
            if v_inviter_id is null then exit; end if;
            
            select rate into v_commission_rate from public.commission_rates where level = v_level;
            if not found then v_commission_rate := 0; end if;

            v_commission_amount := v_trade_amount * v_commission_rate;
            
            perform public.adjust_balance(v_inviter_id, 'USDT', v_commission_amount);

            insert into public.reward_logs (user_id, type, amount, asset, source_id, source_username, source_level, description)
            values (v_inviter_id, 'team', v_commission_amount, 'USDT', new.id::text, v_source_user.username, v_level, 'Level ' || v_level || ' commission from trade ' || new.id);

            select inviter_id into v_inviter_id from public.profiles where id = v_inviter_id;
        end loop;
    end if;
    return new;
end;
$$ language plpgsql;

-- Trigger to distribute commissions on new trades
drop trigger if exists on_trade_insert_distribute_commissions on public.trades;
create trigger on_trade_insert_distribute_commissions
  after insert on public.trades
  for each row
  execute procedure public.distribute_trade_commissions();
  
-- Function for daily check-in
create or replace function public.handle_user_check_in(p_user_id uuid)
returns table(success boolean, message text, reward_amount double precision) as $$
declare
    v_last_check_in_date date;
    v_consecutive_check_ins integer;
    v_new_consecutive_check_ins integer;
    v_base_reward double precision;
    v_final_reward double precision;
    v_today date := current_date;
begin
    select last_check_in_date, consecutive_check_ins into v_last_check_in_date, v_consecutive_check_ins
    from public.profiles where id = p_user_id;

    if v_last_check_in_date = v_today then
        return query select false, 'You have already checked in today.', 0.0;
        return;
    end if;

    if v_last_check_in_date = v_today - interval '1 day' then
        v_new_consecutive_check_ins := (v_consecutive_check_ins % 7) + 1;
    else
        v_new_consecutive_check_ins := 1;
    end if;

    select (settings->>'check_in_reward_base')::double precision into v_base_reward from public.system_settings where id = 1;
    v_base_reward := coalesce(v_base_reward, 0.5); -- Default if not set

    v_final_reward := v_base_reward * power(1.5, v_new_consecutive_check_ins - 1);
    
    perform public.adjust_balance(p_user_id, 'USDT', v_final_reward);

    update public.profiles
    set last_check_in_date = v_today, consecutive_check_ins = v_new_consecutive_check_ins
    where id = p_user_id;

    insert into public.reward_logs(user_id, type, amount, asset, description)
    values(p_user_id, 'check_in', v_final_reward, 'USDT', 'Daily check-in reward for day ' || v_new_consecutive_check_ins);
    
    return query select true, 'Check-in successful!', v_final_reward;
end;
$$ language plpgsql volatile;


-- Function to settle due records (investments and trades)
create or replace function public.settle_due_records()
returns void as $$
declare
    inv record;
    trade record;
    return_amount double precision;
    quote_asset text;
begin
    -- Settle investments
    for inv in select * from public.investments where status = 'active' and settlement_date <= now() loop
        begin
            if inv.productType = 'hourly' and inv.hourly_rate is not null then
                inv.profit := inv.amount * inv.hourly_rate;
            elsif inv.productType = 'daily' and inv.daily_rate is not null and inv.period is not null then
                inv.profit := inv.amount * inv.daily_rate * inv.period;
            else
                inv.profit := 0;
            end if;
            
            return_amount := inv.amount + inv.profit;
            
            perform public.adjust_balance(inv.user_id, 'USDT', return_amount);
            
            update public.investments set status = 'settled', profit = inv.profit where id = inv.id;
        exception when others then
            -- log error, but continue loop
        end;
    end loop;

    -- Settle contract trades
    for trade in select * from public.trades where status = 'active' and orderType = 'contract' and settlement_time <= now() loop
        begin
            select t.price into trade.settlement_price from public.market_summary_data t where t.pair = trade.trading_pair;
            
            if trade.settlement_price is not null then
                 if (trade.type = 'buy' and trade.settlement_price > trade.entry_price) or (trade.type = 'sell' and trade.settlement_price < trade.entry_price) then
                    trade.outcome := 'win';
                    trade.profit := trade.amount * trade.profit_rate;
                else
                    trade.outcome := 'loss';
                    trade.profit := -trade.amount;
                end if;

                return_amount := greatest(0, trade.amount + trade.profit);
                quote_asset := split_part(trade.trading_pair, '/', 2);

                perform public.adjust_balance(trade.user_id, quote_asset, return_amount, false, true); -- is_debit_frozen=true

                update public.trades 
                set status = 'settled', outcome = trade.outcome, profit = trade.profit, settlement_price = trade.settlement_price 
                where id = trade.id;
            end if;
        exception when others then
            -- log error, but continue loop
        end;
    end loop;
end;
$$ language plpgsql;


-- Cron job log wrapper function
create or replace function public.settle_and_log()
returns void as $$
declare
  log_id bigint;
  error_details jsonb;
begin
  insert into public.cron_job_logs (job_name, start_time, status)
  values ('settle_due_records', now(), 'started') returning id into log_id;

  begin
    perform public.settle_due_records();
    
    update public.cron_job_logs
    set end_time = now(), status = 'completed'
    where id = log_id;
  exception when others then
    get stacked diagnostics error_details = pg_exception_context;
    update public.cron_job_logs
    set end_time = now(), status = 'failed', details = jsonb_build_object('error', SQLERRM, 'context', error_details)
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
alter table public.system_settings enable row level security;
alter table public.daily_tasks enable row level security;
alter table public.activities enable row level security;
alter table public.commission_rates enable row level security;

-- Admins can do anything
drop policy if exists "Enable all for admins" on public.profiles;
create policy "Enable all for admins" on public.profiles for all using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));
-- Repeat for all tables that need admin access... (example for one table)
drop policy if exists "Enable all for admins on requests" on public.requests;
create policy "Enable all for admins on requests" on public.requests for all using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));
-- (Repeat this pattern for balances, trades, investments, logs, etc.)

-- User-specific policies
drop policy if exists "Users can view their own profile" on public.profiles;
create policy "Users can view their own profile" on public.profiles for select using (auth.uid() = id);
drop policy if exists "Users can update their own profile" on public.profiles;
create policy "Users can update their own profile" on public.profiles for update using (auth.uid() = id);

drop policy if exists "Users can view their own balances" on public.balances;
create policy "Users can view their own balances" on public.balances for select using (auth.uid() = user_id);

drop policy if exists "Users can view their own trades" on public.trades;
create policy "Users can view their own trades" on public.trades for select using (auth.uid() = user_id);
drop policy if exists "Users can create trades" on public.trades;
create policy "Users can create trades" on public.trades for insert with check (auth.uid() = user_id);

drop policy if exists "Users can view their own investments" on public.investments;
create policy "Users can view their own investments" on public.investments for select using (auth.uid() = user_id);
drop policy if exists "Users can create investments" on public.investments;
create policy "Users can create investments" on public.investments for insert with check (auth.uid() = user_id);

drop policy if exists "Users can view their own requests" on public.requests;
create policy "Users can view their own requests" on public.requests for select using (auth.uid() = user_id);
drop policy if exists "Users can create requests" on public.requests;
create policy "Users can create requests" on public.requests for insert with check (auth.uid() = user_id);

drop policy if exists "Users can view their own reward logs" on public.reward_logs;
create policy "Users can view their own reward logs" on public.reward_logs for select using (auth.uid() = user_id);

drop policy if exists "Users can view and manage their own task states" on public.user_task_states;
create policy "Users can view and manage their own task states" on public.user_task_states for all using (auth.uid() = user_id);

drop policy if exists "Users can view all open swap orders" on public.swap_orders;
create policy "Users can view all open swap orders" on public.swap_orders for select using (true);
drop policy if exists "Users can manage their own swap orders" on public.swap_orders;
create policy "Users can manage their own swap orders" on public.swap_orders for all using (auth.uid() = user_id or auth.uid() = taker_id);

-- Publicly readable tables
drop policy if exists "Allow public read access" on public.system_settings;
create policy "Allow public read access" on public.system_settings for select using (true);
drop policy if exists "Allow public read access" on public.daily_tasks;
create policy "Allow public read access" on public.daily_tasks for select using (true);
drop policy if exists "Allow public read access" on public.activities;
create policy "Allow public read access" on public.activities for select using (true);
drop policy if exists "Allow public read access" on public.commission_rates;
create policy "Allow public read access" on public.commission_rates for select using (true);

-- Helper function to check for admin role
create or replace function public.is_admin(p_user_id uuid)
returns boolean as $$
  select exists (select 1 from public.profiles where id = p_user_id and is_admin = true);
$$ language sql security definer;


-- 6. 初始化数据

-- Insert default supported assets
insert into public.supported_assets (asset_name, is_active, asset_type) values
('USDT', true, 'crypto'),
('BTC', true, 'crypto'),
('ETH', true, 'crypto'),
('USD', true, 'fiat')
on conflict (asset_name) do nothing;

-- Insert default commission rates
insert into public.commission_rates (level, rate) values
(1, 0.08),
(2, 0.05),
(3, 0.02)
on conflict (level) do update set rate = excluded.rate;

-- Insert default system settings (only one row)
insert into public.system_settings (id, settings)
values (1, '{"trade_fee": 0.001, "check_in_reward_base": 0.5, "kline_refresh_interval_sec": 60}'::jsonb)
on conflict (id) do update set settings = excluded.settings;


-- 7. 定时任务 (Cron Job)
-- Schedule settlement job to run every minute
select cron.schedule('settle-due-orders', '* * * * *', 'select public.settle_and_log()');
