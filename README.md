# Firebase Studio

This is a NextJS starter in Firebase Studio.

To get started, take a look at src/app/page.tsx.

## 认证逻辑

应用的认证流程基于 Supabase 的安全机制，将用户认证信息和公开资料分离存储。

### 注册流程 (Registration Flow)

当一个新用户注册时，系统会执行以下步骤：

1.  **前端处理**:
    *   用户在注册页面输入**用户名**、**密码**和**邀请码**。
    *   前端代码会将用户名自动转换为 `username@noemail.app` 格式的电子邮件地址。

2.  **调用 Supabase Auth**:
    *   前端调用 `supabase.auth.signUp()` 函数，将处理后的电子邮件地址和原始密码安全地发送给 Supabase。

3.  **数据库操作**:
    *   **`auth.users` (安全认证表)**: Supabase 在其内部的安全表中创建一个新的认证用户。用户的密码经过**哈希加密**后存储在此表中，原始密码绝不会被记录。
    *   **`public.users` (公开资料表)**: 一个数据库触发器监听到新用户创建事件后，会自动在新用户中创建一个对应的公开资料记录，包含用户ID、用户名、邀请信息等，但不包含任何密码数据。

### 登录流程 (Login Flow)

当用户登录时，验证过程如下：

1.  **前端处理**:
    *   用户输入**用户名**和**密码**。
    *   前端代码同样将用户名转换为 `username@noemail.app` 格式的电子邮件地址。

2.  **调用 Supabase Auth**:
    *   前端调用 `supabase.auth.signInWithPassword()` 函数，将电子邮件地址和用户输入的原始密码发送给 Supabase。

3.  **Supabase 安全验证**:
    *   Supabase 在 `auth.users` 安全表中找到对应的用户。
    *   它将用户输入的密码进行**相同的哈希加密**，然后与数据库中存储的哈希值进行**比对**。
    *   **密码正确**: 如果两个哈希值完全匹配，验证成功，Supabase 返回一个有效的会话（Session），用户成功登录。
    *   **密码错误**: 如果哈希值不匹配，验证失败，Supabase 返回错误，前端提示用户“用户名或密码错误”。

### 数据库函数 `register_new_user` (已废弃)

*此前的文档中提到了一个名为 `register_new_user` 的远程过程调用 (RPC) 函数。此函数已被弃用，并由标准的 `supabase.auth.signUp` 流程取代，以确保认证用户和用户资料能够被正确地同时创建。*
