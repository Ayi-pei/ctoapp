# 自定义认证系统迁移指南

## 概述

本项目已从依赖 Supabase Auth 的 RLS 策略迁移到兼容自定义认证系统的 RLS 策略。

## 主要变更

### 1. 数据库层面变更

#### 新增函数
- `get_current_user_id()` - 获取当前会话用户ID
- `is_current_user_admin()` - 检查当前用户是否为管理员
- `set_current_user(p_user_id UUID)` - 设置当前会话用户ID

#### RLS 策略更新
所有表的 RLS 策略已从 `auth.uid()` 更新为 `get_current_user_id()`：
- `profiles` - 用户资料表
- `balances` - 用户余额表
- `trades` - 交易记录表
- `investments` - 投资记录表
- `reward_logs` - 奖励日志表
- `requests` - 用户请求表
- `user_task_states` - 任务状态表
- `swap_orders` - 交换订单表
- `announcements` - 公告表

#### 新增缺失函数
- `credit_reward()` - 发放奖励
- `create_daily_investment()` - 创建每日投资
- `create_hourly_investment()` - 创建小时投资

### 2. 应用层面变更

#### 新增辅助文件
- `src/lib/supabase-auth-helper.ts` - 认证辅助函数
- `src/context/enhanced-supabase-context.tsx` - 增强的 Supabase 上下文

## 迁移步骤

### 步骤 1: 执行数据库迁移

在 Supabase SQL Editor 中执行：
```sql
-- 执行 supabase/migrations/20250102000000_fix_rls_custom_auth_compatibility.sql
```

### 步骤 2: 更新应用布局

在 `src/app/layout.tsx` 中添加新的上下文提供者：

```tsx
import { EnhancedSupabaseProvider } from "@/context/enhanced-supabase-context";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh">
      <body className={inter.className}>
        <SimpleAuthProvider>
          <EnhancedSupabaseProvider>
            {/* 其他提供者 */}
            {children}
          </EnhancedSupabaseProvider>
        </SimpleAuthProvider>
      </body>
    </html>
  );
}
```

### 步骤 3: 更新数据库操作

#### 旧方式（直接使用 supabase）
```tsx
const { data, error } = await supabase
  .from('balances')
  .select('*')
  .eq('user_id', user.id);
```

#### 新方式（使用认证上下文）
```tsx
import { useAuthenticatedSupabase } from '@/context/enhanced-supabase-context';

const supabaseAuth = useAuthenticatedSupabase();
const { data, error } = await supabaseAuth
  .from('balances')
  .select('*');
// 不需要手动添加 .eq('user_id', user.id)，RLS 会自动处理
```

### 步骤 4: 更新 API 路由

在服务端 API 路由中，需要手动设置用户上下文：

```tsx
import { setCurrentUserContext } from '@/lib/supabase-auth-helper';

export async function GET(request: Request) {
  // 验证用户身份
  const { valid, userId } = verifySession(token);
  
  if (valid && userId) {
    // 设置用户上下文
    await setCurrentUserContext(userId);
    
    // 现在可以安全地查询数据，RLS 会自动过滤
    const { data, error } = await supabase
      .from('balances')
      .select('*');
  }
}
```

## 使用示例

### 1. 在 React 组件中使用

```tsx
import { useAuthenticatedSupabase } from '@/context/enhanced-supabase-context';

function UserBalances() {
  const supabaseAuth = useAuthenticatedSupabase();
  
  useEffect(() => {
    const loadBalances = async () => {
      if (supabaseAuth.isEnabled && supabaseAuth.user) {
        const { data, error } = await supabaseAuth
          .from('balances')
          .select('*');
        
        if (error) {
          console.error('Error loading balances:', error);
        } else {
          setBalances(data);
        }
      }
    };
    
    loadBalances();
  }, [supabaseAuth]);
}
```

### 2. 在 API 路由中使用

```tsx
import { setCurrentUserContext } from '@/lib/supabase-auth-helper';
import { verifySession } from '@/lib/auth/session';

export async function POST(request: Request) {
  const token = cookies().get('session')?.value;
  const { valid, userId } = verifySession(token);
  
  if (!valid || !userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  // 设置用户上下文
  await setCurrentUserContext(userId);
  
  // 现在可以安全地执行数据库操作
  const { data, error } = await supabase.rpc('credit_reward', {
    p_user_id: userId,
    p_amount: 100,
    p_asset: 'USDT',
    p_reward_type: 'bonus',
    p_source_id: 'system',
    p_description: 'Welcome bonus'
  });
  
  return NextResponse.json({ success: !error, data });
}
```

## 注意事项

### 1. 性能考虑
- 每次数据库操作前都会调用 `set_current_user()`，这会有轻微的性能开销
- 在高频操作中，考虑批量设置用户上下文

### 2. 错误处理
- 如果用户上下文设置失败，操作会继续执行，但可能因为 RLS 而被拒绝
- 确保在关键操作前检查用户上下文设置是否成功

### 3. 向后兼容性
- 旧的直接 supabase 调用仍然可以工作，但不会有 RLS 保护
- 建议逐步迁移到新的认证上下文系统

## 测试验证

### 1. 验证 RLS 策略
```sql
-- 测试用户只能看到自己的数据
SELECT set_current_user('user-id-1');
SELECT * FROM balances; -- 应该只返回 user-id-1 的余额

-- 测试管理员可以看到所有数据
SELECT set_current_user('admin-user-id');
SELECT * FROM balances; -- 应该返回所有用户的余额
```

### 2. 验证应用功能
- [ ] 用户登录后可以查看自己的余额
- [ ] 用户无法查看其他用户的数据
- [ ] 管理员可以查看所有数据
- [ ] 投资功能正常工作
- [ ] 奖励发放功能正常工作

## 故障排除

### 常见问题

1. **RLS 策略拒绝访问**
   - 检查是否正确设置了用户上下文
   - 验证用户 ID 是否正确
   - 确认用户在 profiles 表中存在

2. **函数调用失败**
   - 检查函数是否正确创建
   - 验证参数类型是否匹配
   - 查看 Supabase 日志获取详细错误信息

3. **性能问题**
   - 考虑在组件级别缓存认证上下文
   - 减少不必要的数据库调用
   - 使用批量操作减少上下文设置次数

## 后续优化

1. **缓存优化** - 在会话期间缓存用户上下文
2. **批量操作** - 支持批量数据库操作的上下文设置
3. **监控** - 添加 RLS 策略性能监控
4. **文档** - 完善 API 文档和使用示例