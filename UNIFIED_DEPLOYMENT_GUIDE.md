# 🚀 CoinSR 统一架构部署指南

## ✅ 已完成的统一和简化工作

### 1. 数据库架构统一
- ✅ 整合了所有SQL文件到 `database-unified.sql`
- ✅ 移除了重复和冲突的表结构
- ✅ 统一使用 `profiles` 表作为核心用户表
- ✅ 集成了自定义认证支持（password_hash字段）
- ✅ 优化了索引和性能
- ✅ 添加了完整的业务函数（签到、投资、奖励等）

### 2. 认证系统简化
- ✅ 创建了统一的认证提供者 `UnifiedAuthProvider`
- ✅ 移除了冗余的Context Provider
- ✅ 简化了布局文件中的Provider嵌套
- ✅ 统一使用自定义认证（ADMIN_NAME、ADMIN_KEY、ADMIN_AUTH）
- ✅ 优化了API路由，确保认证逻辑一致性

### 3. 环境配置标准化
- ✅ 创建了完整的 `.env` 配置文件
- ✅ 明确区分了客户端和服务端环境变量
- ✅ 添加了安全注意事项和配置指南

## 🔧 部署步骤

### 步骤1：环境准备
1. 确保 Node.js 18+ 已安装
2. 复制 `.env` 文件并配置实际值：
   ```bash
   # 基础应用配置
   NEXT_PUBLIC_APP_URL=http://localhost:3000
   
   # 自定义认证配置
   ADMIN_NAME=admin
   ADMIN_KEY=your-secure-admin-password
   ADMIN_AUTH=YOUR-ADMIN-INVITATION-CODE
   SESSION_SECRET=your-32-character-session-secret
   
   # Supabase 配置（获取方式见下文）
   NEXT_PUBLIC_SUPABASE_URL=your-supabase-project-url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
   SUPABASE_URL=your-supabase-project-url
   SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
   ```

### 步骤2：Supabase配置
1. 访问 [https://supabase.com](https://supabase.com) 创建账户
2. 创建新项目
3. 在项目设置 → API 中获取：
   - Project URL
   - anon/public key
   - service_role key
4. 在 SQL Editor 中执行 `database-unified.sql` 脚本
5. 确认所有表和函数创建成功

### 步骤3：安装和启动
```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 构建生产版本
npm run build

# 启动生产服务器
npm run start
```

### 步骤4：验证部署
1. 访问 http://localhost:3000
2. 使用配置的管理员账户登录：
   - 用户名：环境变量中的 `ADMIN_NAME`
   - 密码：环境变量中的 `ADMIN_KEY`
3. 检查各功能模块是否正常工作

## 📝 关键改进点

### 数据库层面
- **统一表结构**：消除了 `users` 和 `profiles` 表的重复
- **自定义认证**：添加了 `password_hash` 字段支持
- **完整业务逻辑**：集成了投资、任务、奖励等核心功能
- **性能优化**：添加了关键索引，优化查询性能

### 认证系统
- **简化架构**：从10+层Context嵌套减少到6层
- **统一API**：所有认证相关API使用统一的认证类
- **安全性增强**：使用HttpOnly Cookie和JWT会话管理
- **管理员支持**：内置管理员账户创建和管理

### 开发体验
- **环境配置清晰**：明确的环境变量配置和说明
- **类型安全**：完整的TypeScript类型定义
- **错误处理**：统一的错误处理和日志记录
- **开发工具**：保留了系统健康检查和调试工具

## 🔐 安全注意事项

1. **环境变量安全**
   - 生产环境使用强密码和随机密钥
   - 定期更换API密钥和会话密钥
   - 确保`.env`文件不被提交到版本控制

2. **数据库安全**
   - 使用Supabase的Row Level Security (RLS)
   - 定期备份数据库
   - 监控异常访问

3. **应用安全**
   - 使用HTTPS在生产环境
   - 配置适当的CORS策略
   - 实施速率限制

## 📊 监控和维护

### 日常监控
- 检查应用日志和错误报告
- 监控数据库性能和查询
- 验证外部API连接状态

### 定期维护
- 更新依赖包和安全补丁
- 清理过期的会话和日志
- 备份关键数据和配置

## 🆘 故障排除

### 常见问题
1. **Supabase连接问题**
   - 检查环境变量配置
   - 验证API密钥有效性
   - 确认数据库初始化完成

2. **认证问题**
   - 检查会话密钥配置
   - 验证Cookie设置
   - 确认管理员账户创建

3. **性能问题**
   - 检查数据库索引
   - 优化查询语句
   - 监控API响应时间

### 获取帮助
- 检查控制台错误日志
- 使用开发工具调试
- 参考Supabase官方文档

---

## 🎉 总结

通过本次统一和简化工作，CoinSR项目现在具有：
- ✅ 清晰的数据库架构
- ✅ 简化的认证系统
- ✅ 标准化的环境配置
- ✅ 完整的部署文档
- ✅ 增强的安全性和性能

项目现在已准备好用于生产环境部署！