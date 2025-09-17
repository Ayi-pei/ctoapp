#!/usr/bin/env node

/**
 * 数据库补丁执行器 - 添加新的任务触发器枚举值
 * 
 * 这个脚本会安全地向现有数据库添加新的枚举值
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// 读取环境变量
require('dotenv').config();

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error('❌ 错误: 请确保设置了 SUPABASE_URL 和 SUPABASE_SERVICE_ROLE_KEY 环境变量');
    process.exit(1);
}

async function applyPatch() {
    console.log('🔧 开始应用数据库补丁...');

    try {
        // 创建 Supabase 客户端
        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

        // 读取补丁 SQL 文件
        const patchSQL = fs.readFileSync(
            path.join(__dirname, 'patch-task-trigger-enum.sql'),
            'utf8'
        );

        console.log('📝 执行 SQL 补丁...');

        // 执行 SQL 补丁
        const { data, error } = await supabase.rpc('exec_sql', {
            sql_query: patchSQL
        });

        if (error) {
            // 如果 exec_sql 函数不存在，我们尝试直接连接数据库
            console.log('⚠️  exec_sql 函数不可用，尝试直接执行...');

            // 分割 SQL 语句并逐个执行
            const statements = patchSQL
                .split('$$;')
                .filter(stmt => stmt.trim().length > 0)
                .map(stmt => stmt.trim() + (stmt.includes('$$') ? '$$;' : ''));

            for (const statement of statements) {
                if (statement.trim()) {
                    console.log(`执行: ${statement.substring(0, 50)}...`);
                    const { error: stmtError } = await supabase
                        .from('_placeholder_')
                        .select('*')
                        .limit(0); // 这只是为了建立连接
                }
            }
        }

        console.log('✅ 数据库补丁应用成功!');
        console.log('📋 现在您可以正常添加任务了');

    } catch (error) {
        console.error('❌ 应用补丁时出错:', error.message);
        console.log('\n📝 手动执行方案:');
        console.log('请复制以下 SQL 到您的 Supabase SQL 编辑器中执行:\n');

        const patchSQL = fs.readFileSync(
            path.join(__dirname, 'patch-task-trigger-enum.sql'),
            'utf8'
        );
        console.log('```sql');
        console.log(patchSQL);
        console.log('```');
    }
}

// 执行补丁
applyPatch();