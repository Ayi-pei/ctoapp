const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// 从环境变量获取Supabase配置
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
    console.error('Missing Supabase environment variables');
    process.exit(1);
}

// 创建Supabase客户端（使用服务角色密钥）
const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

async function fixDatabase() {
    try {
        console.log('开始修复数据库...');

        // 1. 创建wallets表（为了兼容现有的函数）
        console.log('1. 创建wallets表...');
        const { error: walletsTableError } = await supabase.rpc('exec_sql', {
            sql: `
        CREATE TABLE IF NOT EXISTS public.wallets (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
            balance NUMERIC(30, 8) DEFAULT 0,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        );
        
        CREATE INDEX IF NOT EXISTS idx_wallets_user_id ON public.wallets(user_id);
        
        ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;
        
        CREATE POLICY "Admin full access" ON public.wallets 
            FOR ALL USING (
                (SELECT is_admin FROM public.users WHERE id = auth.uid())
            );
            
        CREATE POLICY "Users can view and manage their own wallets" ON public.wallets 
            FOR ALL USING (auth.uid() = user_id);
            
        COMMENT ON TABLE public.wallets IS 'User wallets for compatibility with existing functions';
      `
        });

        if (walletsTableError) {
            console.error('创建wallets表失败:', walletsTableError);
        } else {
            console.log('✅ wallets表创建成功');
        }

        // 2. 创建credit_user_balance函数
        console.log('2. 创建credit_user_balance函数...');
        const { error: creditFunctionError } = await supabase.rpc('exec_sql', {
            sql: `
        CREATE OR REPLACE FUNCTION public.credit_user_balance(
            p_user_id UUID,
            p_asset TEXT,
            p_amount NUMERIC(30, 8),
            p_reason TEXT
        )
        RETURNS VOID
        LANGUAGE plpgsql
        SECURITY DEFINER
        AS $$
        BEGIN
            -- Insert or update the user's balance
            INSERT INTO public.balances (user_id, asset, available_balance)
            VALUES (p_user_id, p_asset, p_amount)
            ON CONFLICT (user_id, asset)
            DO UPDATE SET 
                available_balance = balances.available_balance + p_amount,
                updated_at = NOW();
            
            -- Log the transaction
            INSERT INTO public.transactions (
                user_id, 
                type, 
                asset, 
                amount, 
                status, 
                created_at
            ) VALUES (
                p_user_id, 
                'adjustment', 
                p_asset, 
                p_amount, 
                'completed', 
                NOW()
            );
            
            -- Also update wallets table for compatibility
            INSERT INTO public.wallets (user_id, balance)
            VALUES (p_user_id, p_amount)
            ON CONFLICT (user_id)
            DO UPDATE SET 
                balance = wallets.balance + p_amount,
                updated_at = NOW();
        END;
        $$;
        
        GRANT EXECUTE ON FUNCTION public.credit_user_balance(UUID, TEXT, NUMERIC, TEXT) TO authenticated;
      `
        });

        if (creditFunctionError) {
            console.error('创建credit_user_balance函数失败:', creditFunctionError);
        } else {
            console.log('✅ credit_user_balance函数创建成功');
        }

        // 3. 验证函数是否存在
        console.log('3. 验证函数和表是否存在...');
        const { data: functions, error: functionsError } = await supabase
            .from('pg_proc')
            .select('proname')
            .eq('proname', 'credit_user_balance');

        if (functionsError) {
            console.error('查询函数失败:', functionsError);
        } else if (functions && functions.length > 0) {
            console.log('✅ credit_user_balance函数存在');
        } else {
            console.log('❌ credit_user_balance函数不存在');
        }

        const { data: tables, error: tablesError } = await supabase
            .from('pg_tables')
            .select('tablename')
            .eq('tablename', 'wallets')
            .eq('schemaname', 'public');

        if (tablesError) {
            console.error('查询表失败:', tablesError);
        } else if (tables && tables.length > 0) {
            console.log('✅ wallets表存在');
        } else {
            console.log('❌ wallets表不存在');
        }

        console.log('数据库修复完成');
    } catch (error) {
        console.error('修复数据库时发生错误:', error);
    }
}

// 执行修复
fixDatabase();