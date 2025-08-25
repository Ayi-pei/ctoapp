-- 1. 数据库扩展
create extension if not exists "uuid-ossp" with schema extensions;
create extension if not exists pgcrypto with schema extensions;
create extension if not exists pg_cron with schema extensions;


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
comment on table public.profiles is 'Stores all user public profiles.';
comment on column public.profiles.id is 'References auth.users.id';

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
    user_id uuid references public.profiles(id) on delete cascade, -- Null for system-wide announcements
    content jsonb,
    title text,
    theme text,
    priority integer,
    expires_at timestamp with time zone,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    is_read boolean default false,
    constraint unique_type_for_singletons check (type not in ('carousel', 'horn') or user_id is null)
);
-- This makes sure there's only one row for 'carousel' and 'horn'
create unique index if not exists announcements_singletons_idx on public.announcements (type) where user_id is null;


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
    user_id uuid not null references public.profiles(id) on delete cascade,
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
    "time" timestamp with time zone not null,
    "open" double precision,
    high double precision,
    low double precision,
    "close" double precision,
    unique(trading_pair, "time")
);


-- 佣金比例配置表
create table if not exists public.commission_rates (
    level integer primary key,
    rate double precision not null
);

-- Cron Job 日志表
create table if not exists public.cron_job_logs (
  id bigserial primary key,
  job_name text not null,
  run_time timestamp with time zone default timezone('utc'::text, now()) not null,
  status text not null, -- 'started', 'completed', 'failed'
  details jsonb
);


-- 3. 索引优化
create index if not exists trades_status_settlement_time_idx on public.trades (status, settlement_time);
create index if not exists investments_status_settlement_date_idx on public.investments (status, settlement_date);
create index if not exists market_kline_data_time_idx on public.market_kline_data ("time" desc);
create index if not exists reward_logs_user_id_created_at_idx on public.reward_logs (user_id, created_at desc);
create index if not exists user_task_states_user_id_date_idx on public.user_task_states (user_id, date);

-- 4. 数据库函数与触发器

-- 新用户自动处理函数
create or replace function public.handle_new_user()
returns trigger as $$
declare
    supported_assets text[] := array['USDT', 'BTC', 'ETH', 'SOL', 'XRP', 'LTC', 'BNB', 'MATIC', 'DOGE', 'ADA', 'SHIB', 'AVAX', 'LINK', 'DOT', 'UNI', 'TRX', 'XLM', 'VET', 'EOS', 'FIL', 'ICP', 'XAU', 'USD', 'EUR', 'GBP'];
    asset_name text;
begin
  -- 插入用户资料
  insert into public.profiles (id, username, nickname, email, inviter_id, invitation_code, avatar_url)
  values (
    new.id,
    new.raw_user_meta_data ->> 'username',
    new.raw_user_meta_data ->> 'nickname',
    new.email,
    (new.raw_user_meta_data ->> 'inviter_id')::uuid,
    new.raw_user_meta_data ->> 'invitation_code',
    new.raw_user_meta_data ->> 'avatar_url'
  );

  -- 为新用户初始化所有支持的资产余额记录
  foreach asset_name in array supported_assets
  loop
    insert into public.balances (user_id, asset) values (new.id, asset_name);
  end loop;

  return new;
end;
$$ language plpgsql security definer;

-- Trigger to call the function when a new user signs up
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 安全地调整用户余额
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
        -- 处理从冻结余额的扣款 (例如: 提现批准)
        update public.balances
        set frozen_balance = frozen_balance - p_amount
        where user_id = p_user_id and asset = p_asset;
    elsif p_is_frozen then
         -- 处理资金进入冻结状态 (例如: 合约下单, 提现申请)
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


-- 递归获取用户下线(最多3级)
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

-- 统计平台总资金
drop function if exists public.get_total_platform_balance();
create or replace function public.get_total_platform_balance()
returns double precision as $$
begin
  return (select sum(available_balance + frozen_balance) from public.balances where asset = 'USDT');
end;
$$ language plpgsql;


-- 通用的奖励发放函数
create or replace function public.credit_reward(
    p_user_id uuid,
    p_asset text,
    p_amount double precision,
    p_type text,
    p_source_id text default null,
    p_source_username text default null,
    p_source_level integer default null,
    p_description text default null
)
returns void as $$
begin
    -- 调整余额
    perform public.adjust_balance(p_user_id, p_asset, p_amount);
    
    -- 记录日志
    insert into public.reward_logs (user_id, type, amount, asset, source_id, source_username, source_level, description)
    values (p_user_id, p_type, p_amount, p_asset, p_source_id, p_source_username, p_source_level, p_description);
end;
$$ language plpgsql volatile security definer;


-- 分配交易佣金
create or replace function public.distribute_trade_commissions()
returns trigger as $$
declare
    v_inviter_id uuid;
    v_source_user public.profiles;
    v_commission_amount double precision;
    v_trade_amount double precision;
    v_rate record;
begin
    -- 只处理基于USDT的交易对
    if new.quote_asset = 'USDT' or new.trading_pair like '%/USDT' then
        
        v_trade_amount := coalesce(new.total, new.amount, 0);

        select * into v_source_user from public.profiles where id = new.user_id;
        v_inviter_id := v_source_user.inviter_id;

        -- 循环三级
        for level in 1..3 loop
            if v_inviter_id is null then
                exit; -- 没有更多上级
            end if;

            -- 从配置表获取佣金率
            select rate into v_rate from public.commission_rates where level = level;
            if found and v_rate.rate > 0 then
                v_commission_amount := v_trade_amount * v_rate.rate;
                
                -- 发放奖励和记录日志
                perform public.credit_reward(
                    p_user_id := v_inviter_id,
                    p_asset := 'USDT',
                    p_amount := v_commission_amount,
                    p_type := 'team',
                    p_source_id := new.id::text,
                    p_source_username := v_source_user.username,
                    p_source_level := level,
                    p_description := 'Level ' || level || ' commission from trade ' || new.id
                );
            end if;

            -- 获取更上一级邀请人
            select inviter_id into v_inviter_id from public.profiles where id = v_inviter_id;
        end loop;
    end if;

    return new;
end;
$$ language plpgsql;

-- 为 trades 表创建佣金分配触发器
drop trigger if exists on_trade_commission on public.trades;
create trigger on_trade_commission
  after insert on public.trades
  for each row execute procedure public.distribute_trade_commissions();

-- 处理每日签到
create or replace function public.handle_user_check_in(p_user_id uuid)
returns table(success boolean, message text, reward_amount double precision) as $$
declare
    v_last_check_in_date date;
    v_consecutive_days integer;
    v_reward double precision;
    v_today date := current_date;
begin
    select last_check_in_date, consecutive_check_ins into v_last_check_in_date, v_consecutive_days
    from public.profiles where id = p_user_id;

    if v_last_check_in_date = v_today then
        return query select false, 'You have already checked in today.', 0.0;
        return;
    end if;

    if v_last_check_in_date = v_today - interval '1 day' then
        v_consecutive_days := (v_consecutive_days % 7) + 1;
    else
        v_consecutive_days := 1;
    end if;

    v_reward := 0.5 * (1.5 ^ (v_consecutive_days - 1));

    -- 发放奖励
    perform public.credit_reward(
        p_user_id := p_user_id,
        p_asset := 'USDT',
        p_amount := v_reward,
        p_type := 'dailyCheckIn',
        p_description := 'Daily check-in reward for day ' || v_consecutive_days
    );
    
    -- 更新用户签到状态
    update public.profiles
    set last_check_in_date = v_today, consecutive_check_ins = v_consecutive_days
    where id = p_user_id;
    
    return query select true, 'Check-in successful!', v_reward;

end;
$$ language plpgsql volatile security definer;


-- 创建活期理财订单
create or replace function public.create_hourly_investment(
    p_user_id uuid,
    p_product_name text,
    p_amount double precision,
    p_duration_hours integer,
    p_hourly_rate double precision
)
returns void as $$
begin
    -- 扣除可用余额
    perform public.adjust_balance(p_user_id, 'USDT', -p_amount);
    
    -- 创建投资记录
    insert into public.investments (user_id, product_name, amount, created_at, settlement_date, status, productType, duration_hours, hourly_rate, category)
    values (p_user_id, p_product_name, p_amount, now(), now() + (p_duration_hours || ' hours')::interval, 'active', 'hourly', p_duration_hours, p_hourly_rate, 'finance');
end;
$$ language plpgsql;


-- 创建质押理财订单
create or replace function public.create_daily_investment(
    p_user_id uuid,
    p_product_name text,
    p_amount double precision,
    p_daily_rate double precision,
    p_period integer,
    p_category text,
    p_staking_asset text default null,
    p_staking_amount double precision default null
)
returns void as $$
begin
    -- 扣除本金
    perform public.adjust_balance(p_user_id, 'USDT', -p_amount);
    
    -- 如果有质押要求，则冻结质押资产
    if p_staking_asset is not null and p_staking_amount > 0 then
        perform public.adjust_balance(p_user_id, p_staking_asset, p_staking_amount, true);
    end if;

    insert into public.investments(user_id, product_name, amount, created_at, settlement_date, status, productType, daily_rate, period, category, staking_asset, staking_amount)
    values (p_user_id, p_product_name, p_amount, now(), now() + (p_period || ' days')::interval, 'active', 'daily', p_daily_rate, p_period, p_category, p_staking_asset, p_staking_amount);
end;
$$ language plpgsql;


-- 自动结算到期订单 (由 Cron 调用)
create or replace function public.settle_due_records()
returns jsonb as $$
declare
    settled_trade record;
    settled_investment record;
    settled_trades_count int := 0;
    settled_investments_count int := 0;
    v_quote_asset text;
begin
    -- 结算到期的秒合约交易
    for settled_trade in 
        select * from public.trades 
        where status = 'active' and settlement_time <= now()
        for update
    loop
        begin
            -- 确定结算币种
            v_quote_asset := split_part(settled_trade.trading_pair, '/', 2);

            -- 计算盈亏
            declare
                v_outcome text;
                v_profit double precision;
                latest_price double precision;
            begin
                select close into latest_price from public.market_kline_data where trading_pair = settled_trade.trading_pair order by time desc limit 1;
                
                if latest_price is null then
                    -- 如果没有K线，就用汇总价格
                    select price into latest_price from public.market_summary_data where pair = settled_trade.trading_pair;
                end if;
                
                if settled_trade.type = 'buy' then
                    v_outcome := case when latest_price > settled_trade.entry_price then 'win' else 'loss' end;
                else -- 'sell'
                    v_outcome := case when latest_price < settled_trade.entry_price then 'win' else 'loss' end;
                end if;
                
                v_profit := case when v_outcome = 'win' then settled_trade.amount * settled_trade.profit_rate else -settled_trade.amount end;

                -- 更新交易记录
                update public.trades
                set status = 'settled', settlement_price = latest_price, outcome = v_outcome, profit = v_profit
                where id = settled_trade.id;

                -- 返还本金和利润
                perform public.adjust_balance(settled_trade.user_id, v_quote_asset, settled_trade.amount + v_profit, true, true);
                
                settled_trades_count := settled_trades_count + 1;
            end;
        exception when others then
            -- log error for this specific trade and continue
        end;
    end loop;

    -- 结算到期的理财投资
    for settled_investment in 
        select * from public.investments
        where status = 'active' and settlement_date <= now()
        for update
    loop
        begin
            declare
                v_profit double precision;
            begin
                 if settled_investment.productType = 'hourly' then
                    v_profit := settled_investment.amount * settled_investment.hourly_rate * settled_investment.duration_hours;
                else -- daily
                    v_profit := settled_investment.amount * settled_investment.daily_rate * settled_investment.period;
                end if;

                update public.investments
                set status = 'settled', profit = v_profit
                where id = settled_investment.id;

                -- 返还本金和收益
                perform public.adjust_balance(settled_investment.user_id, 'USDT', settled_investment.amount + v_profit);
                
                -- 如果有解冻资产，则解冻
                if settled_investment.staking_asset is not null and settled_investment.staking_amount > 0 then
                    perform public.adjust_balance(settled_investment.user_id, settled_investment.staking_asset, -settled_investment.staking_amount, true);
                end if;

                settled_investments_count := settled_investments_count + 1;
            end;
        exception when others then
            -- log error and continue
        end;
    end loop;
    
    return jsonb_build_object(
        'status', 'success',
        'settled_trades', settled_trades_count,
        'settled_investments', settled_investments_count
    );
end;
$$ language plpgsql;


-- Cron Job 日志记录函数
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
    v_details jsonb;
begin
    perform public.log_cron_job_run('settle_due_records', 'started', '{}'::jsonb);
    
    begin
        select public.settle_due_records() into v_details;
        perform public.log_cron_job_run('settle_due_records', 'completed', v_details);
    exception when others then
        v_details := jsonb_build_object('error', SQLERRM);
        perform public.log_cron_job_run('settle_due_records', 'failed', v_details);
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
alter table public.action_logs enable row level security;
alter table public.cron_job_logs enable row level security;
alter table public.commission_rates enable row level security;
alter table public.system_settings enable row level security;
alter table public.daily_tasks enable row level security;
alter table public.activities enable row level security;
alter table public.announcements enable row level security;
alter table public.investment_products enable row level security;
alter table public.market_summary_data enable row level security;
alter table public.market_kline_data enable row level security;

-- Admin-only policies for sensitive tables
drop policy if exists "Allow full access to admins" on public.action_logs;
create policy "Allow full access to admins" on public.action_logs for all using (public.is_admin(auth.uid()));
drop policy if exists "Allow full access to admins" on public.cron_job_logs;
create policy "Allow full access to admins" on public.cron_job_logs for all using (public.is_admin(auth.uid()));
drop policy if exists "Allow full access to admins" on public.commission_rates;
create policy "Allow full access to admins" on public.commission_rates for all using (public.is_admin(auth.uid()));
drop policy if exists "Allow full access to admins" on public.system_settings;
create policy "Allow full access to admins" on public.system_settings for all using (public.is_admin(auth.uid()));
drop policy if exists "Allow full access to admins" on public.daily_tasks;
create policy "Allow full access to admins" on public.daily_tasks for all using (public.is_admin(auth.uid()));
drop policy if exists "Allow full access to admins" on public.activities;
create policy "Allow full access to admins" on public.activities for all using (public.is_admin(auth.uid()));
drop policy if exists "Allow full access to admins" on public.announcements;
create policy "Allow full access to admins" on public.announcements for all using (public.is_admin(auth.uid()));
drop policy if exists "Allow full access to admins" on public.investment_products;
create policy "Allow full access to admins" on public.investment_products for all using (public.is_admin(auth.uid()));

-- Policies for public or user-specific data
drop policy if exists "Users can view all profiles" on public.profiles;
create policy "Users can view all profiles" on public.profiles for select using (true);
drop policy if exists "Users can insert their own profile" on public.profiles;
create policy "Users can insert their own profile" on public.profiles for insert with check (auth.uid() = id);
drop policy if exists "Users can update their own profile" on public.profiles;
create policy "Users can update their own profile" on public.profiles for update using (auth.uid() = id);

drop policy if exists "Users can view their own balances" on public.balances;
create policy "Users can view their own balances" on public.balances for select using (auth.uid() = user_id);
drop policy if exists "Admins can view all balances" on public.balances;
create policy "Admins can view all balances" on public.balances for select using (public.is_admin(auth.uid()));

drop policy if exists "Users can view their own trades" on public.trades;
create policy "Users can view their own trades" on public.trades for select using (auth.uid() = user_id);
drop policy if exists "Admins can view all trades" on public.trades;
create policy "Admins can view all trades" on public.trades for select using (public.is_admin(auth.uid()));

drop policy if exists "Users can view their own investments" on public.investments;
create policy "Users can view their own investments" on public.investments for select using (auth.uid() = user_id);
drop policy if exists "Admins can view all investments" on public.investments;
create policy "Admins can view all investments" on public.investments for select using (public.is_admin(auth.uid()));

drop policy if exists "Users can view and create their own requests" on public.requests;
create policy "Users can view and create their own requests" on public.requests for all using (auth.uid() = user_id);
drop policy if exists "Admins can manage all requests" on public.requests;
create policy "Admins can manage all requests" on public.requests for all using (public.is_admin(auth.uid()));

drop policy if exists "Users can view their own reward logs" on public.reward_logs;
create policy "Users can view their own reward logs" on public.reward_logs for select using (auth.uid() = user_id);
drop policy if exists "Admins can view all reward logs" on public.reward_logs;
create policy "Admins can view all reward logs" on public.reward_logs for select using (public.is_admin(auth.uid()));

drop policy if exists "Users can view and manage their own task states" on public.user_task_states;
create policy "Users can view and manage their own task states" on public.user_task_states for all using (auth.uid() = user_id);
drop policy if exists "Admins can view all task states" on public.user_task_states;
create policy "Admins can view all task states" on public.user_task_states for select using (public.is_admin(auth.uid()));

drop policy if exists "Users can view all open swap orders" on public.swap_orders;
create policy "Users can view all open swap orders" on public.swap_orders for select using (true);
drop policy if exists "Users can manage their own swap orders" on public.swap_orders;
create policy "Users can manage their own swap orders" on public.swap_orders for all using (auth.uid() = user_id or auth.uid() = taker_id);
drop policy if exists "Admins can manage all swap orders" on public.swap_orders;
create policy "Admins can manage all swap orders" on public.swap_orders for all using (public.is_admin(auth.uid()));

-- Public read access for market data
drop policy if exists "Allow public read access to market data" on public.market_summary_data;
create policy "Allow public read access to market data" on public.market_summary_data for select using (true);
drop policy if exists "Allow public read access to market kline" on public.market_kline_data;
create policy "Allow public read access to market kline" on public.market_kline_data for select using (true);

-- Helper function to check for admin role
create or replace function public.is_admin(p_user_id uuid)
returns boolean as $$
declare
    v_is_admin boolean;
begin
    select is_admin into v_is_admin from public.profiles where id = p_user_id;
    return coalesce(v_is_admin, false);
end;
$$ language plpgsql security definer;


-- 6. 默认数据填充

-- 填充佣金比例
insert into public.commission_rates (level, rate) values
(1, 0.08),
(2, 0.05),
(3, 0.02)
on conflict (level) do update set rate = excluded.rate;


-- 7. 定时任务 (Cron Jobs)

-- 每分钟运行一次结算任务
select cron.schedule('settle-orders-every-minute', '* * * * *', $$
  select public.settle_and_log();
$$);
