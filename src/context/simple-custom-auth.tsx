"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import type { User as UserType, SecureUser } from '@/types';
import { supabase, isSupabaseEnabled } from '@/lib/supabaseClient';
import { toast } from '@/hooks/use-toast';

export type User = UserType;

interface SimpleAuthContextType {
  isAuthenticated: boolean;
  user: SecureUser | null;
  isAdmin: boolean;
  login: (username: string, password: string) => Promise<{ success: boolean; isAdmin: boolean; error?: string }>;
  logout: () => void;
  register: (username: string, password: string, invitationCode: string) => Promise<{ success: boolean; error?: string }>;
  isLoading: boolean;
  getUserById: (id: string) => Promise<User | null>;
  getAllUsers: () => Promise<User[]>;
  getDownline: (userId: string) => Promise<User[]>;
  updateUser: (userId: string, updates: Partial<User>) => Promise<boolean>;
}

const SimpleAuthContext = createContext<SimpleAuthContextType | undefined>(undefined);

// 由服务端会话 Cookie 维护登录态，无需本地存储 token


export function SimpleAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SecureUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  // 初始化检查会话
  useEffect(() => {
    const initAuth = async () => {
      try {
        // 向后端请求当前登录用户
        const res = await fetch('/api/auth/me', { credentials: 'include' });
        const json = await res.json();
        if (res.ok && json.authenticated && json.user) {
          setUser(json.user as SecureUser);
        } else {
          setUser(null);
        }
      } catch (e) {
        console.warn('auth/me failed:', e);
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();
  }, []);

  const login = async (username: string, password: string): Promise<{ success: boolean; isAdmin: boolean; error?: string }> => {
    try {
      // Delegate admin/secure checks to server API
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const json = await res.json();
      if (res.ok && json.success && json.user) {
        // 会话由后端 Cookie 维护，这里只存到内存
        setUser(json.user as SecureUser);
        return { success: true, isAdmin: !!json.user.is_admin };
      }

      // 如果服务端校验失败，直接按失败处理（不在前端做密码校验）
      return { success: false, isAdmin: false, error: json?.error || '用户名或密码错误' };

    } catch (error) {
      console.error('Login error:', error);
      return { success: false, isAdmin: false, error: '登录失败' };
    }
  };

  const register = async (username: string, password: string, invitationCode: string): Promise<{ success: boolean; error?: string }> => {
    try {
      // 1. 检查用户名
      const { data: existing } = await supabase
        .from('profiles')
        .select('id')
        .eq('username', username)
        .single();

      if (existing) {
        return { success: false, error: '用户名已存在' };
      }

      // 2. 验证邀请码
      const { data: inviter, error: inviterError } = await supabase
        .from('profiles')
        .select('id')
        .eq('invitation_code', invitationCode)
        .single();

      if (inviterError || !inviter) {
        return { success: false, error: '邀请码无效' };
      }

      // 3. 创建用户
      const userId = crypto.randomUUID();
      const newInvitationCode = Math.random().toString(36).substring(2, 8).toUpperCase();

      const { error: createError } = await supabase
        .from('profiles')
        .insert({
          id: userId,
          username: username,
          nickname: username,
          email: null,
          inviter_id: inviter.id,
          invitation_code: newInvitationCode,
          password_hash: password, // 存储密码哈希
          is_admin: false,
          is_test_user: true,
          credit_score: 95,
          avatar_url: `https://api.dicebear.com/8.x/initials/svg?seed=${username}`,
        });

      if (createError) {
        console.error('User creation error:', createError);
        return { success: false, error: '注册失败' };
      }

      // 4. 创建初始余额
      const supportedAssets = ['USDT', 'BTC', 'ETH', 'USD', 'EUR', 'GBP'];
      for (const asset of supportedAssets) {
        await supabase
          .from('balances')
          .insert({
            user_id: userId,
            asset: asset,
            available_balance: 0,
            frozen_balance: 0,
          });
      }

      return { success: true };

    } catch (error) {
      console.error('Registration error:', error);
      return { success: false, error: '注册过程中发生错误' };
    }
  };

  const logout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
    } catch {}
    setUser(null);

    toast({
      title: '退出成功',
      description: '您已安全退出登录，正在跳转到登录页面...',
    });

    setTimeout(() => {
      router.push('/login');
    }, 800);
  };

  // 不再使用本地存储的“伪会话”
  const setSession = (_userData: SecureUser) => {
    setUser(_userData);
  };

  const getUserById = async (id: string): Promise<User | null> => {
    const { data, error } = await supabase.from('profiles').select('*').eq('id', id).single();
    return error ? null : data;
  };

  const getAllUsers = async (): Promise<User[]> => {
    const { data, error } = await supabase.from('profiles').select('*');
    return error ? [] : data;
  };

  const getDownline = async (userId: string): Promise<User[]> => {
    const { data, error } = await supabase.rpc('get_downline', { p_user_id: userId });
    return error ? [] : data;
  };

  const updateUser = async (userId: string, updates: Partial<User>): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', userId);

      if (error) throw error;

      // 刷新当前用户状态
      if (user && user.id === userId) {
        const refreshedUser = await getUserById(userId);
        if (refreshedUser) {
          setUser(refreshedUser as SecureUser);
        }
      }

      return true;
    } catch (error) {
      console.error(`Failed to update user ${userId}:`, error);
      return false;
    }
  };

  const value = {
    isAuthenticated: !!user,
    user,
    isAdmin: user?.is_admin || false,
    login,
    logout,
    register,
    isLoading,
    getUserById,
    getAllUsers,
    getDownline,
    updateUser,
  };

  return (
    <SimpleAuthContext.Provider value={value}>
      {children}
    </SimpleAuthContext.Provider>
  );
}

export function useSimpleAuth() {
  const context = useContext(SimpleAuthContext);
  if (context === undefined) {
    throw new Error('useSimpleAuth must be used within a SimpleAuthProvider');
  }
  return context;
}