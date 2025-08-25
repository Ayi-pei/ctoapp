-- This is the complete SQL script to initialize the TradeFlow database from scratch.
-- It is designed to be idempotent and can be run safely multiple times.

-- 1. Enable UUID extension for unique identifiers
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";

-- 2. Create the 'profiles' table to store user information
-- This table is linked to Supabase's built-in 'auth.users' table.
CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" NOT NULL,
    "username" "text" NOT NULL,
    "nickname" "text",
    "email" "text",
    "inviter_id" "uuid",
    "is_admin" boolean DEFAULT false NOT NULL,
    "is_test_user" boolean DEFAULT true NOT NULL,
    "is_frozen" boolean DEFAULT false NOT NULL,
    "invitation_code" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "credit_score" integer DEFAULT 100 NOT NULL,
    "last_login_at" timestamp with time zone,
    "avatar_url" "text",
    CONSTRAINT "profiles_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "profiles_username_key" UNIQUE ("username"),
    CONSTRAINT "profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE,
    CONSTRAINT "profiles_inviter_id_fkey" FOREIGN KEY ("inviter_id") REFERENCES "public"."profiles"("id") ON DELETE SET NULL
) TABLESPACE "pg_default";

-- 3. Create the 'balances' table for user assets
CREATE TABLE IF NOT EXISTS "public"."balances" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "asset" "text" NOT NULL,
    "available_balance" numeric DEFAULT 0 NOT NULL,
    "frozen_balance" numeric DEFAULT 0 NOT NULL,
    CONSTRAINT "balances_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "balances_user_id_asset_key" UNIQUE ("user_id", "asset"),
    CONSTRAINT "balances_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE
) TABLESPACE "pg_default";

-- 4. Create the 'trades' table for all trading activities
CREATE TABLE IF NOT EXISTS "public"."trades" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "trading_pair" "text" NOT NULL,
    "type" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "amount" numeric NOT NULL,
    "entry_price" numeric,
    "settlement_time" timestamp with time zone,
    "period" integer,
    "profit_rate" numeric,
    "status" "text" NOT NULL,
    "settlement_price" numeric,
    "outcome" "text",
    "profit" numeric,
    "orderType" "text" NOT NULL,
    "base_asset" "text",
    "quote_asset" "text",
    "price" numeric,
    "total" numeric,
    CONSTRAINT "trades_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "trades_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE
) TABLESPACE "pg_default";

-- 5. Create the 'investments' table for financial products
CREATE TABLE IF NOT EXISTS "public"."investments" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "product_name" "text" NOT NULL,
    "amount" numeric NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "settlement_date" timestamp with time zone NOT NULL,
    "status" "text" NOT NULL,
    "profit" numeric,
    "productType" "text",
    "daily_rate" numeric,
    "period" integer,
    "duration_hours" integer,
    "hourly_rate" numeric,
    "category" "text",
    "stakingAsset" "text",
    "stakingAmount" numeric,
    CONSTRAINT "investments_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "investments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE
) TABLESPACE "pg_default";

-- 6. Create the 'requests' table for deposits, withdrawals, etc.
CREATE TABLE IF NOT EXISTS "public"."requests" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "type" "text" NOT NULL,
    "asset" "text",
    "amount" numeric,
    "status" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "address" "text",
    "transaction_hash" "text",
    "new_password" "text",
    CONSTRAINT "requests_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "requests_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE
) TABLESPACE "pg_default";

-- 7. Create the 'reward_logs' table for commissions and other rewards
CREATE TABLE IF NOT EXISTS "public"."reward_logs" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "type" "text" NOT NULL,
    "amount" numeric NOT NULL,
    "asset" "text",
    "source_id" "text",
    "source_username" "text",
    "source_level" integer,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "description" "text",
    CONSTRAINT "reward_logs_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "reward_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE
) TABLESPACE "pg_default";

-- 8. Create the 'system_settings' table for global configurations
CREATE TABLE IF NOT EXISTS "public"."system_settings" (
    "id" integer NOT NULL,
    "settings" "jsonb",
    CONSTRAINT "system_settings_pkey" PRIMARY KEY ("id")
) TABLESPACE "pg_default";

-- 9. Create the 'daily_tasks' table for admin-defined daily tasks
CREATE TABLE IF NOT EXISTS "public"."daily_tasks" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "title" "text" NOT NULL,
    "description" "text",
    "reward" numeric NOT NULL,
    "reward_type" "text" NOT NULL,
    "link" "text",
    "status" "text" NOT NULL,
    "trigger" "text" NOT NULL,
    "imgSrc" "text",
    CONSTRAINT "daily_tasks_pkey" PRIMARY KEY ("id")
) TABLESPACE "pg_default";

-- 10. Create the 'user_task_states' table to track user task completion
CREATE TABLE IF NOT EXISTS "public"."user_task_states" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "taskId" "uuid" NOT NULL,
    "date" "date" NOT NULL,
    "completed" boolean DEFAULT false NOT NULL,
    CONSTRAINT "user_task_states_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "user_task_states_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE,
    CONSTRAINT "user_task_states_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "public"."daily_tasks"("id") ON DELETE CASCADE
) TABLESPACE "pg_default";

-- 11. Create the 'announcements' table for various types of announcements
CREATE TABLE IF NOT EXISTS "public"."announcements" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "type" "text" NOT NULL, -- e.g., 'personal_message', 'carousel', 'horn'
    "title" "text",
    "content" "jsonb",
    "user_id" "uuid",
    "is_read" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "theme" "text",
    "priority" integer,
    "expires_at" timestamp with time zone,
    CONSTRAINT "announcements_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "announcements_type_key" UNIQUE ("type"),
    CONSTRAINT "announcements_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE
) TABLESPACE "pg_default";

-- 12. Create 'activities' table for limited-time events
CREATE TABLE IF NOT EXISTS "public"."activities" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "title" "text" NOT NULL,
    "description" "text",
    "rewardRule" "text",
    "howToClaim" "text",
    "expiresAt" timestamp with time zone NOT NULL,
    "imgSrc" "text",
    "status" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT "activities_pkey" PRIMARY KEY ("id")
) TABLESPACE "pg_default";

-- 13. Create 'action_logs' for admin auditing
CREATE TABLE IF NOT EXISTS "public"."action_logs" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "entity_type" "text",
    "entity_id" "text",
    "action" "text",
    "operator_id" "uuid",
    "operator_username" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "details" "text",
    CONSTRAINT "action_logs_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "action_logs_operator_id_fkey" FOREIGN KEY ("operator_id") REFERENCES "public"."profiles"("id") ON DELETE SET NULL
) TABLESPACE "pg_default";

-- 14. Create 'swap_orders' table for P2P trading
CREATE TABLE IF NOT EXISTS "public"."swap_orders" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "userId" "uuid" NOT NULL,
    "username" "text" NOT NULL,
    "fromAsset" "text" NOT NULL,
    "fromAmount" numeric NOT NULL,
    "toAsset" "text" NOT NULL,
    "toAmount" numeric NOT NULL,
    "status" "text" NOT NULL,
    "createdAt" timestamp with time zone DEFAULT "now"() NOT NULL,
    "takerId" "uuid",
    "takerUsername" "text",
    "paymentProofUrl" "text",
    CONSTRAINT "swap_orders_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "swap_orders_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."profiles"("id") ON DELETE CASCADE,
    CONSTRAINT "swap_orders_takerId_fkey" FOREIGN KEY ("takerId") REFERENCES "public"."profiles"("id") ON DELETE SET NULL
) TABLESPACE "pg_default";

-- 15. Create 'investment_products' table for financial product definitions
CREATE TABLE IF NOT EXISTS "public"."investment_products" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "name" "text" NOT NULL,
    "price" numeric NOT NULL,
    "dailyRate" numeric,
    "period" integer,
    "maxPurchase" integer,
    "imgSrc" "text",
    "category" "text",
    "productType" "text",
    "activeStartTime" "text",
    "activeEndTime" "text",
    "hourlyTiers" "jsonb",
    "stakingAsset" "text",
    "stakingAmount" numeric,
    CONSTRAINT "investment_products_pkey" PRIMARY KEY ("id")
) TABLESPACE "pg_default";

-- 16. Create tables for market data
CREATE TABLE IF NOT EXISTS "public"."market_kline_data" (
    "trading_pair" "text" NOT NULL,
    "time" timestamp with time zone NOT NULL,
    "open" numeric,
    "high" numeric,
    "low" numeric,
    "close" numeric,
    CONSTRAINT "market_kline_data_pkey" PRIMARY KEY ("trading_pair", "time")
) TABLESPACE "pg_default";

CREATE TABLE IF NOT EXISTS "public"."market_summary_data" (
    "pair" "text" NOT NULL,
    "price" numeric,
    "change" numeric,
    "volume" numeric,
    "high" numeric,
    "low" numeric,
    "icon" "text",
    CONSTRAINT "market_summary_data_pkey" PRIMARY KEY ("pair")
) TABLESPACE "pg_default";


-- Reset and re-create all row-level security policies to ensure consistency.
-- This approach is safer than checking for existence on each policy.
DROP POLICY IF EXISTS "Enable read access for all users" ON "public"."profiles";
DROP POLICY IF EXISTS "Enable read access for all users" ON "public"."balances";
DROP POLICY IF EXISTS "Enable read access for all users" ON "public"."trades";
DROP POLICY IF EXISTS "Enable read access for all users" ON "public"."investments";
DROP POLICY IF EXISTS "Enable read access for all users" ON "public"."requests";
DROP POLICY IF EXISTS "Enable read access for all users" ON "public"."reward_logs";
DROP POLICY IF EXISTS "Enable read access for all users" ON "public"."system_settings";
DROP POLICY IF EXISTS "Enable read access for all users" ON "public"."daily_tasks";
DROP POLICY IF EXISTS "Enable read access for all users" ON "public"."user_task_states";
DROP POLICY IF EXISTS "Enable read access for all users" ON "public"."announcements";
DROP POLICY IF EXISTS "Enable read access for all users" ON "public"."activities";
DROP POLICY IF EXISTS "Enable read access for all users" ON "public"."action_logs";
DROP POLICY IF EXISTS "Enable read access for all users" ON "public"."swap_orders";
DROP POLICY IF EXISTS "Enable read access for all users" ON "public"."investment_products";
DROP POLICY IF EXISTS "Enable read access for all users" ON "public"."market_kline_data";
DROP POLICY IF EXISTS "Enable read access for all users" ON "public"."market_summary_data";

ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."balances" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."trades" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."investments" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."requests" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."reward_logs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."system_settings" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."daily_tasks" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."user_task_states" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."announcements" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."activities" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."action_logs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."swap_orders" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."investment_products" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."market_kline_data" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."market_summary_data" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read access for all users" ON "public"."profiles" FOR SELECT USING (true);
CREATE POLICY "Enable read access for all users" ON "public"."balances" FOR SELECT USING (true);
CREATE POLICY "Enable read access for all users" ON "public"."trades" FOR SELECT USING (true);
CREATE POLICY "Enable read access for all users" ON "public"."investments" FOR SELECT USING (true);
CREATE POLICY "Enable read access for all users" ON "public"."requests" FOR SELECT USING (true);
CREATE POLICY "Enable read access for all users" ON "public"."reward_logs" FOR SELECT USING (true);
CREATE POLICY "Enable read access for all users" ON "public"."system_settings" FOR SELECT USING (true);
CREATE POLICY "Enable read access for all users" ON "public"."daily_tasks" FOR SELECT USING (true);
CREATE POLICY "Enable read access for all users" ON "public"."user_task_states" FOR SELECT USING (true);
CREATE POLICY "Enable read access for all users" ON "public"."announcements" FOR SELECT USING (true);
CREATE POLICY "Enable read access for all users" ON "public"."activities" FOR SELECT USING (true);
CREATE POLICY "Enable read access for all users" ON "public"."action_logs" FOR SELECT USING (true);
CREATE POLICY "Enable read access for all users" ON "public"."swap_orders" FOR SELECT USING (true);
CREATE POLICY "Enable read access for all users" ON "public"."investment_products" FOR SELECT USING (true);
CREATE POLICY "Enable read access for all users" ON "public"."market_kline_data" FOR SELECT USING (true);
CREATE POLICY "Enable read access for all users" ON "public"."market_summary_data" FOR SELECT USING (true);

-- Function to get a user's entire downline
CREATE OR REPLACE FUNCTION get_downline(p_user_id uuid)
RETURNS TABLE(id uuid, username text, nickname text, email text, inviter_id uuid, is_admin boolean, is_test_user boolean, is_frozen boolean, invitation_code text, created_at timestamp with time zone, credit_score integer, last_login_at timestamp with time zone, avatar_url text, level integer) AS $$
BEGIN
    RETURN QUERY
    WITH RECURSIVE downline_cte AS (
        SELECT p.id, p.username, p.nickname, p.email, p.inviter_id, p.is_admin, p.is_test_user, p.is_frozen, p.invitation_code, p.created_at, p.credit_score, p.last_login_at, p.avatar_url, 1 AS level
        FROM profiles p
        WHERE p.inviter_id = p_user_id
        UNION ALL
        SELECT p.id, p.username, p.nickname, p.email, p.inviter_id, p.is_admin, p.is_test_user, p.is_frozen, p.invitation_code, p.created_at, p.credit_score, p.last_login_at, p.avatar_url, d.level + 1
        FROM profiles p
        JOIN downline_cte d ON p.inviter_id = d.id
    )
    SELECT * FROM downline_cte;
END;
$$ LANGUAGE plpgsql;

-- Function to safely adjust user balances
CREATE OR REPLACE FUNCTION adjust_balance(p_user_id uuid, p_asset text, p_amount numeric, p_is_frozen boolean DEFAULT false)
RETURNS void AS $$
BEGIN
    INSERT INTO balances (user_id, asset, available_balance, frozen_balance)
    VALUES (p_user_id, p_asset, 0, 0)
    ON CONFLICT (user_id, asset) DO NOTHING;

    IF p_is_frozen THEN
        UPDATE balances
        SET frozen_balance = frozen_balance + p_amount
        WHERE user_id = p_user_id AND asset = p_asset;
    ELSE
        UPDATE balances
        SET available_balance = available_balance + p_amount
        WHERE user_id = p_user_id AND asset = p_asset;
    END IF;
END;
$$ LANGUAGE plpgsql;


-- Function to get total platform balance (sum of all users' USDT available balances)
CREATE OR REPLACE FUNCTION get_total_platform_balance()
RETURNS numeric AS $$
DECLARE
    total_balance numeric;
BEGIN
    SELECT COALESCE(SUM(available_balance), 0)
    INTO total_balance
    FROM balances
    WHERE asset = 'USDT';
    RETURN total_balance;
END;
$$ LANGUAGE plpgsql;
