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
    *   **管理员判断**：如果邀请码是 `admin8888`，则会附加一个 `is_admin: true` 的标记。

2.  **调用 Supabase Auth**:
    *   前端调用 `supabase.auth.signUp()` 函数，将处理后的电子邮件地址、原始密码以及包含用户名和 `is_admin` 标记的元数据（`options.data`）安全地发送给 Supabase。

3.  **数据库操作**:
    *   **`auth.users` (安全认证表)**: Supabase 在其内部的安全表中创建一个新的认证用户。用户的密码经过**哈希加密**后存储在此表中，原始密码绝不会被记录。
    *   **`public.users` (公开资料表)**: 一个数据库触发器监听到新用户创建事件后，会读取 `signUp` 时传递的元数据，然后在新用户中创建一个对应的公开资料记录，包含用户ID、用户名、是否为管理员 (`is_admin`)、邀请信息等。

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

1. 核心业务功能：

用户管理与认证：
集成了 Supabase 的 auth.users 表进行用户认证。
public.users 表存储了用户的公开资料，包括 username、email、is_admin（管理员标识）、is_frozen（账户冻结状态）、invitation_code（邀请码）和 inviter_id（邀请人）。
注册流程严谨，通过 register_new_user 函数处理，需要邀请码，并会检查邮箱和用户名是否唯一。
check_account_active 函数用于在某些操作前检查用户账户是否被冻结。
交易与投资：
财务交易 (transactions): 记录用户的充值、提现及管理员调整，包含交易类型、资产、金额、状态（pending, approved, rejected）、地址和哈希等信息。
合约交易 (contract_trades): 明确支持“合约”或“二元期权”交易，记录了交易对、买卖方向、金额、入场价、结算时间、周期、利润率、结算状态、结算价格、盈亏结果和利润。
现货交易 (spot_trades): 记录现货市场的买卖交易，包含交易对、基础资产、报价资产、数量、总计和状态。
投资产品 (investments): 记录用户对各种金融产品的投资，包含产品名称和金额。
多级佣金/推荐系统：
每个用户都有一个唯一的 invitation_code。
用户注册时需要提供 inviter_id，从而形成上下线关系。
distribute_commissions 函数是核心，用于根据下线用户的交易量，向上线用户（最多三级）分配佣金，佣金比率分别为 8%、5%、2%。
commission_logs 表详细记录了每一笔佣金的发放情况。
佣金分配过程中会检查上线账户的冻结状态，如果上线账户被冻结，则停止该分支的佣金分发。
管理与请求：
admin_requests 表用于处理管理员相关的请求，目前主要提及了密码重置请求。
提供了 admin_get_all_users 和 admin_get_user_team 等管理员专用的函数，用于获取所有用户和查看任意用户的下线团队。
提现地址管理：
withdrawal_addresses 表允许用户保存常用的提现地址，包含名称、地址和网络类型。
2. 数据库结构与技术栈：

PostgreSQL 数据库： 脚本是为 PostgreSQL 数据库设计的。
Supabase 后端： 深度集成了 Supabase，利用其认证服务 (auth.users) 和 RLS (Row Level Security) 功能。
UUID 主键： 大多数表使用 UUID 作为主键，并通过 extensions.uuid_generate_v4() 自动生成。
密码加密： 使用 pgcrypto 扩展的 crypt() 函数对用户密码进行哈希加密，增强安全性。
时间戳： 大量使用 TIMESTAMPTZ 类型存储创建时间，并默认为 NOW()。
数据类型： 财务相关的金额字段（如 amount, profit, trade_amount, commission_amount）使用 NUMERIC(30, 10)，保证精度。比率使用 NUMERIC(5, 4)。
索引优化： 为关键的 FOREIGN KEY 和查询字段创建了索引，以提高数据检索性能（如 inviter_id, user_id, created_at 等）。
3. 安全与权限（RLS）：

行级安全（RLS）策略：
所有核心业务表 (users, transactions, contract_trades, spot_trades, admin_requests, investments, withdrawal_addresses, commission_logs) 都启用了 RLS。
管理员特权： 定义了针对 public.is_admin(auth.uid()) 的策略，允许管理员（is_admin = TRUE 的用户）对所有表拥有完全访问权限。
用户权限：
用户可以查看自己的个人资料。
用户可以查看自己的邀请人信息。
用户可以管理（增删改查）自己的所有交易、合约交易、现货交易、管理请求、投资和提现地址。
用户可以查看自己作为上线所获得的佣金日志。
is_admin 辅助函数： 用于在 RLS 策略中判断当前 auth.uid() 对应的用户是否为管理员。
postgres 角色： postgres 用户被明确赋予 BYPASSRLS 权限，并设置了 request.jwt.claims，这允许 Supabase 后台服务或特权调用绕过 RLS 规则，执行管理员级别的操作（例如调用 admin_get_all_users）。
函数执行权限： 明确授予了 anon_key 和 authenticated 用户执行 register_new_user、distribute_commissions 和 get_user_downline 等关键公共函数的权限。管理员专属函数则只授予 postgres 角色。
项目信息整合：

项目类型： NextJS 加密货币网页应用。
域名/部署：
域名：srfapp.com
项目地址：ctoapp.netlify.app
部署地址：www.srfapp.com (已通过 Cloudflare 配置跳转至 Netlify 部署地址)
提供了 Cloudflare Origin SSL 证书。
API 密钥： 提供了 Tatum API 密钥（Mainnet 和 Testnet），以及 Supabase 的 URL 和各种密钥，这些都应作为环境变量配置。

管理登录信息：
账号：admin666
密码：admin789
邀请码：admin8888

---
## 数据库修复脚本

如果您遇到管理员 (`admin666`) 无法登录，或看到 `Cannot coerce the result to a single JSON object` 的错误，请在您的 Supabase 项目的 **SQL Editor** 中执行以下脚本一次。

这个脚本会创建一个函数，该函数的作用是：在管理员登录时，自动检查并创建其在 `public.users` 表中缺失的个人资料，从而修复登录问题。

```sql
-- Creates or replaces the function to ensure the admin user profile exists.
CREATE OR REPLACE FUNCTION create_admin_user_profile_if_not_exists()
RETURNS void AS $$
DECLARE
    admin_auth_user RECORD;
BEGIN
    -- Find the admin user in the auth.users table
    SELECT * INTO admin_auth_user FROM auth.users WHERE email = 'admin666@noemail.app' LIMIT 1;

    -- If the admin exists in auth but not in public.users, create the profile
    IF admin_auth_user IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.users WHERE id = admin_auth_user.id) THEN
        INSERT INTO public.users (id, username, email, is_admin)
        VALUES (admin_auth_user.id, 'admin666', 'admin666@noemail.app', TRUE);
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to the authenticated role
GRANT EXECUTE ON FUNCTION create_admin_user_profile_if_not_exists() TO authenticated;
```

---

其他笔记：
src/app/download/page.tsx 提示应用可能提供下载功能。
README.md 详细解释了认证逻辑。
src/app/profile/payment/page.tsx 涉及提现地址管理。
总结：

这是一个基于 Next.js 和 Supabase 构建的加密货币交易平台，具有完善的用户认证、多种交易类型（合约和现货）、投资功能以及一个多级佣金推荐系统。项目注重安全性，通过 Supabase 的 RLS 和自定义 PostgreSQL 函数实现了精细的权限控制。它还集成了 Tatum API 来获取实时的区块链数据，并可能利用 Genkit AI 提供智能辅助。部署流程也清晰，通过 GitHub/Netlify 实现自动化部署，并使用了 Cloudflare 进行域名管理和SSL配置。
