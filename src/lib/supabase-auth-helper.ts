// Supabase 自定义认证辅助函数
// 用于在数据库操作前设置当前用户上下文

import { supabase, isSupabaseEnabled } from './supabaseClient';

/**
 * 设置当前用户上下文，用于 RLS 策略
 * 在每次需要数据库操作前调用此函数
 */
export async function setCurrentUserContext(userId: string | null) {
  if (!isSupabaseEnabled || !userId) {
    return;
  }

  try {
    await supabase.rpc('set_current_user', { p_user_id: userId });
  } catch (error) {
    console.warn('Failed to set user context:', error);
  }
}

/**
 * 创建带用户上下文的 Supabase 客户端包装器
 * 自动在操作前设置用户上下文
 */
export function createAuthenticatedSupabaseClient(userId: string) {
  return {
    async from(table: string) {
      await setCurrentUserContext(userId);
      return supabase.from(table);
    },
    
    async rpc(functionName: string, params?: any) {
      await setCurrentUserContext(userId);
      return supabase.rpc(functionName, params);
    },
    
    // 其他需要的方法可以在这里添加
    channel: supabase.channel.bind(supabase),
    removeChannel: supabase.removeChannel.bind(supabase),
  };
}

/**
 * 清除用户上下文
 */
export async function clearUserContext() {
  if (!isSupabaseEnabled) {
    return;
  }

  try {
    await supabase.rpc('set_current_user', { p_user_id: null });
  } catch (error) {
    console.warn('Failed to clear user context:', error);
  }
}