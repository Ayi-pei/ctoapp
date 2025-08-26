# 🔧 整合后的数据库设置指南

## 📋 概述

我已经将自定义认证的所有SQL代码整合到根目录的 `supabase.sql` 文件中，现在支持**双重认证模式**：

1. **Supabase Auth** (原版邮箱认证)
2. **Custom Auth** (自定义用户名密码认证)

## 🚀 一键部署

只需在 Supabase SQL 编辑器中运行根目录的 `supabase.sql` 文件即可完成所有设置。

## 🎯 整合的功能

### ✅ 数据库表更新
- `profiles` 表新增 `password_plain` 字段
- 保持与原有 Supabase Auth 的兼容性
- 添加了自定义认证所需的索引

### ✅ 双重触发器系统
```sql
-- Supabase Auth 触发器 (原有)
on_auth_user_created -> handle_new_user()

-- 自定义认证触发器 (新增)
on_custom_user_created -> handle_new_user_custom()
```

### ✅ 自动管理员创建
- 用户名: `adminsrf`
- 密码: `admin8888`
- 邀请码: `159753`
- 自动分配 1,000,000 各种资产余额

### ✅ 登录验证函数
```sql
-- 新增的登录验证函数
public.verify_login(username, password)
```

### ✅ 兼容的安全策略
- 保持原有的 RLS 策略
- 添加自定义认证兼容策略

## 🔄 使用方式

### 方式一：Supabase Auth (原版)
- 访问 `/login` 和 `/register`
- 使用邮箱格式认证
- 依赖 Supabase Auth 系统

### 方式二：Custom Auth (新版)
- 访问 `/login-custom` 和 `/register-custom`
- 纯用户名密码认证
- 不依赖邮箱

## 📱 应用层配置

### 1. 更新 layout.tsx
```tsx
// 选择使用哪种认证系统

// 选项A: 使用原版 Supabase Auth
import { AuthProvider } from "@/context/auth-context";
<AuthProvider>{children}</AuthProvider>

// 选项B: 使用自定义认证
import { SimpleAuthProvider } from "@/context/simple-custom-auth";
<SimpleAuthProvider>{children}</SimpleAuthProvider>
```

### 2. 更新组件中的 Hook
```tsx
// 对应选择的认证系统

// 选项A: 原版
import { useAuth } from '@/context/auth-context';

// 选项B: 自定义
import { useSimpleAuth } from '@/context/simple-custom-auth';
```

## 🎛️ 环境变量
确保 `.env.local` 包含：
```env
NEXT_PUBLIC_ADMIN_NAME=adminsrf
NEXT_PUBLIC_ADMIN_KEY=admin8888
NEXT_PUBLIC_ADMIN_AUTH=159753
```

## 🔒 安全特性

### 数据完整性
- 两种认证系统共享相同的用户数据
- 统一的权限控制和余额管理
- 兼容的 RLS 策略

### 管理员权限
- 管理员可以通过任一系统登录
- 统一的管理员权限验证
- 自动初始化管理员资产

## 🧪 测试流程

### 1. 数据库部署
```sql
-- 在 Supabase SQL 编辑器中运行
-- 根目录的 supabase.sql 文件
```

### 2. 管理员登录测试
```
方式A: /login
用户名: adminsrf
密码: admin8888

方式B: /login-custom  
用户名: adminsrf
密码: admin8888
```

### 3. 普通用户注册测试
```
方式A: /register
用户名: testuser
密码: password123
邀请码: 159753

方式B: /register-custom
用户名: testuser2
密码: password123
邀请码: 159753
```

## 🎉 优势

- ✅ **向后兼容**: 原有功能完全保留
- ✅ **灵活选择**: 可以选择任一认证方式
- ✅ **统一数据**: 两种方式共享用户数据
- ✅ **简化部署**: 一个SQL文件完成所有设置
- ✅ **无缝切换**: 可以随时在两种方式间切换

现在您可以根据需要选择使用哪种认证方式，或者同时支持两种方式！