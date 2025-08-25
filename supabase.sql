-- supabase.sql
-- This script is designed to be idempotent. You can run it multiple times without causing errors.

-- 1. 扩展 (Extensions)
create extension if not exists "uuid-ossp";
create extension if not exists pgcrypto;
create extension if not exists pg_cron;


-- 2. 数据库表结构 (Tables)

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
comment on table public.balances is 'Stores the available and frozen balances for each user and asset type.';

-- 交易记录表 (包含币币和秒合约)
create table if not exists public.trades (
  id bigserial primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
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
comment on table public.investments is 'Records all user investments in financial products.';

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
comment on table public.reward_logs is 'Logs all rewards and commissions credited to users.';

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
comment on table public.requests is 'Tracks user requests like deposits, withdrawals, and password resets for admin approval.';

-- 系统设置表 (单行记录，用于全局配置)
create table if not exists public.system_settings (
  id int primary key default 1,
  settings jsonb,
  constraint single_row_check check (id = 1)
);
comment on table public.system_settings is 'A singleton table to store global system configurations as a JSONB object.';

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
    is_read boolean default false
);
create unique index if not exists announcements_unique_type_for_singletons_idx on public.announcements (type) where user_id is null;
comment on table public.announcements is 'Stores various types of announcements, including personal messages and global content like carousels.';


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
comment on table public.activities is 'Defines limited-time promotional activities.';

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
comment on table public.daily_tasks is 'Defines the available daily tasks for users.';


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
    taker_id uuid references public.profiles(id) on delete set null,
    taker_username text,
    payment_proof_url text
);
comment on table public.swap_orders is 'Stores peer-to-peer swap/exchange orders.';


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
comment on table public.investment_products is 'Configuration for investment products like staking and financial funds.';

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
comment on table public.market_summary_data is 'Stores the latest summary data for each trading pair.';

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
comment on table public.market_kline_data is 'Stores OHLC (k-line) data for market charts.';

-- Cron Job 日志表
create table if not exists public.cron_job_logs (
    id bigserial primary key,
    job_name text not null,
    run_time timestamp with time zone default now(),
    status text not null, -- 'started', 'completed', 'failed'
    details jsonb
);
comment on table public.cron_job_logs is 'Logs the execution of scheduled cron jobs for monitoring and debugging.';


-- 3. 索引优化 (Indexes)
create index if not exists trades_status_settlement_time_idx on public.trades (status, settlement_time);
create index if not exists investments_status_settlement_date_idx on public.investments (status, settlement_date);
create index if not exists reward_logs_user_id_created_at_idx on public.reward_logs (user_id, created_at desc);
create index if not exists user_task_states_user_id_date_idx on public.user_task_states (user_id, date desc);
create index if not exists market_kline_data_time_idx on public.market_kline_data (time desc);


-- 4. 数据库函数和触发器 (Functions & Triggers)

-- 用于在新用户注册时自动创建 profile
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, username, nickname, email, is_admin, is_test_user, inviter_id, invitation_code, avatar_url, credit_score)
  values (
    new.id,
    new.raw_user_meta_data->>'username',
    new.raw_user_meta_data->>'nickname',
    new.email,
    coalesce((new.raw_user_meta_data->>'is_admin')::boolean, false),
    coalesce((new.raw_user_meta_data->>'is_test_user')::boolean, true),
    (new.raw_user_meta_data->>'inviter_id')::uuid,
    new.raw_user_meta_data->>'invitation_code',
    new.raw_user_meta_data->>'avatar_url',
    coalesce((new.raw_user_meta_data->>'credit_score')::int, 100)
  );

  -- 为新用户初始化所有资产的余额记录
  insert into public.balances (user_id, asset, available_balance, frozen_balance)
  select new.id, asset_name, 0, 0
  from unnest(array['USDT', 'BTC', 'ETH', 'SOL', 'XRP', 'LTC', 'BNB', 'MATIC', 'DOGE', 'ADA', 'SHIB', 'AVAX', 'LINK', 'DOT', 'UNI', 'TRX', 'XLM', 'VET', 'EOS', 'FIL', 'ICP', 'XAU', 'USD', 'EUR', 'GBP']) as asset_name;

  return new;
end;
$$ language plpgsql security definer;

-- 在 auth.users 表上创建或替换触发器
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 安全地调整用户余额的函数
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
        -- 此分支处理从冻结余额的扣款 (例如：提现批准)
        update public.balances
        set frozen_balance = frozen_balance - p_amount
        where user_id = p_user_id and asset = p_asset;
    elsif p_is_frozen then
         -- 此分支处理资金从可用移至冻结 (例如：提现申请，合约下单)
        update public.balances
        set 
            available_balance = available_balance - p_amount,
            frozen_balance = frozen_balance + p_amount
        where user_id = p_user_id and asset = p_asset;
    else
        -- 标准的可用余额调整
        update public.balances
        set available_balance = available_balance + p_amount
        where user_id = p_user_id and asset = p_asset;
    end if;
end;
$$ language plpgsql volatile security definer;

-- 获取用户完整下线的函数
drop function if exists public.get_downline(uuid);
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
  select * from downline;
end;
$$ language plpgsql stable;

-- 获取平台总资金的函数
drop function if exists public.get_total_platform_balance();
create or replace function public.get_total_platform_balance()
returns double precision as $$
begin
  return (select sum(available_balance + frozen_balance) from public.balances where asset = 'USDT');
end;
$$ language plpgsql stable;


-- 分配交易佣金的函数
create or replace function public.distribute_trade_commissions()
returns trigger as $$
declare
    commission_rates double precision[] := array[0.08, 0.05, 0.02];
    v_inviter_id uuid;
    v_source_user public.profiles;
    v_commission_amount double precision;
    v_trade_amount double precision;
begin
    -- 仅为基于USDT的交易分配佣金
    if new.quote_asset = 'USDT' or new.trading_pair like '%/USDT' then
        
        v_trade_amount := coalesce(new.total, new.amount, 0);

        select * into v_source_user from public.profiles where id = new.user_id;
        v_inviter_id := v_source_user.inviter_id;

        -- 循环向上查找三级
        for level in 1..3 loop
            if v_inviter_id is null then
                exit;
            end if;

            v_commission_amount := v_trade_amount * commission_rates[level];
            
            perform public.adjust_balance(v_inviter_id, 'USDT', v_commission_amount);

            insert into public.reward_logs (user_id, type, amount, asset, source_id, source_username, source_level, description)
            values (
                v_inviter_id, 'team', v_commission_amount, 'USDT', new.id::text, 
                v_source_user.username, level, 'Level ' || level || ' commission from trade ' || new.id
            );

            select inviter_id into v_inviter_id from public.profiles where id = v_inviter_id;
        end loop;
    end if;

    return new;
end;
$$ language plpgsql;

-- 为 trades 表创建或替换返佣触发器
drop trigger if exists on_new_trade_distribute_commissions on public.trades;
create trigger on_new_trade_distribute_commissions
    after insert on public.trades
    for each row
    execute procedure public.distribute_trade_commissions();

-- 自动结算到期订单的函数
create or replace function public.settle_due_records()
returns jsonb as $$
declare
    settled_trades_count int := 0;
    settled_investments_count int := 0;
    trade_record record;
    investment_record record;
    v_profit double precision;
    v_outcome text;
begin
    -- 结算秒合约交易
    for trade_record in 
        select * from public.trades 
        where status = 'active' and orderType = 'contract' and settlement_time <= now()
    loop
        -- 确定输赢
        if (trade_record.type = 'buy' and trade_record.settlement_price > trade_record.entry_price) or 
           (trade_record.type = 'sell' and trade_record.settlement_price < trade_record.entry_price) then
            v_outcome := 'win';
            v_profit := trade_record.amount * trade_record.profit_rate;
            -- 返还本金和利润
            perform public.adjust_balance(trade_record.user_id, trade_record.quote_asset, trade_record.amount + v_profit, false, true);
        else
            v_outcome := 'loss';
            v_profit := -trade_record.amount;
            -- 只解冻（扣除）本金
            perform public.adjust_balance(trade_record.user_id, trade_record.quote_asset, trade_record.amount, false, true);
        end if;

        update public.trades 
        set status = 'settled', outcome = v_outcome, profit = v_profit
        where id = trade_record.id;
        
        settled_trades_count := settled_trades_count + 1;
    end loop;

    -- 结算理财投资
    for investment_record in
        select * from public.investments
        where status = 'active' and settlement_date <= now()
    loop
        -- 计算利润
        if investment_record.productType = 'daily' then
            v_profit := investment_record.amount * investment_record.daily_rate * investment_record.period;
        elsif investment_record.productType = 'hourly' then
            v_profit := investment_record.amount * investment_record.hourly_rate * investment_record.duration_hours;
        else
            v_profit := 0;
        end if;
        
        -- 返还本金和利润
        perform public.adjust_balance(investment_record.user_id, 'USDT', investment_record.amount + v_profit);
        
        -- 返还质押资产 (如有)
        if investment_record.staking_asset is not null and investment_record.staking_amount is not null then
            perform public.adjust_balance(investment_record.user_id, investment_record.staking_asset, investment_record.staking_amount, false, true);
        end if;

        update public.investments
        set status = 'settled', profit = v_profit
        where id = investment_record.id;
        
        settled_investments_count := settled_investments_count + 1;
    end loop;
    
    return jsonb_build_object(
        'settled_trades', settled_trades_count,
        'settled_investments', settled_investments_count
    );
end;
$$ language plpgsql volatile security definer;


-- 用于记录 Cron Job 执行的辅助函数
create or replace function public.log_cron_job_run(p_job_name text, p_status text, p_details jsonb)
returns void as $$
begin
    insert into public.cron_job_logs(job_name, status, details)
    values(p_job_name, p_status, p_details);
end;
$$ language plpgsql;

-- 包装结算函数以进行日志记录
create or replace function public.settle_and_log()
returns void as $$
declare
    result jsonb;
begin
    perform public.log_cron_job_run('settle_due_records', 'started', '{}'::jsonb);
    begin
        result := public.settle_due_records();
        perform public.log_cron_job_run('settle_due_records', 'completed', result);
    exception when others then
        perform public.log_cron_job_run('settle_due_records', 'failed', jsonb_build_object('error', SQLERRM));
    end;
end;
$$ language plpgsql;


-- 5. 定时任务 (Cron Jobs)
-- 取消旧的 cron 任务（如果存在）
select cron.unschedule('settle-due-records-job');
-- 每分钟运行一次结算和日志记录函数
select cron.schedule('settle-due-records-job', '*/1 * * * *', 'select public.settle_and_log()');


-- 6. 行级安全策略 (RLS)
alter table public.profiles enable row level security;
alter table public.balances enable row level security;
alter table public.trades enable row level security;
alter table public.investments enable row level security;
alter table public.requests enable row level security;
alter table public.reward_logs enable row level security;
alter table public.user_task_states enable row level security;
alter table public.swap_orders enable row level security;
alter table public.announcements enable row level security;
alter table public.activities enable row level security;
alter table public.daily_tasks enable row level security;
alter table public.investment_products enable row level security;
alter table public.action_logs enable row level security;
alter table public.cron_job_logs enable row level security;

-- 公开可读的表
drop policy if exists "Allow public read access to system settings" on public.system_settings;
create policy "Allow public read access to system settings" on public.system_settings for select using (true);

drop policy if exists "Allow public read access to market data" on public.market_summary_data;
create policy "Allow public read access to market data" on public.market_summary_data for select using (true);

drop policy if exists "Allow public read access to kline data" on public.market_kline_data;
create policy "Allow public read access to kline data" on public.market_kline_data for select using (true);

-- Profiles
drop policy if exists "Users can view all profiles" on public.profiles;
create policy "Users can view all profiles" on public.profiles for select using (true);

drop policy if exists "Users can insert their own profile" on public.profiles;
create policy "Users can insert their own profile" on public.profiles for insert with check (auth.uid() = id);

drop policy if exists "Users can update their own profile" on public.profiles;
create policy "Users can update their own profile" on public.profiles for update using (auth.uid() = id);

-- 用户私有数据策略
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

drop policy if exists "Users can manage their own task states" on public.user_task_states;
create policy "Users can manage their own task states" on public.user_task_states for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Swap Orders
drop policy if exists "Users can view all open swap orders" on public.swap_orders;
create policy "Users can view all open swap orders" on public.swap_orders for select using (true);

drop policy if exists "Users can manage their own swap orders" on public.swap_orders;
create policy "Users can manage their own swap orders" on public.swap_orders for all using (auth.uid() = user_id or auth.uid() = taker_id) with check (auth.uid() = user_id);

-- 公告和活动
drop policy if exists "Allow public read access to global announcements" on public.announcements;
create policy "Allow public read access to global announcements" on public.announcements for select using (user_id is null);

drop policy if exists "Users can see their own messages" on public.announcements;
create policy "Users can see their own messages" on public.announcements for select using (auth.uid() = user_id);

drop policy if exists "Allow public read for activities" on public.activities;
create policy "Allow public read for activities" on public.activities for select using (true);

drop policy if exists "Allow public read for daily tasks" on public.daily_tasks;
create policy "Allow public read for daily tasks" on public.daily_tasks for select using (true);

drop policy if exists "Allow public read for investment products" on public.investment_products;
create policy "Allow public read for investment products" on public.investment_products for select using (true);


-- 管理员策略
create or replace function public.is_admin()
returns boolean as $$
begin
  return (select is_admin from public.profiles where id = auth.uid());
end;
$$ language plpgsql security definer;

drop policy if exists "Admins have full access" on public.profiles;
create policy "Admins have full access" on public.profiles for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "Admins have full access" on public.balances;
create policy "Admins have full access" on public.balances for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "Admins have full access" on public.trades;
create policy "Admins have full access" on public.trades for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "Admins have full access" on public.investments;
create policy "Admins have full access" on public.investments for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "Admins have full access" on public.requests;
create policy "Admins have full access" on public.requests for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "Admins have full access" on public.reward_logs;
create policy "Admins have full access" on public.reward_logs for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "Admins have full access" on public.swap_orders;
create policy "Admins have full access" on public.swap_orders for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "Admins have full access" on public.system_settings;
create policy "Admins have full access" on public.system_settings for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "Admins have full access" on public.announcements;
create policy "Admins have full access" on public.announcements for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "Admins have full access" on public.activities;
create policy "Admins have full access" on public.activities for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "Admins have full access" on public.daily_tasks;
create policy "Admins have full access" on public.daily_tasks for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "Admins have full access" on public.investment_products;
create policy "Admins have full access" on public.investment_products for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "Admins have full access" on public.action_logs;
create policy "Admins have full access" on public.action_logs for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "Admins have full access" on public.cron_job_logs;
create policy "Admins have full access" on public.cron_job_logs for all using (public.is_admin()) with check (public.is_admin());
