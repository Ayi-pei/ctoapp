-- supabase.sql

-- 1. 开启扩展
create extension if not exists "uuid-ossp";
create extension if not exists pgroonga;
create extension if not exists pg_cron;

-- 2. 自定义类型
drop type if exists public.order_type;
create type public.order_type as enum ('buy', 'sell');

drop type if exists public.order_outcome;
create type public.order_outcome as enum ('win', 'loss');

drop type if exists public.contract_status;
create type public.contract_status as enum ('active', 'settled');

drop type if exists public.spot_status;
create type public.spot_status as enum ('filled', 'cancelled');

drop type if exists public.investment_status;
create type public.investment_status as enum ('active', 'settled');

drop type if exists public.request_status;
create type public.request_status as enum ('pending', 'approved', 'rejected');

drop type if exists public.transaction_type;
create type public.transaction_type as enum ('deposit', 'withdrawal', 'adjustment');

drop type if exists public.swap_order_status;
create type public.swap_order_status as enum ('open', 'pending_payment', 'pending_confirmation', 'completed', 'cancelled', 'disputed');

-- 3. 表定义
create table if not exists public.profiles (
    id uuid primary key,
    username text unique not null,
    nickname text,
    email text unique,
    inviter_id uuid references public.profiles(id),
    is_admin boolean default false,
    is_test_user boolean default false,
    is_frozen boolean default false,
    invitation_code text unique,
    credit_score integer default 100,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    last_login_at timestamp with time zone,
    avatar_url text
);
comment on table public.profiles is 'Stores user profile information.';

create table if not exists public.balances (
    id uuid primary key default gen_random_uuid(),
    user_id uuid references public.profiles(id) not null,
    asset text not null,
    available_balance double precision default 0,
    frozen_balance double precision default 0,
    unique(user_id, asset)
);
comment on table public.balances is 'Stores user asset balances.';

create table if not exists public.trades (
    id uuid primary key default gen_random_uuid(),
    user_id uuid references public.profiles(id) not null,
    trading_pair text not null,
    type public.order_type not null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    -- Contract-specific
    amount double precision,
    entry_price double precision,
    settlement_time timestamp with time zone,
    period integer,
    profit_rate double precision,
    status public.contract_status,
    settlement_price double precision,
    outcome public.order_outcome,
    profit double precision,
    orderType text, -- 'contract' or 'spot'
    -- Spot-specific
    base_asset text,
    quote_asset text,
    total double precision, -- For spot trades (amount * price)
    price double precision, -- For spot trades
    spot_status public.spot_status
);
comment on table public.trades is 'Stores all user trades, both contract and spot.';

create table if not exists public.investments (
    id uuid primary key default gen_random_uuid(),
    user_id uuid references public.profiles(id) not null,
    product_name text not null,
    amount double precision not null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    settlement_date timestamp with time zone not null,
    status public.investment_status not null default 'active',
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
comment on table public.investments is 'Stores user investments in financial products.';

create table if not exists public.requests (
    id uuid primary key default gen_random_uuid(),
    user_id uuid references public.profiles(id) not null,
    type text not null, -- 'deposit', 'withdrawal', 'password_reset'
    status public.request_status not null default 'pending',
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    asset text,
    amount double precision,
    address text,
    transaction_hash text,
    new_password text
);
comment on table public.requests is 'Stores user requests for admin approval.';

create table if not exists public.reward_logs (
    id uuid primary key default gen_random_uuid(),
    user_id uuid references public.profiles(id) not null,
    type text not null, -- 'dailyTask', 'team', 'event', 'system'
    amount double precision not null,
    asset text not null,
    source_id text,
    source_username text,
    source_level integer,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    description text
);
comment on table public.reward_logs is 'Logs all rewards and commissions.';

create table if not exists public.investment_products (
    id uuid primary key default gen_random_uuid(),
    name text not null,
    price double precision,
    daily_rate double precision,
    period integer,
    max_purchase integer,
    img_src text,
    category text,
    product_type text,
    active_start_time text,
    active_end_time text,
    hourly_tiers jsonb,
    staking_asset text,
    staking_amount double precision
);

create table if not exists public.system_settings (
    id integer primary key,
    settings jsonb not null
);

create table if not exists public.announcements (
    id uuid primary key default gen_random_uuid(),
    type text not null, -- 'personal_message', 'carousel', 'horn'
    content jsonb,
    title text,
    user_id uuid references public.profiles(id),
    is_read boolean default false,
    date timestamp with time zone default timezone('utc'::text, now()) not null,
    theme text,
    priority integer,
    expires_at timestamp with time zone
);

create table if not exists public.daily_tasks (
    id uuid primary key default gen_random_uuid(),
    title text not null,
    description text,
    reward double precision,
    reward_type text,
    link text,
    img_src text,
    status text,
    trigger text
);

create table if not exists public.user_task_states (
    id uuid primary key default gen_random_uuid(),
    user_id uuid references public.profiles(id) not null,
    task_id uuid references public.daily_tasks(id) not null,
    date date not null,
    completed boolean default false,
    unique(user_id, task_id, date)
);

create table if not exists public.activities (
    id uuid primary key default gen_random_uuid(),
    title text not null,
    description text,
    reward_rule text,
    how_to_claim text,
    expires_at timestamp with time zone,
    img_src text,
    status text,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table if not exists public.action_logs (
    id uuid primary key default gen_random_uuid(),
    entity_type text,
    entity_id text,
    action text,
    operator_id uuid,
    operator_username text,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    details text
);

create table if not exists public.swap_orders (
    id uuid primary key default gen_random_uuid(),
    user_id uuid references public.profiles(id) not null,
    username text not null,
    from_asset text not null,
    from_amount double precision not null,
    to_asset text not null,
    to_amount double precision not null,
    status public.swap_order_status not null default 'open',
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    taker_id uuid references public.profiles(id),
    taker_username text,
    payment_proof_url text
);

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
    trading_pair text not null,
    time timestamp with time zone not null,
    open double precision not null,
    high double precision not null,
    low double precision not null,
    close double precision not null,
    primary key (trading_pair, time)
);

-- 4. 数据库函数和触发器
-- Function to handle new user setup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  -- Create a profile for the new user
  insert into public.profiles (id, username, nickname, email, invitation_code, avatar_url, inviter_id, is_test_user, credit_score)
  values (
    new.id,
    new.raw_user_meta_data->>'username',
    new.raw_user_meta_data->>'nickname',
    new.email,
    new.raw_user_meta_data->>'invitation_code',
    new.raw_user_meta_data->>'avatar_url',
    (new.raw_user_meta_data->>'inviter_id')::uuid,
    (new.raw_user_meta_data->>'is_test_user')::boolean,
    (new.raw_user_meta_data->>'credit_score')::integer
  );
  
  -- Initialize balances for the new user
  insert into public.balances (user_id, asset, available_balance, frozen_balance)
  values
    (new.id, 'USDT', 10000.00, 0), -- Welcome bonus
    (new.id, 'BTC', 0, 0),
    (new.id, 'ETH', 0, 0);
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
        -- This branch handles movements from the frozen balance
        update public.balances
        set frozen_balance = frozen_balance - p_amount
        where user_id = p_user_id and asset = p_asset;
    elsif p_is_frozen then
         -- This branch handles movements into the frozen balance
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

-- Trigger to execute commission distribution on new trades
drop trigger if exists on_new_trade on public.trades;
create trigger on_new_trade
    after insert on public.trades
    for each row
    execute function public.distribute_trade_commissions();

-- Function to automatically settle due records
create or replace function public.settle_due_records()
returns void as $$
declare
    trade_record record;
    investment_record record;
    profit double precision;
    total_return double precision;
    settlement_price double precision;
    outcome public.order_outcome;
begin
    -- Settle due contract trades
    for trade_record in select * from public.trades where status = 'active' and settlement_time <= now() loop
        -- Simple mock settlement price logic, replace with real data if available
        select close into settlement_price from public.market_kline_data where trading_pair = trade_record.trading_pair order by time desc limit 1;
        
        if settlement_price is null then
           -- Fallback if no kline data is available
           settlement_price := trade_record.entry_price * (1 + (random() - 0.5) * 0.001);
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
        
        update public.trades
        set status = 'settled',
            settlement_price = settlement_price,
            outcome = outcome,
            profit = profit
        where id = trade_record.id;

        -- Return funds
        perform public.adjust_balance(trade_record.user_id, 'USDT', total_return);
        -- Debit the frozen amount
        perform public.adjust_balance(trade_record.user_id, 'USDT', trade_record.amount, true, true);

    end loop;
    
    -- Settle due investments
    for investment_record in select * from public.investments where status = 'active' and settlement_date <= now() loop
        if investment_record.productType = 'daily' and investment_record.daily_rate is not null and investment_record.period is not null then
            profit := investment_record.amount * investment_record.daily_rate * investment_record.period;
        elsif investment_record.productType = 'hourly' and investment_record.hourly_rate is not null and investment_record.duration_hours is not null then
            profit := investment_record.amount * investment_record.hourly_rate;
        else
            profit := 0;
        end if;
        
        total_return := investment_record.amount + profit;
        
        update public.investments
        set status = 'settled',
            profit = profit
        where id = investment_record.id;
        
        -- Return funds
        perform public.adjust_balance(investment_record.user_id, 'USDT', total_return);

        -- If there was a staked asset, unfreeze it
        if investment_record.staking_asset is not null and investment_record.staking_amount is not null then
            perform public.adjust_balance(investment_record.user_id, investment_record.staking_asset, investment_record.staking_amount, true, true);
        end if;
    end loop;

end;
$$ language plpgsql;

-- Schedule the settlement function to run every minute
select cron.schedule('settle-due-records-job', '*/1 * * * *', 'select public.settle_due_records()');


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
