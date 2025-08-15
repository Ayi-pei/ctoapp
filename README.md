# Firebase Studio

This is a NextJS starter in Firebase Studio.

To get started, take a look at src/app/page.tsx.

## 项目核心逻辑 (Current Architecture)

本应用目前使用 **React Context API** 和 **浏览器的 `localStorage`** 来模拟一个完整的后端和数据库系统。所有的数据，包括用户、交易、余额和请求，都保存在 `localStorage` 中，这使得应用可以在没有真实后端的情况下运行和测试。

### 认证逻辑 (Authentication Flow)

应用的认证流程完全在客户端通过 `src/context/auth-context.tsx` 处理。

*   **用户数据存储**: 所有用户的信息（包括加密的密码）都存储在 `localStorage` 的 `tradeflow_users`键中。
*   **注册流程**:
    1.  新用户注册时，需要提供一个有效的邀请码。
    2.  `auth-context` 会验证邀请码是否存在。
    3.  验证通过后，系统会创建一个新的用户对象，生成一个新的邀请码，并将其与邀请人ID一起存入 `localStorage`。
*   **登录流程**:
    1.  用户输入用户名和密码。
    2.  `auth-context` 会在 `localStorage` 中查找匹配的用户。
    3.  匹配成功后，用户信息会被加载到应用状态中，并写入 `sessionStorage` 以维持登录会话。

### 管理员账户 (Admin Account)

管理员账户并非通过注册产生，而是通过项目根目录下的环境变量进行配置。

*   **账号**: `NEXT_PUBLIC_ADMIN_NAME`
*   **密码**: `NEXT_PUBLIC_ADMIN_KEY`
*   **专属邀请码**: `NEXT_PUBLIC_ADMIN_AUTH` (用于生成第一批种子用户)

### 核心业务功能

*   **交易与投资**:
    *   **秒合约/币币交易**: 用户的交易操作会实时更新 `balance-context` 中的余额状态（包括可用和冻结），所有交易记录被保存在 `localStorage` 中。秒合约到期后会自动结算。
    *   **理财**: 用户投资理财产品会直接扣减其 USDT 余额。
*   **三级返佣系统**:
    *   当用户进行交易时，`balance-context` 中的 `distributeCommissions` 函数会被触发。
    *   系统会向上查找该用户的三级邀请人，并按照 8%、5%、2% 的比例，将佣金实时增加到上线用户的 USDT 余额中，并记录佣金日志。
*   **充值/提现审核**:
    *   用户发起的充值/提现请求会作为一条记录保存在 `requests-context` 中。
    *   管理员可以在后台页面看到这些请求，并进行批准或拒绝操作。操作结果会实时同步更新用户的余额和订单状态。
*   **数据持久化**:
    *   每个用户的核心数据（余额、交易历史、投资记录、佣金日志等）都以 `tradeflow_user_{userId}` 的格式独立存储在 `localStorage` 中。
    *   系统设置（如充值地址）和所有审核请求则分别存储在 `tradeflow_system_settings` 和 `tradeflow_requests` 中。
