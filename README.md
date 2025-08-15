# Firebase Studio

This is a NextJS starter in Firebase Studio.

To get started, take a look at src/app/page.tsx.

## 认证逻辑

### 注册

应用的注册流程是通过调用 Supabase 的一个自定义远程过程调用 (RPC) 函数 `register_new_user` 来处理的。这是一个安全定义函数，拥有高级权限。

**注册参数:**
*   `p_email`: 新用户的电子邮件。系统会自动将用户名转换为 `username@noemail.app` 的格式。
*   `p_password`: 新用户的密码。
*   `p_username`: 新用户的唯一用户名。
*   `p_invitation_code`: 现有用户或特殊管理员的邀请码。

**注册流程:**
1.  函数首先检查用户名或邮件地址是否已存在。如果存在，则返回错误。
2.  接着检查 `p_invitation_code`：
    *   如果邀请码是 `admin8888`，新用户将被设置为管理员 (`is_admin = TRUE`)，并且没有邀请人。
    *   对于其他普通邀请码，系统会在 `users` 表中查找提供该邀请码的用户作为邀请人。如果找不到，则返回“无效邀请码”的错误。该新用户将被设为普通用户 (`is_admin = FALSE`)，并记录其邀请人 ID。
3.  系统使用 `auth.uid()` 和提供的凭证在 `auth.users` 表中创建一个新用户。
4.  同时，在 `public.users` 表中创建一份对应的用户资料，包含ID、用户名、邮件、是否为管理员以及邀请人ID等信息。
5.  操作成功后，函数返回一个包含成功状态和消息的 JSON 对象。

### 登录

用户的登录流程同样是基于邮件和密码的。当用户在前端输入用户名和密码时：
1.  系统会将用户名转换为对应的电子邮件地址，格式为 `username@noemail.app`。
2.  然后使用这个生成的电子邮件地址和用户输入的密码，调用 Supabase 的 `signInWithPassword` 方法来完成认证。
