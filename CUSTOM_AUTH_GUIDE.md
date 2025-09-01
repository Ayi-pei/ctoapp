# 🔐 自定义身份验证系统使用指南

## 📋 概述

我为您创建了一个完全自定义的身份验证系统，**不依赖邮箱**，只使用用户名和密码进行认证。

## 🚀 实施步骤

### 1. 数据库更新

首先在您的 Supabase 数据库中执行以下 SQL：

```sql
-- 运行 src/lib/simple-auth-schema.sql 中的内容
```

### 2. 更新应用布局

修改 `src/app/layout.tsx`，将原来的 `AuthProvider` 替换为新的 `SimpleAuthProvider`：

```tsx
// 替换这一行：
import { AuthProvider } from "@/context/auth-context";

// 为：
import { SimpleAuthProvider } from "@/context/simple-custom-auth";

// 然后在 JSX 中替换：
<AuthProvider>
  {/* ... */}
</AuthProvider>

// 为：
<SimpleAuthProvider>
  {/* ... */}
</SimpleAuthProvider>
```

### 3. 更新组件中的 Hook

在所有使用认证的组件中，替换 hook：

```tsx
// 替换：
import { useAuth } from '@/context/auth-context';
const { user, login, logout } = useAuth();

// 为：
import { useSimpleAuth } from '@/context/simple-custom-auth';
const { user, login, logout } = useSimpleAuth();
```

## 🎯 新功能特点

### ✅ 优势
- **无邮箱依赖**：只需用户名和密码
- **简单直接**：减少了邮箱验证的复杂性
- **快速注册**：用户可以立即使用
- **本地会话管理**：24小时自动过期
- **管理员支持**：保持原有的管理员登录机制

### 🔧 技术实现
- **明文密码存储**：为了简化演示（生产环境建议加密）
- **本地会话**：使用 localStorage 存储会话信息
- **数据库直接查询**：绕过 Supabase Auth，直接查询 profiles 表
- **自动余额创建**：注册时自动创建初始余额

## 📱 新页面

### 登录页面
- 访问：`/login-custom`
- 功能：用户名 + 密码登录
- 管理员：使用环境变量中的凭据

### 注册页面
- 访问：`/register-custom`
- 功能：用户名 + 密码 + 邀请码注册
- 验证：用户名唯一性检查，邀请码有效性验证

## 🔒 安全考虑

### 当前实现（演示级别）
```sql
-- 明文密码存储
password_plain TEXT
```

### 生产环境建议
```sql
-- 加密密码存储
password_hash TEXT
```

并在代码中使用 bcrypt 或类似库进行密码哈希。

## 🚦 使用流程

### 管理员登录
1. 访问 `/login-custom`
2. 使用环境变量中的管理员凭据
3. 系统自动创建管理员账户（如果不存在）

### 普通用户注册
1. 访问 `/register-custom`
2. 输入用户名、密码、邀请码 `159753`
3. 系统验证邀请码有效性
4. 创建用户并自动生成新的邀请码

### 普通用户登录
1. 访问 `/login-custom`
2. 输入用户名和密码
3. 系统验证凭据并创建会话

## 🔄 迁移现有用户

如果您有现有用户数据，需要为他们添加 `password_plain` 字段：

```sql
-- 为现有用户设置默认密码（请根据需要修改）
UPDATE public.profiles 
SET password_plain = 'defaultpass123' 
WHERE password_plain IS NULL;
```

## 🎛️ 配置选项

### 会话持续时间
```tsx
const SESSION_DURATION = 24 * 60 * 60 * 1000; // 24小时
```

### 支持的资产
```tsx
const supportedAssets = ['USDT', 'BTC', 'ETH', 'USD', 'EUR', 'GBP'];
```

## 🔧 故障排除

### 常见问题

1. **登录失败**
   - 检查用户名和密码是否正确
   - 确认用户未被冻结 (`is_frozen = false`)

2. **注册失败**
   - 验证邀请码是否有效
   - 检查用户名是否已存在

3. **会话丢失**
   - 检查 localStorage 是否被清除
   - 确认会话未过期

### 调试模式
在浏览器控制台中查看详细错误信息。

## 📞 支持

如果您需要进一步的自定义或有任何问题，请告诉我！我可以帮您：

- 添加密码加密
- 实现密码重置功能
- 添加更多安全特性
- 优化用户体验

## 🎉 完成！

现在您有了一个完全自定义的、不依赖邮箱的身份验证系统！