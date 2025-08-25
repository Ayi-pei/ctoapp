
# Firebase Studio

This is a NextJS starter in Firebase Studio.

To get started, take a look at src/app/page.tsx.

## Supabase Setup (Recommended)

To enable data persistence, it is highly recommended to set up a Supabase project.

1.  **Create a Supabase Project**: Go to [supabase.com](https://supabase.com) and create a new project.

2.  **Get API Credentials**: In your Supabase project dashboard, navigate to **Project Settings** > **API**. You will find your **Project URL** and your **anon (public) key**.

3.  **Set Environment Variables**: Create a `.env` file in the root of this project (if it doesn't exist) and add your credentials:
    ```
    NEXT_PUBLIC_SUPABASE_URL=YOUR_PROJECT_URL
    NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_ANON_KEY
    ```

4.  **Run SQL Script**: Go to the **SQL Editor** in your Supabase dashboard, paste the entire content of the `supabase.sql` file from this project's root directory, and click **"Run"**. This will create all the necessary tables, policies, and indexes.

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

## 行情数据核心逻辑 (`market-data-context.tsx`)

我们的行情数据处理分为三个层次，确保了系统的健壮性和实时性：

1.  **低频真实行情拉取**:
    *   **加密货币**: 每分钟轮流从 **Tatum** 的 API 拉取一次主流加密货币的行情摘要（价格、涨跌幅、交易量等）。
    *   **外汇/大宗商品**: 每小时从 **Yahoo Finance** API 拉取一次外汇和黄金等大宗商品的行情数据。
    *   **数据暂存**: 所有从外部API获取的基础数据都暂存在 `baseApiData` 状态中，作为高频模拟的“基准”和“种子”。

2.  **K线数据初始化**:
    *   **数据库优先**: 应用启动时，首先尝试从 **Supabase** 的 `market_kline_data` 表中获取过去4小时内的历史K线数据。
    *   **冷启动生成与回填**: 如果数据库为空或连接失败，系统会自动进入“冷启动”模式。它会基于 `baseApiData` 的价格，在前端**随机生成4小时的K线数据**，以保证图表始终有内容显示。更智能的是，这些生成的数据可以被配置为**回填写入 Supabase 数据库**，从而丰富我们的历史数据集。
    *   **数据加载**: 无论是从数据库获取还是前端生成，最终的K线数据都会被加载到 `klineData` 状态中，供图表组件使用。

3.  **高频行情模拟 (每秒一次)**:
    *   **实时价格计算**: 每秒钟，系统会基于前一秒的价格进行一次微小的随机波动，计算出最新的“模拟价格”。
    *   **行情干预**: 在计算新价格之前，系统会检查 `systemSettings.marketInterventions` 中是否有当前时间段内生效的**市场干预规则**。如果规则被触发（例如，管理员设置了某一时段内必须上涨），则该规则会**完全覆盖**随机模拟的价格，实现精准控盘。
    *   **状态更新**: 最终计算出的价格（无论是模拟价还是干预价）会被用来更新 `summaryData` 和向 `klineData` 推入一个新的数据点，从而驱动整个UI的实时刷新。

这个三层架构确保了我们的应用既能接入真实世界的数据，又能在无数据或需要特定场景时进行稳定、可控的行情模拟。


## 生产级行情架构 (Production Architecture)

为了减少前端负载、增强数据一致性并实现更可靠的干预逻辑，我们设计了以下生产级架构。该架构将数据处理和调度任务迁移到后端。

### 1. 数据流

1.  **外部 API 拉取**: 一个后端的定时任务（如 Node.js Cron Job 或 Supabase Edge Function）负责从外部 API（Tatum, Yahoo Finance 等）拉取实时行情数据。
2.  **原始数据存储**: 拉取到的原始、未经修改的数据被存入一个“原始表” (`raw_market_data`)。此表仅作为数据备份和处理源，不直接对用户端暴露。
3.  **延迟与干预处理**:
    *   另一个后端延迟处理任务会定时（例如，每秒）运行。
    *   该任务读取 `raw_market_data` 中已经超过设定延迟时间（如 30 秒）的数据。
    *   在准备写入最终数据表前，任务会查询 `market_interventions` 表，检查当前时间是否有生效的干预规则。
    *   如果存在干预规则，则根据规则（如价格乘数、强制设定值等）修改数据。
    *   如果不存在规则，则保持数据不变。
4.  **写入模拟数据表**: 经过延迟和干预逻辑处理后的“最终数据”被写入 `simulated_market_data` 表 (即我们现有的 `market_kline_data` 和 `market_summary_data` 表)。
5.  **用户端展示**: 用户的前端应用只从 `simulated_market_data` 表中读取数据。可以通过 Supabase Realtime 订阅数据变更，实现实时更新。

### 2. 优势

*   **前端轻量化**: 前端不再负责行情模拟、API 轮询和干预逻辑计算，只负责展示数据，极大降低了客户端的性能开销。
*   **数据一致性与公平性**: 所有用户看到的数据都来自同一个经过处理的数据库源，保证了行情的绝对一致。
*   **可靠的干预**: 干预逻辑在服务器端执行，与数据写入流程紧密结合，保证了干预的精确性和可靠性。
*   **数据存档**: 原始的、未被修改的真实市场数据被保存在 `raw_market_data` 表中，便于未来进行数据分析、调试和回溯。
