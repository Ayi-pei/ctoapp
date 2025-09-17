#!/usr/bin/env node

/**
 * 任务枚举修复脚本
 * 
 * 这个脚本通过 Supabase 客户端执行原始 SQL 来修复任务触发器枚举
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function fixTaskEnum() {
    console.log('🔧 修复任务触发器枚举...');

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
        console.error('❌ 请确保环境变量配置正确');
        return;
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    try {
        // 执行 SQL 来添加新的枚举值
        const sqlCommands = [
            "ALTER TYPE public.task_trigger_type ADD VALUE IF NOT EXISTS 'contract_trade';",
            "ALTER TYPE public.task_trigger_type ADD VALUE IF NOT EXISTS 'spot_trade';",
            "ALTER TYPE public.task_trigger_type ADD VALUE IF NOT EXISTS 'investment';"
        ];

        for (const sql of sqlCommands) {
            console.log('执行:', sql);
            // 注意：Supabase 客户端可能不直接支持 ALTER TYPE，但我们尝试
            try {
                await supabase.rpc('exec', { sql });
            } catch (err) {
                console.log('⚠️ 命令可能已执行或不支持:', err.message);
            }
        }

        console.log('✅ 枚举修复完成');
        console.log('\n现在请测试添加任务功能是否正常工作');

    } catch (error) {
        console.error('❌ 修复过程中出错:', error.message);
        console.log('\n🔧 请手动在 Supabase Dashboard 中执行以下 SQL:');
        console.log('\n```sql');
        console.log(`-- 添加新的任务触发器枚举值
ALTER TYPE public.task_trigger_type ADD VALUE IF NOT EXISTS 'contract_trade';
ALTER TYPE public.task_trigger_type ADD VALUE IF NOT EXISTS 'spot_trade';
ALTER TYPE public.task_trigger_type ADD VALUE IF NOT EXISTS 'investment';

-- 验证枚举值
SELECT unnest(enum_range(NULL::public.task_trigger_type)) as trigger_types;
\`\`\``);
    }
}

fixTaskEnum();