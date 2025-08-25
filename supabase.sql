-- 完整 Supabase 数据库迁移脚本
-- 版本: 2.0
-- 特性: 幂等性 (可重复执行), 全面的索引, 动态配置, 健壮的事务和错误处理, 增强的安全性

-- 1. 启用必要的扩展
create extension if not exists "uuid-ossp" with schema extensions;
create extension if not exists pgcrypto with schema extensions;
create extension if not exists pg_cron with schema extensions;

-- 2. 数据库表结构

-- 核心用户表
create table if not exists public.profiles (
  id uuid not null primary key,
  username text unique not null,
  nickname text,
  email text unique,
  inviter_id uuid references public.profiles(id),
  is_admin boolean default false not null,
  is_test_user boolean default true not null,
  is_frozen boolean default false not null,
  invitation_code text unique,
  credit_score integer default 100 not null,
  last_check_in_date date,
  consecutive_check_ins integer default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  last_login_at timestamp with time zone,
  avatar_url text
);
comment on table public.profiles is 'Stores user profile information, linked to auth.users.';

-- 支持的资产列表
create table if not exists public.supported_assets (
    asset_code text primary key,
    asset_type text not null check (asset_type in ('crypto', 'fiat')),
    is_active boolean default true not null,
    display_name text,
    icon_url text
);
comment on table public.supported_assets is 'Defines all assets supported by the platform for balances.';

-- 初始化支持的资产
insert into public.supported_assets (asset_code, asset_type, display_name)
values
    ('USDT', 'crypto', 'Tether'),
    ('BTC', 'crypto', 'Bitcoin'),
    ('ETH', 'crypto', 'Ethereum'),
    ('SOL', 'crypto', 'Solana'),
    ('XRP', 'crypto', 'Ripple'),
    ('LTC', 'crypto', 'Litecoin'),
    ('BNB', 'crypto', 'Binance Coin'),
    ('MATIC', 'crypto', 'Polygon'),
    ('DOGE', 'crypto', 'Dogecoin'),
    ('ADA', 'crypto', 'Cardano'),
    ('SHIB', 'crypto', 'Shiba Inu'),
    ('AVAX', 'crypto', 'Avalanche'),
    ('LINK', 'crypto', 'Chainlink'),
    ('DOT', 'crypto', 'Polkadot'),
    ('UNI', 'crypto', 'Uniswap'),
    ('TRX', 'crypto', 'TRON'),
    ('XLM', 'crypto', 'Stellar'),
    ('VET', 'crypto', 'VeChain'),
    ('EOS', 'crypto', 'EOS.IO'),
    ('FIL', 'crypto', 'Filecoin'),
    ('ICP', 'crypto', 'Internet Computer'),
    ('USD', 'fiat', 'US Dollar'),
    ('EUR', 'fiat', 'Euro'),
    ('GBP', 'fiat', 'British Pound'),
    ('XAU', 'crypto', 'Gold')
on conflict (asset_code) do nothing;


-- 用户资产余额表
create table if not exists public.balances (
  id bigserial primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  asset text not null references public.supported_assets(asset_code),
  available_balance double precision default 0 not null,
  frozen_balance double precision default 0 not null,
  unique(user_id, asset)
);
comment on table public.balances is 'Stores user asset balances.';
create index if not exists balances_user_id_asset_idx on public.balances(user_id, asset);


-- 交易记录表 (包含币币和秒合约)
create table if not exists public.trades (
  id bigserial primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  trading_pair text not null,
  orderType text not null check (orderType in ('spot', 'contract')),
  type text not null check (type in ('buy', 'sell')),
  status text not null, -- spot: 'filled'; contract: 'active', 'settled'
  amount double precision not null, -- For spot: base asset quantity, For contract: quote asset investment
  -- For Spot Trades
  total double precision, -- For spot: total quote asset amount
  price double precision,
  base_asset text,
  quote_asset text,
  -- For Contract Trades
  entry_price double precision,
  settlement_time timestamp with time zone,
  period integer,
  profit_rate double precision,
  settlement_price double precision,
  outcome text check (outcome in ('win', 'loss')),
  profit double precision,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);
comment on table public.trades is 'Records all spot and contract trades for users.';
create index if not exists trades_status_settlement_time_idx on public.trades(status, settlement_time);
create index if not exists trades_user_id_created_at_idx on public.trades(user_id, created_at desc);
create index if not exists trades_trading_pair_status_idx on public.trades(trading_pair, status);


-- 理财投资记录表
create table if not exists public.investments (
    id bigserial primary key,
    user_id uuid not null references public.profiles(id) on delete cascade,
    product_name text not null,
    amount double precision not null,
    status text not null check (status in ('active', 'settled')),
    category text,
    profit double precision,
    productType text,
    daily_rate double precision,
    period integer,
    staking_asset text,
    staking_amount double precision,
    duration_hours integer,
    hourly_rate double precision,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    settlement_date timestamp with time zone not null
);
comment on table public.investments is 'Tracks user investments in financial products.';
create index if not exists investments_status_settlement_date_idx on public.investments(status, settlement_date);

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
    description text,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);
comment on table public.reward_logs is 'Logs all rewards and commissions issued to users.';
create index if not exists reward_logs_user_id_created_at_idx on public.reward_logs(user_id, created_at desc);


-- 用户请求表 (充值、提现、密码重置)
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
comment on table public.requests is 'Tracks user requests like deposits, withdrawals, etc.';
create index if not exists requests_status_created_at_idx on public.requests(status, created_at desc);

-- P2P闪兑订单表
create table if not exists public.swap_orders (
    id bigserial primary key,
    user_id uuid not null references public.profiles(id) on delete cascade,
    username text,
    from_asset text not null,
    from_amount double precision not null,
    to_asset text not null,
    to_amount double precision not null,
    status text not null,
    taker_id uuid references public.profiles(id) on delete set null,
    taker_username text,
    payment_proof_url text,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);
comment on table public.swap_orders is 'Stores P2P swap/exchange orders.';
create index if not exists swap_orders_status_idx on public.swap_orders(status);

-- 系统设置与产品配置
create table if not exists public.system_settings (
  id int primary key default 1,
  settings jsonb,
  constraint single_row_check check (id = 1)
);
comment on table public.system_settings is 'Single-row table for global JSONB settings.';

create table if not exists public.commission_rates (
    level smallint primary key,
    rate double precision not null,
    check (level > 0 and level <= 3)
);
comment on table public.commission_rates is 'Defines commission rates for referral levels.';

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
comment on table public.investment_products is 'Configuration for investment products.';

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
comment on table public.daily_tasks is 'Defines available daily tasks.';


-- 复合表与日志
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

create table if not exists public.cron_job_logs (
  id bigserial primary key,
  job_name text not null,
  run_time timestamp with time zone default now(),
  status text not null, -- 'success', 'failure'
  details text,
  records_affected integer
);
comment on table public.cron_job_logs is 'Logs the execution status of scheduled cron jobs.';

-- 数据表 (由外部服务填充)
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
create index if not exists market_kline_data_time_idx on public.market_kline_data (time desc);


-- 3. 初始化配置数据
insert into public.system_settings (id, settings)
values (1, '{
    "trade_fee_rate": 0.001,
    "kline_refresh_interval_sec": 60,
    "check_in_reward_base": 0.5,
    "check_in_reward_multiplier": 1.5
}') on conflict (id) do update
set settings = excluded.settings;

insert into public.commission_rates (level, rate)
values (1, 0.08), (2, 0.05), (3, 0.02)
on conflict (level) do update
set rate = excluded.rate;

-- 4. 数据库函数与触发器

-- Function to create a profile for a new user and initialize balances
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  v_asset_code text;
begin
  -- Insert into public.profiles
  insert into public.profiles (id, username, email, nickname, invitation_code, inviter_id, is_test_user, avatar_url)
  values (
    new.id,
    new.raw_user_meta_data->>'username',
    new.email,
    new.raw_user_meta_data->>'nickname',
    new.raw_user_meta_data->>'invitation_code',
    (new.raw_user_meta_data->>'inviter_id')::uuid,
    coalesce((new.raw_user_meta_data->>'is_test_user')::boolean, true),
    new.raw_user_meta_data->>'avatar_url'
  );

  -- Initialize balances for all supported assets
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
declare
  v_available double precision;
begin
    if p_is_debit_frozen then
        -- This branch handles movements FROM the frozen balance (e.g., confirming a withdrawal)
        update public.balances
        set frozen_balance = frozen_balance - p_amount
        where user_id = p_user_id and asset = p_asset;
    elsif p_is_frozen then
        -- This branch handles movements INTO the frozen balance (e.g., placing a trade, requesting withdrawal)
        select available_balance into v_available from public.balances where user_id = p_user_id and asset = p_asset;
        if v_available < p_amount then
            raise exception 'Insufficient available balance to freeze for user % and asset %', p_user_id, p_asset;
        end if;

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


-- Function to get the full downline of a user up to 3 levels
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

-- Function to get total platform USDT balance
drop function if exists public.get_total_platform_balance();
create or replace function public.get_total_platform_balance()
returns double precision as $$
begin
  return (select coalesce(sum(available_balance + frozen_balance), 0) from public.balances where asset = 'USDT');
end;
$$ language plpgsql;

-- Function to distribute commissions up to 3 levels
create or replace function public.distribute_trade_commissions()
returns trigger as $$
declare
    v_inviter_id uuid;
    v_source_user public.profiles;
    v_trade_amount double precision;
    v_upline_user_id uuid;
    v_commission_rate double precision;
    v_commission_amount double precision;
    v_level int;
begin
    v_trade_amount := coalesce(new.total, new.amount, 0);

    -- Only distribute commissions for trades with a quote asset (e.g. USDT in BTC/USDT)
    if new.quote_asset is null or v_trade_amount <= 0 then
        return new;
    end if;

    select * into v_source_user from public.profiles where id = new.user_id;
    v_inviter_id := v_source_user.inviter_id;

    for v_level in 1..3 loop
        if v_inviter_id is null then
            exit;
        end if;
        
        v_upline_user_id := v_inviter_id;

        -- Acquire a row-level lock to prevent race conditions
        select id into v_upline_user_id from public.profiles where id = v_upline_user_id for update;

        -- Get commission rate for the current level
        select rate into v_commission_rate from public.commission_rates where level = v_level;
        
        if found and v_commission_rate > 0 then
            v_commission_amount := v_trade_amount * v_commission_rate;
            
            -- Use the safe adjust_balance function
            perform public.adjust_balance(v_upline_user_id, new.quote_asset, v_commission_amount);

            insert into public.reward_logs (user_id, type, amount, asset, source_id, source_username, source_level, description)
            values (v_upline_user_id, 'team', v_commission_amount, new.quote_asset, new.id::text, v_source_user.username, v_level, 'Level ' || v_level || ' commission from trade ' || new.id);
        end if;

        -- Get the next inviter up the chain
        select inviter_id into v_inviter_id from public.profiles where id = v_upline_user_id;
    end loop;

    return new;
end;
$$ language plpgsql;

-- Trigger to distribute commissions on new trades
drop trigger if exists on_trade_insert_distribute_commissions on public.trades;
create trigger on_trade_insert_distribute_commissions
  after insert on public.trades
  for each row execute procedure public.distribute_trade_commissions();

-- Function for daily check-ins
create or replace function public.handle_user_check_in(p_user_id uuid)
returns table(success boolean, message text, reward_amount double precision)
as $$
declare
    v_last_check_in_date date;
    v_consecutive_days int;
    v_today date := current_date;
    v_yesterday date := current_date - 1;
    v_reward_base double precision;
    v_reward_multiplier double precision;
    v_final_reward double precision;
begin
    select last_check_in_date, consecutive_check_ins into v_last_check_in_date, v_consecutive_days
    from public.profiles where id = p_user_id;

    if v_last_check_in_date = v_today then
        return query select false, 'You have already checked in today.', 0.0;
        return;
    end if;

    if v_last_check_in_date = v_yesterday then
        v_consecutive_days := (v_consecutive_days % 7) + 1;
    else
        v_consecutive_days := 1;
    end if;

    select (settings->>'check_in_reward_base')::double precision into v_reward_base from public.system_settings where id = 1;
    select (settings->>'check_in_reward_multiplier')::double precision into v_reward_multiplier from public.system_settings where id = 1;

    v_final_reward := v_reward_base * power(v_reward_multiplier, v_consecutive_days - 1);

    update public.profiles
    set last_check_in_date = v_today, consecutive_check_ins = v_consecutive_days
    where id = p_user_id;
    
    perform public.adjust_balance(p_user_id, 'USDT', v_final_reward);

    insert into public.reward_logs (user_id, type, amount, asset, description)
    values (p_user_id, 'check_in', v_final_reward, 'USDT', 'Daily check-in reward for day ' || v_consecutive_days);

    return query select true, 'Check-in successful!', v_final_reward;
end;
$$ language plpgsql;

-- Function for generic reward crediting
create or replace function public.credit_reward(p_user_id uuid, p_amount double precision, p_asset text, p_reward_type text, p_source_id text, p_description text)
returns void as $$
begin
    perform public.adjust_balance(p_user_id, p_asset, p_amount);
    insert into public.reward_logs (user_id, type, amount, asset, source_id, description)
    values (p_user_id, p_reward_type, p_amount, p_asset, p_source_id, p_description);
end;
$$ language plpgsql;


-- Main settlement function for cron job
drop function if exists public.settle_due_records();
create or replace function public.settle_due_records()
returns table(settled_trades_count int, settled_investments_count int)
as $$
declare
    trade_record record;
    investment_record record;
    v_settled_trades_count int := 0;
    v_settled_investments_count int := 0;
    v_quote_asset text;
begin
    -- Settle due contract trades
    for trade_record in
        select * from public.trades
        where status = 'active' and settlement_time <= now()
        order by settlement_time
        limit 200 -- Process in batches to avoid long transactions
    loop
        begin
            v_quote_asset := split_part(trade_record.trading_pair, '/', 2);

            update public.trades
            set
                status = 'settled',
                settlement_price = (select price from public.market_summary_data where pair = trade_record.trading_pair),
                outcome = case
                    when type = 'buy' and (select price from public.market_summary_data where pair = trade_record.trading_pair) > entry_price then 'win'
                    when type = 'sell' and (select price from public.market_summary_data where pair = trade_record.trading_pair) < entry_price then 'win'
                    else 'loss'
                end,
                profit = case
                    when (type = 'buy' and (select price from public.market_summary_data where pair = trade_record.trading_pair) > entry_price)
                      or (type = 'sell' and (select price from public.market_summary_data where pair = trade_record.trading_pair) < entry_price)
                    then trade_record.amount * trade_record.profit_rate
                    else -trade_record.amount
                end
            where id = trade_record.id;

            -- Unfreeze the original amount and add it back if won, plus profit
            if (select outcome from public.trades where id = trade_record.id) = 'win' then
                perform public.adjust_balance(trade_record.user_id, v_quote_asset, trade_record.amount + (select profit from public.trades where id = trade_record.id));
            end if;
            
            -- Unfreeze the original amount only if lost
            perform public.adjust_balance(trade_record.user_id, v_quote_asset, -trade_record.amount, true, true);
            
            v_settled_trades_count := v_settled_trades_count + 1;
        exception when others then
            -- Log error for a specific trade and continue
            insert into public.cron_job_logs (job_name, status, details)
            values ('settle_due_records', 'failure', 'Failed to settle trade ID ' || trade_record.id || ': ' || SQLERRM);
        end;
    end loop;

    -- Settle due investments
    for investment_record in
        select * from public.investments
        where status = 'active' and settlement_date <= now()
        limit 200
    loop
       begin
            update public.investments
            set
                status = 'settled',
                profit = case
                    when "productType" = 'hourly' then amount * hourly_rate * duration_hours
                    when "productType" = 'daily' then amount * daily_rate * period
                    else 0
                end
            where id = investment_record.id;
            
            perform public.adjust_balance(investment_record.user_id, 'USDT', investment_record.amount + (select profit from public.investments where id = investment_record.id));
            v_settled_investments_count := v_settled_investments_count + 1;
       exception when others then
            insert into public.cron_job_logs (job_name, status, details)
            values ('settle_due_records', 'failure', 'Failed to settle investment ID ' || investment_record.id || ': ' || SQLERRM);
       end;
    end loop;
    
    return query select v_settled_trades_count, v_settled_investments_count;
end;
$$ language plpgsql;


-- Wrapper function for cron to log execution details
create or replace function public.settle_and_log()
returns void as $$
declare
  result record;
begin
    insert into public.cron_job_logs (job_name, status, details)
    values ('settle_due_records', 'started', 'Starting settlement process.');

    begin
        select * from public.settle_due_records() into result;
        
        insert into public.cron_job_logs (job_name, status, details, records_affected)
        values ('settle_due_records', 'success', 'Settlement finished successfully.', result.settled_trades_count + result.settled_investments_count);
    exception when others then
        insert into public.cron_job_logs (job_name, status, details)
        values ('settle_due_records', 'failure', 'An unexpected error occurred: ' || SQLERRM || ' (SQLSTATE: ' || SQLSTATE || ')');
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

-- Admin policies
drop policy if exists "Admins can do everything on profiles" on public.profiles;
create policy "Admins can do everything on profiles" on public.profiles for all using (is_admin(auth.uid()));
drop policy if exists "Admins can do everything on balances" on public.balances;
create policy "Admins can do everything on balances" on public.balances for all using (is_admin(auth.uid()));
drop policy if exists "Admins can do everything on trades" on public.trades;
create policy "Admins can do everything on trades" on public.trades for all using (is_admin(auth.uid()));
drop policy if exists "Admins can do everything on investments" on public.investments;
create policy "Admins can do everything on investments" on public.investments for all using (is_admin(auth.uid()));
drop policy if exists "Admins can do everything on requests" on public.requests;
create policy "Admins can do everything on requests" on public.requests for all using (is_admin(auth.uid()));
drop policy if exists "Admins can do everything on swap_orders" on public.swap_orders;
create policy "Admins can do everything on swap_orders" on public.swap_orders for all using (is_admin(auth.uid()));
drop policy if exists "Admins can do everything on reward_logs" on public.reward_logs;
create policy "Admins can do everything on reward_logs" on public.reward_logs for all using (is_admin(auth.uid()));
drop policy if exists "Admins can do everything on user_task_states" on public.user_task_states;
create policy "Admins can do everything on user_task_states" on public.user_task_states for all using (is_admin(auth.uid()));


-- User policies
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

drop policy if exists "Users can manage their own requests" on public.requests;
create policy "Users can manage their own requests" on public.requests for all using (auth.uid() = user_id);

drop policy if exists "Users can view their own reward logs" on public.reward_logs;
create policy "Users can view their own reward logs" on public.reward_logs for select using (auth.uid() = user_id);

drop policy if exists "Users can manage their own task states" on public.user_task_states;
create policy "Users can manage their own task states" on public.user_task_states for all using (auth.uid() = user_id);

drop policy if exists "Users can view all open swap orders" on public.swap_orders;
create policy "Users can view all open swap orders" on public.swap_orders for select using (status = 'open');

drop policy if exists "Users can manage their own swap orders" on public.swap_orders;
create policy "Users can manage their own swap orders" on public.swap_orders for all using (auth.uid() = user_id or auth.uid() = taker_id);

-- Helper function to check for admin role
create or replace function is_admin(p_user_id uuid)
returns boolean
language plpgsql
security definer
as $$
declare
  v_is_admin boolean;
begin
  select is_admin into v_is_admin from public.profiles where id = p_user_id;
  return coalesce(v_is_admin, false);
end;
$$;


-- 6. 定时任务 (Cron Job)
select cron.schedule('settle-due-orders-job', '* * * * *', $$select public.settle_and_log()$$);
select cron.schedule('cleanup-old-data-job', '0 1 * * *', $$-- Add cleanup logic here, e.g., DELETE FROM public.cron_job_logs WHERE run_time < now() - interval '30 days';$$);

-- 7. 初始数据 (可选)
-- (已在表定义中通过 on conflict do nothing/update 处理)

-- 脚本结束
