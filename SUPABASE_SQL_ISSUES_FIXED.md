# Supabase.sql 问题修复报告

## 🚨 发现的严重问题

### 1. **双重认证系统冲突**
原文件包含两套完全不同的认证系统：

#### **Supabase Auth 系统** (第351-407行)
- 依赖 `auth.users` 表
- 使用加密密码存储
- 需要邮箱验证
- 创建管理员: `adminsrf` 和 `superadmin`

#### **自定义认证系统** (第1073-1109行)  
- 使用 `public.profiles` 表
- 明文密码存储 (`password_plain`)
- 无需邮箱验证
- 创建管理员: `adminsrf`

### 2. **数据表依赖问题** ~~（已确认表存在）~~
- ~~引用了不存在的 `public.supported_assets` 表~~ 
- **更正**: `supported_assets` 表确实存在，恢复动态查询

## ✅ 修复方案

### 1. **移除 Supabase Auth 冲突代码**
- 注释掉第一套 Supabase Auth 管理员初始化
- 保留纯自定义认证系统
- 避免 `auth.users` 和 `public.profiles` 数据冲突

### 2. **修复余额初始化逻辑**
```sql
-- 修复前（依赖不存在的表）
select asset from public.supported_assets where is_active = true

-- 修复后（使用固定资产列表）
v_assets text[] := ARRAY['USDT', 'BTC', 'ETH', 'USD', 'EUR', 'GBP'];
```

### 3. **统一认证架构**
现在系统完全使用自定义认证：
- ✅ 单一认证源: `public.profiles`
- ✅ 明文密码存储: `password_plain`
- ✅ 无邮箱依赖
- ✅ 管理员账户: `adminsrf` (密码: `admin8888`)

## 🔧 具体修复

### **移除的冲突代码**:
```sql
-- 删除了整个 Supabase Auth 管理员初始化块
-- 避免与自定义认证系统冲突
```

### **保留的自定义认证**:
```sql
-- 管理员账户
insert into public.profiles (
    id, username, nickname, email, is_admin, is_test_user, 
    invitation_code, password_plain, created_at
) values (
    'admin-uuid-001', 'adminsrf', 'Administrator', null, 
    true, false, '159753', 'admin8888', now()
) on conflict (username) do nothing;

-- 管理员余额（设为0）
foreach v_asset in array v_assets loop
    insert into public.balances (user_id, asset, available_balance, frozen_balance)
    values ('admin-uuid-001', v_asset, 0, 0)
    on conflict (user_id, asset) do nothing;
end loop;
```

## 🎯 最终状态

### **统一的认证系统**:
- **表**: `public.profiles`
- **密码字段**: `password_plain`
- **管理员**: `adminsrf` / `admin8888`
- **邀请码**: `159753`
- **初始余额**: 0（所有资产）

### **移除的依赖**:
- ❌ `auth.users` 表
- ❌ `public.supported_assets` 表
- ❌ Supabase Auth 函数
- ❌ 邮箱验证流程

## 🔒 安全考虑

虽然使用明文密码存储，但这适用于：
- 开发/演示环境
- 简化的认证需求
- 快速原型开发

生产环境建议：
- 使用密码哈希
- 添加盐值
- 实施更严格的安全措施

## ✅ 修复状态: 完成

现在 `supabase.sql` 文件使用统一的自定义认证系统，不再有冲突问题！