# 🔑 管理员账户设置

## 管理员信息
- **用户名**: `adminsrf`
- **密码**: `admin8888`
- **邀请码**: `159753`

## 环境变量配置

确保您的 `.env.local` 文件包含以下配置：

```env
NEXT_PUBLIC_ADMIN_NAME=adminsrf
NEXT_PUBLIC_ADMIN_KEY=admin8888
NEXT_PUBLIC_ADMIN_AUTH=159753
```

## 数据库初始化

执行 `src/lib/simple-auth-schema.sql` 后，管理员账户将自动创建。

## 登录方式

### 方式一：自定义登录页面
1. 访问 `/login-custom`
2. 输入用户名：`adminsrf`
3. 输入密码：`admin8888`

### 方式二：原版登录页面
1. 访问 `/login`
2. 输入用户名：`adminsrf`
3. 输入密码：`admin8888`

## 创建第一个普通用户

使用管理员邀请码 `159753` 来注册第一个普通用户：

1. 访问 `/register-custom`
2. 输入用户名：例如 `user001`
3. 输入密码：例如 `password123`
4. 输入邀请码：`159753`

## 邀请码传播

- 管理员邀请码：`159753`
- 每个新用户注册后会自动生成自己的邀请码
- 用户可以使用自己的邀请码邀请其他人

## 测试流程

1. **管理员登录测试**
   ```
   用户名: adminsrf
   密码: admin8888
   预期: 跳转到 /admin 页面
   ```

2. **普通用户注册测试**
   ```
   用户名: testuser
   密码: test123456
   邀请码: 159753
   预期: 注册成功，跳转到登录页面
   ```

3. **普通用户登录测试**
   ```
   用户名: testuser
   密码: test123456
   预期: 跳转到 /dashboard 页面
   ```

## 权限验证

- 管理员可以访问 `/admin/*` 所有页面
- 普通用户只能访问 `/dashboard`, `/profile/*`, `/market` 等用户页面
- 系统会自动根据 `is_admin` 字段进行权限控制