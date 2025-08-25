-- 1. 数据库表结构

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
-- 补充说明: `profiles.id` 与 `auth.users.id` 关联

-- 用户资产余额表
create table if not exists public.balances (
  id bigserial primary key,
  user_id uuid not null references public.profiles(id),
  asset text not null,
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
    type text not null, -- 'dailyTask', 'team', 'event', 'system'
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
create index if not exists market_kline_data_time_idx on public.market_kline_data (time desc);


-- 2. 数据库函数和触发器

-- Function to handle new user setup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, username, nickname, email, invitation_code, inviter_id, avatar_url, credit_score, is_test_user)
  values (
    new.id,
    new.raw_user_meta_data->>'username',
    new.raw_user_meta_data->>'nickname',
    new.email,
    new.raw_user_meta_data->>'invitation_code',
    (new.raw_user_meta_data->>'inviter_id')::uuid,
    new.raw_user_meta_data->>'avatar_url',
    (new.raw_user_meta_data->>'credit_score')::integer,
    (new.raw_user_meta_data->>'is_test_user')::boolean
  );
  -- Initialize balances for all specified assets
  insert into public.balances(user_id, asset, available_balance, frozen_balance)
  select new.id, asset_name, 0, 0 from unnest(array[
    'BTC', 'ETH', 'USDT', 'SOL', 'XRP', 'LTC', 'BNB', 'MATIC', 'DOGE', 'ADA', 'SHIB', 
    'AVAX', 'LINK', 'DOT', 'UNI', 'TRX', 'XLM', 'VET', 'EOS', 'FIL', 'ICP',
    'XAU', 'USD', 'EUR', 'GBP'
  ]) as asset_name;
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
        -- This branch handles movements from the frozen balance (e.g. confirming withdrawal, or cancelling a contract trade)
        update public.balances
        set frozen_balance = frozen_balance - p_amount
        where user_id = p_user_id and asset = p_asset;
    elsif p_is_frozen then
         -- This branch handles movements into the frozen balance (e.g. creating withdrawal request, placing contract trade)
        update public.balances
        set 
            available_balance = available_balance - p_amount,
            frozen_balance = frozen_balance + p_amount
        where user_id = p_user_id and asset = p_asset;
    else
        -- This is a standard adjustment to the available balance (e.g. deposit, profit/loss settlement)
        update public.balances
        set available_balance = available_balance + p_amount
        where user_id = p_user_id and asset = p_asset;
    end if;
end;
$$ language plpgsql volatile security definer;


-- Drop the old function signature first to avoid errors on column changes
drop function if exists public.get_downline(uuid);
-- Function to get the full downline of a user
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
    commission_rates double precision[] := array[0.08, 0.05, 0.02];
    v_inviter_id uuid;
    v_source_user public.profiles;
    v_commission_amount double precision;
    v_trade_amount double precision;
begin
    -- Only distribute commissions for USDT-based trades
    if new.quote_asset = 'USDT' or new.trading_pair like '%/USDT' then
        
        v_trade_amount := coalesce(new.total, new.amount, 0);

        -- Get the user who made the trade
        select * into v_source_user from public.profiles where id = new.user_id;
        v_inviter_id := v_source_user.inviter_id;

        -- Loop up to 3 levels
        for level in 1..3 loop
            if v_inviter_id is null then
                exit; -- Exit loop if no more inviters
            end if;

            -- Calculate and distribute commission
            v_commission_amount := v_trade_amount * commission_rates[level];
            
            -- Use the adjust_balance function to add commission
            perform public.adjust_balance(v_inviter_id, 'USDT', v_commission_amount);

            -- Log the commission
            insert into public.reward_logs (user_id, type, amount, asset, source_id, source_username, source_level, description)
            values (
                v_inviter_id,
                'team',
                v_commission_amount,
                'USDT',
                new.id::text,
                v_source_user.username,
                level,
                'Level ' || level || ' commission from trade ' || new.id
            );

            -- Get the next inviter up the chain
            select inviter_id into v_inviter_id from public.profiles where id = v_inviter_id;
        end loop;
    end if;

    return new;
end;
$$ language plpgsql;

-- Trigger to distribute commissions on new trades
drop trigger if exists on_new_trade on public.trades;
create trigger on_new_trade
  after insert on public.trades
  for each row
  execute procedure public.distribute_trade_commissions();

-- Function to settle due trades and investments
create or replace function public.settle_due_records()
returns void as $$
declare
    trade_record record;
    investment_record record;
    profit double precision;
    total_return double precision;
    settlement_price double precision;
    outcome text;
begin
    -- Settle due contract trades
    for trade_record in
        select * from public.trades
        where status = 'active' and orderType = 'contract' and settlement_time <= now()
    loop
        -- For simplicity, we'll use the last known price from market_summary_data
        -- In a real system, you'd want a more robust price feed at the exact settlement moment.
        select price into settlement_price from public.market_summary_data where pair = trade_record.trading_pair;
        
        if settlement_price is null then
            -- Fallback or error handling if no price is found
            settlement_price := trade_record.entry_price;
        end if;

        if (trade_record.type = 'buy' and settlement_price > trade_record.entry_price) or (trade_record.type = 'sell' and settlement_price < trade_record.entry_price) then
            outcome := 'win';
            profit := trade_record.amount * trade_record.profit_rate;
            total_return := trade_record.amount + profit;
        else
            outcome := 'loss';
            profit := -trade_record.amount;
            total_return := 0;
        end if;

        -- Update the trade record
        update public.trades
        set 
            status = 'settled',
            outcome = outcome,
            settlement_price = settlement_price,
            profit = profit
        where id = trade_record.id;

        -- Return funds: Unfreeze the original amount first
        perform public.adjust_balance(trade_record.user_id, trade_record.quote_asset, trade_record.amount, false, true);
        
        -- Add the return (principal + profit, or 0 if loss)
        if total_return > 0 then
            perform public.adjust_balance(trade_record.user_id, trade_record.quote_asset, total_return);
        end if;

    end loop;

    -- Settle due investments
    for investment_record in
        select * from public.investments
        where status = 'active' and settlement_date <= now()
    loop
        if investment_record.productType = 'daily' then
            profit := investment_record.amount * investment_record.daily_rate * investment_record.period;
        elsif investment_record.productType = 'hourly' then
            profit := investment_record.amount * investment_record.hourly_rate * investment_record.duration_hours;
        else
            profit := 0;
        end if;

        total_return := investment_record.amount + profit;

        -- Update the investment record
        update public.investments
        set 
            status = 'settled',
            profit = profit
        where id = investment_record.id;

        -- Return funds
        perform public.adjust_balance(investment_record.user_id, 'USDT', total_return);

        -- If there was a staked asset, unfreeze it
        if investment_record.staking_asset is not null and investment_record.staking_amount is not null then
            perform public.adjust_balance(investment_record.user_id, investment_record.staking_asset, investment_record.staking_amount, false, true);
        end if;
    end loop;

end;
$$ language plpgsql;


-- 3. 启用 PostGIS (如果需要地理位置功能)
-- create extension if not exists postgis with schema extensions;

-- 4. 启用 pg_cron (用于定时任务)
create extension if not exists pg_cron with schema extensions;
-- grant usage on schema cron to postgres;
-- alter user supabase_admin with password 'your-postgres-password';
-- select cron.schedule('settle-records-job', '*/1 * * * *', 'select public.settle_due_records()');


-- 5. 行级安全策略 (RLS)
alter table public.profiles enable row level security;
alter table public.balances enable row level security;
alter table public.trades enable row level security;
alter table public.investments enable row level security;
alter table public.requests enable row level security;
alter table public.reward_logs enable row level security;
alter table public.user_task_states enable row level security;
alter table public.swap_orders enable row level security;
-- 系统设置等公开表不需要RLS

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
