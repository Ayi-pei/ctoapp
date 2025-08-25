-- 1. 数据库扩展
create extension if not exists "uuid-ossp" with schema public;
create extension if not exists "pgcrypto" with schema public;
create extension if not exists "pg_cron" with schema public;

-- 2. 数据库表结构

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
  avatar_url text,
  last_check_in_date date,
  consecutive_check_ins integer default 0
);
-- 补充说明: `profiles.id` 与 `auth.users.id` 关联

-- 系统支持的资产列表
create table if not exists public.supported_assets (
  asset_code text primary key,
  asset_name text not null,
  is_active boolean default true,
  created_at timestamp with time zone default timezone('utc'::text, now())
);
-- 插入一些默认资产
insert into public.supported_assets (asset_code, asset_name) values
('USDT', 'Tether'), ('BTC', 'Bitcoin'), ('ETH', 'Ethereum'), ('SOL', 'Solana'),
('XRP', 'Ripple'), ('LTC', 'Litecoin'), ('BNB', 'Binance Coin'), ('MATIC', 'Polygon'),
('DOGE', 'Dogecoin'), ('ADA', 'Cardano'), ('SHIB', 'Shiba Inu'), ('AVAX', 'Avalanche'),
('LINK', 'Chainlink'), ('DOT', 'Polkadot'), ('UNI', 'Uniswap'), ('TRX', 'TRON'),
('XLM', 'Stellar'), ('VET', 'VeChain'), ('EOS', 'EOS'), ('FIL', 'Filecoin'),
('ICP', 'Internet Computer'), ('XAU', 'Gold'), ('USD', 'US Dollar'), ('EUR', 'Euro'), ('GBP', 'British Pound')
on conflict (asset_code) do nothing;


-- 用户资产余额表
create table if not exists public.balances (
  id bigserial primary key,
  user_id uuid not null references public.profiles(id),
  asset text not null references public.supported_assets(asset_code),
  available_balance double precision default 0,
  frozen_balance double precision default 0,
  unique(user_id, asset)
);

-- 交易记录表 (包含币币和秒合约)
create table if not exists public.trades (
  id bigserial primary key,
  user_id uuid not null references public.profiles(id),
  trading_pair text not null,
  orderType text not null check (orderType in ('spot', 'contract')),
  type text not null check (type in ('buy', 'sell')),
  status text not null, -- spot: 'filled', 'cancelled'; contract: 'active', 'settled'
  amount double precision not null, -- 对于spot是基础货币数量, 对于contract是投资额
  total double precision, -- a.k.a quote_asset_amount
  price double precision,
  base_asset text,
  quote_asset text,
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
    user_id uuid references public.profiles(id), -- Null for system-wide announcements
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
    rewardRule text,
    howToClaim text,
    expiresAt timestamp with time zone,
    imgSrc text,
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

-- 定时任务日志
create table if not exists public.cron_job_logs (
    id bigserial primary key,
    job_name text not null,
    start_time timestamp with time zone default now(),
    end_time timestamp with time zone,
    status text, -- 'started', 'completed', 'failed'
    details jsonb
);

-- 佣金比例配置表
create table if not exists public.commission_rates (
    level smallint primary key,
    rate double precision not null,
    description text
);
-- 插入默认佣金比例
insert into public.commission_rates (level, rate, description) values
(1, 0.08, 'Level 1 Commission Rate'),
(2, 0.05, 'Level 2 Commission Rate'),
(3, 0.02, 'Level 3 Commission Rate')
on conflict (level) do update set rate = excluded.rate;


-- 3. 索引优化
create index if not exists trades_status_settlement_time_idx on public.trades (status, settlement_time);
create index if not exists investments_status_settlement_date_idx on public.investments (status, settlement_date);
create index if not exists reward_logs_user_id_created_at_idx on public.reward_logs (user_id, created_at);
create index if not exists user_task_states_user_id_date_idx on public.user_task_states (user_id, date);
create index if not exists market_kline_data_time_idx on public.market_kline_data (time desc);


-- 4. 函数与触发器

-- Function to handle new user creation
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  v_asset_code text;
begin
  -- Insert into profiles
  insert into public.profiles (id, username, email, inviter_id, invitation_code, avatar_url)
  values (
    new.id,
    new.raw_user_meta_data->>'username',
    new.email,
    (new.raw_user_meta_data->>'inviter_id')::uuid,
    new.raw_user_meta_data->>'invitation_code',
    new.raw_user_meta_data->>'avatar_url'
  );

  -- Create initial balances for all supported assets
  for v_asset_code in select asset_code from public.supported_assets where is_active = true loop
    insert into public.balances (user_id, asset, available_balance, frozen_balance)
    values (new.id, v_asset_code, 0, 0);
  end loop;

  return new;
end;
$$;

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
        -- This branch handles movements from the frozen balance (e.g. confirming withdrawal)
        update public.balances
        set frozen_balance = frozen_balance - p_amount
        where user_id = p_user_id and asset = p_asset;
    elsif p_is_frozen then
         -- This branch handles movements into the frozen balance (e.g. creating withdrawal request)
        update public.balances
        set
            available_balance = available_balance - p_amount,
            frozen_balance = frozen_balance + p_amount
        where user_id = p_user_id and asset = p_asset;
    else
        -- This is a standard adjustment to the available balance
        update public.balances
        set available_balance = available_balance + p_amount
        where user_id = p_user_id and asset = p_asset;
    end if;
end;
$$ language plpgsql volatile security definer;

-- Function to handle rewards with logging
create or replace function public.credit_reward(
    p_user_id uuid,
    p_amount double precision,
    p_asset text,
    p_type text,
    p_source_id text,
    p_description text
)
returns void as $$
begin
    perform public.adjust_balance(p_user_id, p_asset, p_amount);

    insert into public.reward_logs (user_id, type, amount, asset, source_id, description)
    values (p_user_id, p_type, p_amount, p_asset, p_source_id, p_description);
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
    v_rate double precision;
begin
    -- Only distribute commissions for trades where the quote asset is configured for it
    if new.quote_asset is not null then
        v_trade_amount := coalesce(new.total, new.amount, 0);

        -- Get the user who made the trade
        select * into v_source_user from public.profiles where id = new.user_id;
        v_inviter_id := v_source_user.inviter_id;

        -- Loop up to 3 levels
        for level in 1..3 loop
            if v_inviter_id is null then
                exit; -- Exit loop if no more inviters
            end if;

            -- Get commission rate from the config table
            select rate into v_rate from public.commission_rates where commission_rates.level = level;

            if v_rate is not null then
                v_commission_amount := v_trade_amount * v_rate;

                perform public.adjust_balance(v_inviter_id, new.quote_asset, v_commission_amount);

                insert into public.reward_logs (user_id, type, amount, asset, source_id, source_username, source_level, description)
                values (
                    v_inviter_id,
                    'team',
                    v_commission_amount,
                    new.quote_asset,
                    new.id::text,
                    v_source_user.username,
                    level,
                    'Level ' || level || ' commission from trade ' || new.id
                );
            end if;

            -- Get the next inviter up the chain
            select inviter_id into v_inviter_id from public.profiles where id = v_inviter_id;
        end loop;
    end if;

    return new;
end;
$$ language plpgsql;

-- Trigger for trade commissions
drop trigger if exists on_trade_insert_distribute_commissions on public.trades;
create trigger on_trade_insert_distribute_commissions
  after insert on public.trades
  for each row execute procedure public.distribute_trade_commissions();

-- Function to handle user check-in
create or replace function public.handle_user_check_in(p_user_id uuid)
returns table(success boolean, message text, reward_amount double precision) as $$
declare
  v_last_check_in_date date;
  v_consecutive_check_ins int;
  v_today date := current_date;
  v_yesterday date := current_date - 1;
  v_reward double precision;
begin
  select last_check_in_date, consecutive_check_ins into v_last_check_in_date, v_consecutive_check_ins
  from public.profiles where id = p_user_id;

  if v_last_check_in_date = v_today then
    return query select false, 'You have already checked in today.', 0.0;
    return;
  end if;

  if v_last_check_in_date = v_yesterday then
    v_consecutive_check_ins := (v_consecutive_check_ins % 7) + 1;
  else
    v_consecutive_check_ins := 1;
  end if;

  v_reward := 0.5 * (1.5 ^ (v_consecutive_check_ins - 1));

  update public.profiles
  set
    last_check_in_date = v_today,
    consecutive_check_ins = v_consecutive_check_ins
  where id = p_user_id;

  perform public.credit_reward(p_user_id, v_reward, 'USDT', 'check_in', v_today::text, 'Daily Check-in Reward');

  return query select true, 'Check-in successful!', v_reward;
end;
$$ language plpgsql;

-- Function to settle due trades and investments
create or replace function public.settle_due_records()
returns jsonb as $$
declare
    settled_trade record;
    settled_investment record;
    trade_count int := 0;
    investment_count int := 0;
    v_quote_asset text;
begin
    -- Settle contract trades
    for settled_trade in
        select * from public.trades
        where status = 'active' and settlement_time <= now()
        for update skip locked
    loop
        -- Determine quote asset from trading pair
        v_quote_asset := split_part(settled_trade.trading_pair, '/', 2);

        update public.trades
        set
            status = 'settled',
            settlement_price = (select price from public.market_summary_data where pair = settled_trade.trading_pair),
            outcome = case
                when type = 'buy' and (select price from public.market_summary_data where pair = settled_trade.trading_pair) > entry_price then 'win'
                when type = 'sell' and (select price from public.market_summary_data where pair = settled_trade.trading_pair) < entry_price then 'win'
                else 'loss'
            end,
            profit = case
                when type = 'buy' and (select price from public.market_summary_data where pair = settled_trade.trading_pair) > entry_price then settled_trade.amount * settled_trade.profit_rate
                when type = 'sell' and (select price from public.market_summary_data where pair = settled_trade.trading_pair) < entry_price then settled_trade.amount * settled_trade.profit_rate
                else -settled_trade.amount
            end
        where id = settled_trade.id returning profit into settled_trade.profit;

        -- Adjust balances: unfreeze original amount and add it back if won, then add profit
        perform public.adjust_balance(settled_trade.user_id, v_quote_asset, settled_trade.amount, true, true); -- Unfreeze
        if settled_trade.profit > 0 then
             perform public.adjust_balance(settled_trade.user_id, v_quote_asset, settled_trade.amount + settled_trade.profit); -- Return principal + profit
        end if;

        trade_count := trade_count + 1;
    end loop;

    -- Settle investments
    for settled_investment in
        select * from public.investments
        where status = 'active' and settlement_date <= now()
        for update skip locked
    loop
        update public.investments
        set
            status = 'settled',
            profit = case
                when productType = 'daily' then amount * daily_rate * period
                when productType = 'hourly' then amount * hourly_rate * duration_hours
                else 0
            end
        where id = settled_investment.id returning profit into settled_investment.profit;

        -- Return principal and profit to USDT balance
        perform public.adjust_balance(settled_investment.user_id, 'USDT', settled_investment.amount + settled_investment.profit);
        
        investment_count := investment_count + 1;
    end loop;

    return jsonb_build_object('settled_trades', trade_count, 'settled_investments', investment_count);
end;
$$ language plpgsql;


-- Cron job wrapper function with logging
create or replace function public.run_settlement_and_log()
returns void as $$
declare
    log_id bigint;
    result jsonb;
begin
    insert into public.cron_job_logs (job_name, status)
    values ('settle_due_records', 'started') returning id into log_id;

    begin
        result := public.settle_due_records();
        update public.cron_job_logs
        set status = 'completed', end_time = now(), details = result
        where id = log_id;
    exception
        when others then
            update public.cron_job_logs
            set status = 'failed', end_time = now(), details = jsonb_build_object('error', SQLERRM)
            where id = log_id;
            raise;
    end;
end;
$$ language plpgsql;

-- Schedule the job to run every minute
select cron.schedule('settle-due-orders-job', '*/1 * * * *', 'select public.run_settlement_and_log()');


-- 5. 行级安全策略 (RLS)
alter table public.profiles enable row level security;
alter table public.balances enable row level security;
alter table public.trades enable row level security;
alter table public.investments enable row level security;
alter table public.requests enable row level security;
alter table public.reward_logs enable row level security;
alter table public.user_task_states enable row level security;
alter table public.swap_orders enable row level security;
alter table public.action_logs enable row level security;
alter table public.system_settings enable row level security;
alter table public.daily_tasks enable row level security;
alter table public.activities enable row level security;

-- Admin policies (for tables managed by admins)
drop policy if exists "Allow admin full access" on public.system_settings;
create policy "Allow admin full access" on public.system_settings for all using ((select is_admin from public.profiles where id = auth.uid()));

drop policy if exists "Allow admin full access" on public.daily_tasks;
create policy "Allow admin full access" on public.daily_tasks for all using ((select is_admin from public.profiles where id = auth.uid())) with check ((select is_admin from public.profiles where id = auth.uid()));

drop policy if exists "Allow admin full access" on public.activities;
create policy "Allow admin full access" on public.activities for all using ((select is_admin from public.profiles where id = auth.uid())) with check ((select is_admin from public.profiles where id = auth.uid()));

drop policy if exists "Allow admin full access to requests" on public.requests;
create policy "Allow admin full access to requests" on public.requests for all using ((select is_admin from public.profiles where id = auth.uid()));

drop policy if exists "Allow admin full access to action logs" on public.action_logs;
create policy "Allow admin full access to action logs" on public.action_logs for all using ((select is_admin from public.profiles where id = auth.uid()));

-- User-specific policies
drop policy if exists "Users can view all profiles" on public.profiles;
create policy "Users can view all profiles" on public.profiles for select using (true);

drop policy if exists "Users can insert their own profile" on public.profiles;
create policy "Users can insert their own profile" on public.profiles for insert with check (auth.uid() = id);

drop policy if exists "Users can update their own profile" on public.profiles;
create policy "Users can update their own profile" on public.profiles for update using (auth.uid() = id);

drop policy if exists "Users can view their own balances" on public.balances;
create policy "Users can view their own balances" on public.balances for select using (auth.uid() = user_id);

drop policy if exists "Users can view their own trades" on public.trades;
create policy "Users can view their own trades" on public.trades for select using (auth.uid() = user_id);

drop policy if exists "Users can view their own investments" on public.investments;
create policy "Users can view their own investments" on public.investments for select using (auth.uid() = user_id);

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

-- Read-only policies for public data
drop policy if exists "Allow all users to read announcements" on public.announcements;
create policy "Allow all users to read announcements" on public.announcements for select using (true);

drop policy if exists "Allow all users to read activities" on public.activities;
create policy "Allow all users to read activities" on public.activities for select using (true);

drop policy if exists "Allow all users to read daily tasks" on public.daily_tasks;
create policy "Allow all users to read daily tasks" on public.daily_tasks for select using (true);

drop policy if exists "Allow all users to read investment products" on public.investment_products;
create policy "Allow all users to read investment products" on public.investment_products for select using (true);

drop policy if exists "Allow all users to read market data" on public.market_summary_data;
create policy "Allow all users to read market data" on public.market_summary_data for select using (true);

drop policy if exists "Allow all users to read kline data" on public.market_kline_data;
create policy "Allow all users to read kline data" on public.market_kline_data for select using (true);
