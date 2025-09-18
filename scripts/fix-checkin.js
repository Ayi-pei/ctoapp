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

// credit_user_balance 函数的SQL定义
const creditUserBalanceFunctionSQL = `
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
    -- 插入或更新用户的余额
    INSERT INTO public.balances (user_id, asset, available_balance)
    VALUES (p_user_id, p_asset, p_amount)
    ON CONFLICT (user_id, asset)
    DO UPDATE SET 
        available_balance = balances.available_balance + p_amount,
        updated_at = NOW();
    
    -- 记录交易日志
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
END;
$$;
`;

// 授予执行权限的SQL
const grantExecuteSQL = `
GRANT EXECUTE ON FUNCTION public.credit_user_balance(UUID, TEXT, NUMERIC, TEXT) TO authenticated;
`;

async function createCreditUserBalanceFunction() {
    try {
        console.log('Creating credit_user_balance function...');

        // 执行创建函数的SQL
        const { error: createError } = await supabase.rpc('exec_sql', {
            sql: creditUserBalanceFunctionSQL
        });

        if (createError) {
            console.error('Error creating function:', createError);
            return;
        }

        console.log('Function created successfully');

        // 授予执行权限
        console.log('Granting execute permissions...');
        const { error: grantError } = await supabase.rpc('exec_sql', {
            sql: grantExecuteSQL
        });

        if (grantError) {
            console.error('Error granting permissions:', grantError);
            return;
        }

        console.log('Permissions granted successfully');
        console.log('credit_user_balance function has been created and is ready to use');
    } catch (error) {
        console.error('Unexpected error:', error);
    }
}

// 执行函数
createCreditUserBalanceFunction();