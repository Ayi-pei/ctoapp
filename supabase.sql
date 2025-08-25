-- supabase.sql

-- 1. 启用必要的扩展
create extension if not exists "uuid-ossp" with schema extensions;
create extension if not exists "pg_cron" with schema extensions;

-- 2. 创建表结构

-- 存储用户公开信息
create table if not exists public.profiles (
    id uuid not null primary key,
    updated_at timestamp with time zone,
    username text not null,
    nickname text,
    avatar_url text,
    invitation_code text not null,
    inviter_id uuid references public.profiles(id),
    is_admin boolean default false,
    is_test_user boolean default true,
    is_frozen boolean default false,
    credit_score integer default 100,
    last_login_at timestamp with time zone,
    email text not null,
    constraint username_length check (char_length(username) >= 3),
    constraint username_unique unique(username)
);

comment on table public.profiles is 'Stores public profile information for each user.';
comment on column public.profiles.id is 'References auth.users.id';

-- 存储用户资产余额
create table if not exists public.balances (
    id uuid primary key default uuid_generate_v4(),
    user_id uuid not null references public.profiles(id) on delete cascade,
    asset text not null,
    available_balance numeric(30, 8) not null default 0.0,
    frozen_balance numeric(30, 8) not null default 0.0,
    created_at timestamp with time zone default now(),
    updated_at timestamp with time zone default now(),
    constraint positive_available_balance check (available_balance >= 0),
    constraint positive_frozen_balance check (frozen_balance >= 0),
    constraint user_asset_unique unique(user_id, asset)
);

comment on table public.balances is 'Stores asset balances for each user.';

-- 存储所有交易记录（币币 & 秒合约）
create table if not exists public.trades (
    id uuid primary key default uuid_generate_v4(),
    user_id uuid not null references public.profiles(id) on delete cascade,
    order_type text not null, -- 'spot' or 'contract'
    trading_pair text not null,
    type text not null, -- 'buy' or 'sell'
    status text not null, -- 'active', 'settled', 'filled', 'cancelled'
    amount numeric(30, 8),
    price numeric(30, 8),
    total numeric(30, 8),
    entry_price numeric(30, 8),
    settlement_price numeric(30, 8),
    settlement_time timestamp with time zone,
    period integer,
    profit_rate numeric(10, 4),
    outcome text, -- 'win' or 'loss'
    profit numeric(30, 8),
    base_asset text,
    quote_asset text,
    created_at timestamp with time zone default now()
);

comment on table public.trades is 'Stores all spot and contract trade records.';

-- 存储理财投资记录
create table if not exists public.investments (
    id uuid primary key default uuid_generate_v4(),
    user_id uuid not null references public.profiles(id) on delete cascade,
    product_name text not null,
    amount numeric(30, 8) not null,
    status text not null, -- 'active', 'settled'
    created_at timestamp with time zone default now(),
    settlement_date timestamp with time zone not null,
    profit numeric(30, 8),
    category text, -- 'staking' or 'finance'
    product_type text, -- 'daily' or 'hourly'
    daily_rate numeric(10, 4),
    period integer,
    hourly_rate numeric(10, 4),
    duration_hours integer,
    staking_asset text,
    staking_amount numeric(30, 8)
);

comment on table public.investments is 'Stores user investment records.';

-- 存储管理员审核请求
create table if not exists public.requests (
    id uuid primary key default uuid_generate_v4(),
    user_id uuid not null references public.profiles(id) on delete cascade,
    type text not null, -- 'deposit', 'withdrawal', 'password_reset'
    asset text,
    amount numeric(30, 8),
    address text,
    transaction_hash text,
    new_password text,
    status text not null default 'pending', -- 'pending', 'approved', 'rejected'
    created_at timestamp with time zone default now()
);

comment on table public.requests is 'Stores user requests like deposits and withdrawals for admin approval.';

-- 存储佣金和奖励日志
create table if not exists public.reward_logs (
    id uuid primary key default uuid_generate_v4(),
    user_id uuid not null references public.profiles(id) on delete cascade,
    type text not null, -- 'team', 'dailyTask', 'event', 'system'
    amount numeric(30, 8) not null,
    asset text not null,
    source_id text,
    source_username text,
    source_level integer,
    description text,
    created_at timestamp with time zone default now()
);

comment on table public.reward_logs is 'Logs all rewards and commissions credited to users.';

-- 存储用户每日任务完成状态
create table if not exists public.user_task_states (
    id uuid primary key default uuid_generate_v4(),
    user_id uuid not null references public.profiles(id) on delete cascade,
    task_id text not null,
    date date not null,
    completed boolean not null,
    constraint user_task_date_unique unique (user_id, task_id, date)
);

comment on table public.user_task_states is 'Tracks daily task completion for each user.';

-- 存储P2P闪兑订单
create table if not exists public.swap_orders (
    id uuid primary key default uuid_generate_v4(),
    user_id uuid not null references public.profiles(id) on delete cascade,
    username text not null,
    from_asset text not null,
    from_amount numeric(30, 8) not null,
    to_asset text not null,
    to_amount numeric(30, 8) not null,
    status text not null,
    created_at timestamp with time zone default now(),
    taker_id uuid references public.profiles(id),
    taker_username text,
    payment_proof_url text
);

comment on table public.swap_orders is 'Stores peer-to-peer swap orders.';

-- 系统设置 (KV store)
create table if not exists public.system_settings (
  id bigint primary key,
  settings jsonb,
  constraint singleton check (id = 1)
);
comment on table public.system_settings is 'Stores global system settings as a single JSONB object.';

-- 活动
create table if not exists public.activities (
    id uuid primary key default uuid_generate_v4(),
    title text not null,
    description text not null,
    reward_rule text,
    how_to_claim text,
    expires_at timestamp with time zone,
    img_src text,
    status text not null,
    created_at timestamp with time zone default now()
);
comment on table public.activities is 'Stores limited-time activities and promotions.';

-- 公告
create table if not exists public.announcements (
    id uuid primary key default uuid_generate_v4(),
    type text not null,
    content jsonb,
    title text,
    user_id uuid references public.profiles(id),
    theme text,
    priority integer,
    expires_at timestamp with time zone,
    created_at timestamp with time zone default now()
);
comment on table public.announcements is 'Stores system announcements, carousel content, and horn messages.';

-- 理财产品
create table if not exists public.investment_products (
    id uuid primary key default uuid_generate_v4(),
    name text not null,
    price numeric(30, 8),
    daily_rate numeric(10, 4),
    period integer,
    max_purchase integer,
    img_src text,
    category text,
    product_type text,
    active_start_time text,
    active_end_time text,
    hourly_tiers jsonb,
    staking_asset text,
    staking_amount numeric(30, 8)
);
comment on table public.investment_products is 'Stores definitions for all investment products.';

-- 每日任务
create table if not exists public.daily_tasks (
    id uuid primary key default uuid_generate_v4(),
    title text not null,
    description text not null,
    reward numeric(30, 8) not null,
    reward_type text not null,
    link text not null,
    status text not null,
    trigger text not null,
    img_src text
);
comment on table public.daily_tasks is 'Stores definitions for daily tasks.';

-- 管理员操作日志
create table if not exists public.action_logs (
    id uuid primary key default uuid_generate_v4(),
    entity_type text not null,
    entity_id text not null,
    action text not null,
    operator_id uuid not null,
    operator_username text not null,
    details text,
    created_at timestamp with time zone default now()
);
comment on table public.action_logs is 'Logs actions performed by administrators.';

-- 市场数据
create table if not exists public.market_summary_data (
    pair text primary key,
    price numeric(30, 8),
    change numeric(10, 4),
    volume numeric(30, 8),
    high numeric(30, 8),
    low numeric(30, 8),
    icon text,
    updated_at timestamp with time zone default now()
);
comment on table public.market_summary_data is 'Stores the latest summary data for each market.';

create table if not exists public.market_kline_data (
    time timestamp with time zone not null,
    trading_pair text not null,
    open numeric(30, 8),
    high numeric(30, 8),
    low numeric(30, 8),
    close numeric(30, 8),
    primary key (time, trading_pair)
);
comment on table public.market_kline_data is 'Stores OHLC (candlestick) data for markets.';


-- 3. 数据库函数

-- 调整用户余额
create or replace function public.adjust_balance(p_user_id uuid, p_asset text, p_amount numeric, p_is_frozen boolean default false, p_is_debit_frozen boolean default false)
returns void
language plpgsql
security definer
as $$
declare
    current_available numeric(30, 8);
    current_frozen numeric(30, 8);
begin
    -- 确保余额记录存在
    insert into public.balances (user_id, asset)
    values (p_user_id, p_asset)
    on conflict (user_id, asset) do nothing;

    -- 锁定行以防止并发问题
    select available_balance, frozen_balance
    into current_available, current_frozen
    from public.balances
    where user_id = p_user_id and asset = p_asset
    for update;

    if p_is_debit_frozen then
        -- 处理冻结余额的借方（扣款），例如提现批准或合约亏损
        if current_frozen < p_amount then
            raise exception 'Insufficient frozen balance for user % and asset %', p_user_id, p_asset;
        end if;
        update public.balances
        set frozen_balance = frozen_balance - p_amount,
            updated_at = now()
        where user_id = p_user_id and asset = p_asset;
    elsif p_is_frozen then
        -- 处理可用余额与冻结余额之间的转移
        if p_amount > 0 then
            -- 增加冻结余额 (例如：理财质押)
            if current_available < p_amount then
                 raise exception 'Insufficient available balance for user % and asset % to freeze', p_user_id, p_asset;
            end if;
             update public.balances
             set available_balance = available_balance - p_amount,
                 frozen_balance = frozen_balance + p_amount,
                 updated_at = now()
             where user_id = p_user_id and asset = p_asset;
        else
            -- 减少冻结余额，返还到可用余额 (例如: 提现拒绝)
            if current_frozen < abs(p_amount) then
                 raise exception 'Insufficient frozen balance for user % and asset % to unfreeze', p_user_id, p_asset;
            end if;
             update public.balances
             set available_balance = available_balance + abs(p_amount),
                 frozen_balance = frozen_balance - abs(p_amount),
                 updated_at = now()
             where user_id = p_user_id and asset = p_asset;
        end if;
    else
        -- 直接调整可用余额
        if current_available + p_amount < 0 then
            raise exception 'Insufficient available balance for user % and asset %', p_user_id, p_asset;
        end if;
        update public.balances
        set available_balance = available_balance + p_amount,
            updated_at = now()
        where user_id = p_user_id and asset = p_asset;
    end if;
end;
$$;


-- 自动创建用户资料
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, username, nickname, email, invitation_code, inviter_id, is_test_user, credit_score, avatar_url)
  values (
    new.id,
    new.raw_user_meta_data->>'username',
    new.raw_user_meta_data->>'nickname',
    new.email,
    new.raw_user_meta_data->>'invitation_code',
    (new.raw_user_meta_data->>'inviter_id')::uuid,
    (new.raw_user_meta_data->>'is_test_user')::boolean,
    (new.raw_user_meta_data->>'credit_score')::integer,
    new.raw_user_meta_data->>'avatar_url'
  );
  return new;
end;
$$;

-- 获取用户的下级代理
create or replace function public.get_downline(p_user_id uuid)
returns table(id uuid, username text, nickname text, email text, inviter_id uuid, is_admin boolean, is_test_user boolean, is_frozen boolean, invitation_code text, created_at timestamp with time zone, credit_score integer, last_login_at timestamp with time zone, avatar_url text, level int)
language plpgsql
as $$
begin
    return query
    with recursive downline as (
        select p.id, p.username, p.nickname, p.email, p.inviter_id, p.is_admin, p.is_test_user, p.is_frozen, p.invitation_code, p.created_at, p.credit_score, p.last_login_at, p.avatar_url, 1 as level
        from public.profiles p
        where p.inviter_id = p_user_id
        union all
        select p.id, p.username, p.nickname, p.email, p.inviter_id, p.is_admin, p.is_test_user, p.is_frozen, p.invitation_code, p.created_at, p.credit_score, p.last_login_at, p.avatar_url, d.level + 1
        from public.profiles p
        join downline d on p.inviter_id = d.id
        where d.level < 3
    )
    select * from downline;
end;
$$;

-- 获取平台总资金
create or replace function public.get_total_platform_balance()
returns numeric
language sql
as $$
    select sum(available_balance + frozen_balance) from public.balances where asset = 'USDT';
$$;

-- 自动结算到期的秒合约和理财
create or replace function public.settle_due_records()
returns void
language plpgsql
as $$
declare
    trade_record record;
    investment_record record;
    profit numeric;
    total_return numeric;
begin
    -- 结算秒合约
    for trade_record in
        select * from public.trades
        where status = 'active' and order_type = 'contract' and settlement_time <= now()
        for update
    loop
        -- 模拟获取最新价格（在生产环境中，这应该从一个价格表中读取）
        declare
             latest_price numeric;
        begin
             select price into latest_price from public.market_summary_data where pair = trade_record.trading_pair;
             if latest_price is null then
                -- 如果找不到价格，跳过此订单的结算
                continue;
             end if;

             if trade_record.type = 'buy' then -- 看涨
                if latest_price > trade_record.entry_price then
                    profit := trade_record.amount * trade_record.profit_rate;
                    update public.trades set outcome = 'win', profit = profit where id = trade_record.id;
                else
                    profit := -trade_record.amount;
                    update public.trades set outcome = 'loss', profit = profit where id = trade_record.id;
                end if;
            else -- 看跌
                 if latest_price < trade_record.entry_price then
                    profit := trade_record.amount * trade_record.profit_rate;
                    update public.trades set outcome = 'win', profit = profit where id = trade_record.id;
                else
                    profit := -trade_record.amount;
                    update public.trades set outcome = 'loss', profit = profit where id = trade_record.id;
                end if;
            end if;

            total_return := trade_record.amount + profit;

            -- 返还本金和利润
            perform public.adjust_balance(trade_record.user_id, trade_record.quote_asset, total_return, false, true);

            -- 更新交易状态
            update public.trades set status = 'settled', settlement_price = latest_price where id = trade_record.id;

        end;

    end loop;

    -- 结算理财产品
    for investment_record in
        select * from public.investments
        where status = 'active' and settlement_date <= now()
        for update
    loop
        if investment_record.product_type = 'daily' and investment_record.daily_rate is not null and investment_record.period is not null then
            profit := investment_record.amount * investment_record.daily_rate * investment_record.period;
        elsif investment_record.product_type = 'hourly' and investment_record.hourly_rate is not null and investment_record.duration_hours is not null then
            profit := investment_record.amount * investment_record.hourly_rate; -- The rate is for the entire duration
        else
            profit := 0;
        end if;

        total_return := investment_record.amount + profit;

        -- 返还本金和收益
        perform public.adjust_balance(investment_record.user_id, 'USDT', total_return);
        
        -- 如果有质押资产，解冻
        if investment_record.staking_asset is not null and investment_record.staking_amount is not null then
             perform public.adjust_balance(investment_record.user_id, investment_record.staking_asset, -investment_record.staking_amount, true);
        end if;

        -- 更新投资状态
        update public.investments set status = 'settled', profit = profit where id = investment_record.id;
    end loop;
end;
$$;


-- 自动分配三级返佣
create or replace function public.distribute_trade_commissions()
returns trigger
language plpgsql
as $$
declare
    source_user record;
    upline_user record;
    commission_amount numeric;
    commission_rate numeric;
    trade_amount numeric;
    level int := 1;
begin
    -- 仅为USDT交易对的合约和币币交易计算佣金
    if new.quote_asset = 'USDT' and (new.order_type = 'contract' or new.order_type = 'spot') then
        
        if new.order_type = 'contract' then
            trade_amount := new.amount;
        else -- spot
            trade_amount := new.total;
        end if;

        select * into source_user from public.profiles where id = new.user_id;
        
        -- 循环查找上三级
        while level <= 3 and source_user.inviter_id is not null loop
            select * into upline_user from public.profiles where id = source_user.inviter_id;
            
            if upline_user is null or upline_user.is_frozen then
                exit; -- 如果上级不存在或被冻结，则停止
            end if;

            -- 根据级别确定佣金率
            if level = 1 then
                commission_rate := 0.08;
            elsif level = 2 then
                commission_rate := 0.05;
            else -- level = 3
                commission_rate := 0.02;
            end if;

            commission_amount := trade_amount * commission_rate;

            -- 增加上级余额
            perform public.adjust_balance(upline_user.id, 'USDT', commission_amount);

            -- 记录佣金日志
            insert into public.reward_logs (user_id, type, amount, asset, source_id, source_username, source_level, description)
            values (upline_user.id, 'team', commission_amount, 'USDT', new.id::text, source_user.username, level, '交易佣金');

            -- 准备下一次循环
            source_user := upline_user;
            level := level + 1;
        end loop;
    end if;
    
    return new;
end;
$$;


-- 4. 触发器

-- 用户注册后自动创建资料
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
  
-- 交易成功后自动分配佣金
drop trigger if exists on_trade_inserted on public.trades;
create trigger on_trade_inserted
    after insert on public.trades
    for each row
    execute function public.distribute_trade_commissions();

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

-- 6. Cron Jobs
-- 每分钟运行一次结算函数
select cron.schedule('settle-due-records', '*/1 * * * *', 'select public.settle_due_records()');

-- 可以在这里添加其他定时任务, 例如:
-- select cron.schedule('fetch-market-data', '*/5 * * * *', 'select public.fetch_all_market_data()');
