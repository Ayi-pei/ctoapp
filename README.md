# CoinSR - 全栈交易应用

这是一个在 Firebase Studio 中构建的 Next.js 应用，利用 Supabase 提供强大的后端、实时数据和身份认证功能。

## 核心技术

- 框架: Next.js (App Router)
- 后端与数据库: Supabase (PostgreSQL, Auth, Realtime, Storage)
- 样式: Tailwind CSS & ShadCN UI
- AI 集成: Google AI & Genkit

---

## 生产级架构概览

该应用采用前后端分离架构，轻量级的前端负责展示，强大的后端负责驱动逻辑，从而保证了系统的可扩展性、数据一致性和安全性。

### 1) 数据流与后端逻辑

- 身份认证: 完全由 Supabase 管理（或自定义 API 路由）。当新用户注册时，一个触发器会自动在 `profiles` 公共表中创建对应的个人资料。
- 市场数据管道:
  1. 外部接口轮询: 后端的定时任务（例如 `pg_cron` 调度的 Supabase Edge Function）周期性地从外部 API（如 Tatum/Coingecko/Coindesk/YahooFinance）获取数据。
  2. 数据暂存与干预: 原始数据先由后端函数处理，检查管理员在 `system_settings` 中定义的市场干预规则；若规则激活，真实数据可被模拟逻辑覆盖。
  3. 数据持久化: 处理后的数据保存到 `market_summary_data` 与 `market_kline_data` 表。
- 自动化交易结算:
  - `settle_due_records()` 通过 `pg_cron` 每分钟自动运行。
  - 寻找到期的“进行中”订单，计算盈亏，在事务中更新状态并返还余额到 `balances`。
- 自动化佣金分配:
  - `trades` 表触发 `distribute_trade_commissions()`。
  - 递归找到上三级邀请人，计算佣金，直接更新其 `balances`。

### 2) 前端职责

- 数据消费: 通过 `Context` 提供者 + Supabase Realtime 订阅数据变化。
- 实时更新: 后端变更（价格、结算、余额）会实时推送，组件自动重渲染。
- 用户输入: 前端仅负责安全采集并调用服务端 API，不包含复杂业务逻辑。

### 3) 优势

- 轻量级客户端: 繁重计算在后端完成，前端体验更顺畅。
- 一致性与原子性: 关键金融计算在数据库事务中执行，防止部分更新。
- 安全与可靠: 核心逻辑在服务端受保护，定时任务确保流程可靠执行。
- 可扩展: 以后端为中心的逻辑更易扩展以支撑增长。

---

## 环境变量与 .env 使用指南

1) 复制环境模板
- 将项目根目录下的 `.env.example` 复制为 `.env`

2) 变量说明
- 客户端（可暴露，打包进浏览器）
  - NEXT_PUBLIC_APP_URL=你的应用地址（如 http://localhost:3000）
  - NEXT_PUBLIC_SUPABASE_URL=你的 Supabase 项目 URL
  - NEXT_PUBLIC_SUPABASE_ANON_KEY=你的 Supabase anon key
- 服务端（严禁以 NEXT_PUBLIC_ 开头，永不暴露给前端）
  - SUPABASE_URL=你的 Supabase 项目 URL
  - SUPABASE_ANON_KEY=你的 Supabase anon key（仅服务端使用）
  - SUPABASE_SERVICE_ROLE_KEY=你的 Supabase service role key（仅服务端使用）
  - SESSION_SECRET=用于签发/校验会话 JWT 的密钥（高熵）
  - SESSION_TTL=会话有效期（秒），如 86400
- 外部 API（服务端使用）
  - COINGECKO_API_KEY=
  - COINDESK_API_KEY=
  - TATUM_API_KEY=
  - ALPHA_VANTAGE_API_KEY=
  - GEMINI_API_KEY=
- 管理员登录（服务端使用）
  - ADMIN_NAME=管理员用户名（用于服务器端管理员直登）
  - ADMIN_KEY=管理员密码（用于服务器端管理员直登）
  - ADMIN_AUTH=管理员邀请码（作为返回字段使用，不作为登录入参）

3) 重要安全提示
- 不要把 `.env` 提交到仓库。
- 任何服务端敏感变量切勿加 `NEXT_PUBLIC_` 前缀，否则会被打包到前端导致泄露。
- Service Role Key 只能在服务器端 API 路由中使用，绝不能放到浏览器端代码。

---

## 本地启动步骤

前置要求:
- Node.js 18+（推荐 LTS）
- 有效的 Supabase 项目（用于数据库和 Realtime）

步骤:
1. 创建 Supabase 项目: 访问 https://supabase.com 创建新项目。
2. 获取 API 凭证: 在 Supabase 控制台 → 项目设置 → API，获取 项目 URL、anon key、service role key。
3. 配置环境变量: 按上文复制 `.env.example` → `.env` 并填写。
4. 初始化数据库: 打开 Supabase 控制台 → SQL Editor，将项目根目录 `supabase.sql` 内容粘贴并执行（必要的表/函数/触发器/RLS 会被创建）。如使用自定义认证字段，也可参考 `src/lib/custom-auth-schema.sql`。
5. 安装依赖并启动:
   - npm install
   - npm run dev
   - 在浏览器打开 http://localhost:3000

---

## 登录流程（服务端校验 + 密码哈希）

本项目采用“服务端校验 + 数据库存储哈希”的方式处理登录与注册：

- 哈希算法: bcrypt，默认 10 轮盐（salt rounds）。
- 读取与校验均在服务器端 API 路由中完成，前端不接触明文密码以外的逻辑，不读取任何管理员密钥。
- 登录成功后由服务器签发 HttpOnly Cookie（JWT），前端无需显式携带 Token。

### 1) 登录 `/api/auth/login` (POST)
请求体:
```json
{ "username": "alice", "password": "secret" }
```
处理逻辑（见 `src/app/api/auth/login/route.ts`）:
- 管理员直登: 若 `username === ADMIN_NAME && password === ADMIN_KEY`，返回一个内置管理员用户对象；其 `invitation_code` 字段会携带环境变量 `ADMIN_AUTH` 的值。注意：登录入参仅包含 username/password，代码未校验 `ADMIN_AUTH`。
- 普通用户登录:
  1. 使用 Service Role 从 `profiles` 按用户名读取 `password_hash` 与用户状态。
  2. 使用 `bcrypt.compare(明文密码, password_hash)` 校验。
  3. 成功后更新 `last_login_at` 并返回“安全用户对象”（不包含敏感字段）。

成功响应示例:
```json
{ "success": true, "user": { "id": "...", "username": "alice", "nickname": "alice", "is_admin": false, "is_test_user": true, "is_frozen": false, "invitation_code": "ABC123", "created_at": "2024-01-01T00:00:00.000Z", "credit_score": 95 } }
```
失败响应示例:
```json
{ "success": false, "error": "Invalid username or password" }
```

### 2) 注册 `/api/auth/register` (POST)
请求体:
```json
{ "username": "alice", "password": "secret", "invitationCode": "ABC123" }
```
处理逻辑（见 `src/app/api/auth/register/route.ts`）:
1. 唯一性检查: 若用户名已存在，返回 409。
2. 邀请码校验: 在 `profiles` 表查找 `invitation_code == invitationCode` 的邀请人；未找到返回 400。
3. 服务端生成哈希: `password_hash = bcrypt.hash(password, 10)`，并插入新用户记录（生成自身的 `invitation_code`）。
4. 初始化资产: 通过 `rpc('create_initial_balances')` 为新用户创建初始余额。

成功响应:
```json
{ "success": true }
```

### 3) 更新资料 `/api/auth/update` (POST)
请求体（举例，带密码修改）:
```json
{ "userId": "...", "updates": { "nickname": "Alice Zhang", "password": "newSecret" } }
```
处理逻辑（见 `src/app/api/auth/update/route.ts`）:
- 若 `updates` 中包含 `password`，服务端会生成新的 `password_hash` 并仅存储哈希。
- 其他字段原样更新到 `profiles`。

成功响应:
```json
{ "success": true }
```

---

## 外部行情与 K 线

- K 线数据: `/api/market-data` 使用 CoinGecko OHLC 接口，需要 `COINGECKO_API_KEY`（作为 `x-cg-demo-api-key`）。
- Coindesk 示例: `/api/coindesk` 需要 `COINDESK_API_KEY`。
- 其他数据源: 见 `src/app/api/*` 目录（如 Tatum、Alpha Vantage 等），根据需要启用对应的 API key。

---

## 常见问题与排查

- Supabase 未配置: 控制台会输出警告 “Supabase is not configured. Database features will be disabled.”，此时数据库相关功能不可用。
- 环境变量泄露风险: 确保服务端变量没有 `NEXT_PUBLIC_` 前缀；不要把 Service Role Key 放入客户端代码。
- RLS 与权限: 请确保已经运行 `supabase.sql`，并根据业务需要检查 `profiles` 中的 `password_hash` 等字段的访问策略。

---

## 贡献

欢迎提交 Issue 或 PR 改进文档与实现。
