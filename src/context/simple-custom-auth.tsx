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

// 会话管理
const SESSION_KEY = 'coinsr_user_session';
const SESSION_DURATION = 24 * 60 * 60 * 1000; // 24小时

export function SimpleAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SecureUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  // 初始化检查会话
  useEffect(() => {
    const initAuth = async () => {
      if (!isSupabaseEnabled) {
        console.warn("Supabase is disabled. Auth will not function.");
        setIsLoading(false);
        return;
      }

      const sessionData = localStorage.getItem(SESSION_KEY);
      if (sessionData) {
        try {
          const { userId, expiry } = JSON.parse(sessionData);
          
          if (Date.now() < expiry) {
            // 会话有效，获取用户数据
            const { data, error } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', userId)
              .eq('is_frozen', false)
              .single();

            if (data && !error) {
              setUser(data as SecureUser);
            } else {
              localStorage.removeItem(SESSION_KEY);
            }
          } else {
            localStorage.removeItem(SESSION_KEY);
          }
        } catch (error) {
          localStorage.removeItem(SESSION_KEY);
        }
      }
      setIsLoading(false);
    };

    initAuth();
  }, []);

  const login = async (username: string, password: string): Promise<{ success: boolean; isAdmin: boolean; error?: string }> => {
    try {
      // 1. 管理员登录检查
      if (
        username === process.env.NEXT_PUBLIC_ADMIN_NAME &&
        password === process.env.NEXT_PUBLIC_ADMIN_KEY
      ) {
        // 查找或创建管理员
        let { data: admin, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('username', username)
          .single();

        if (error && error.code === 'PGRST116') {
          // 创建管理员账户
          const adminId = crypto.randomUUID();
          const { data: newAdmin, error: createError } = await supabase
            .from('profiles')
            .insert({
              id: adminId,
              username: username,
              nickname: 'Administrator',
              email: null,
              is_admin: true,
              is_test_user: false,
              invitation_code: '159753', // 管理员邀请码
              password_plain: password, // 临时存储明文密码
            })
            .select()
            .single();

          if (createError) {
            return { success: false, isAdmin: false, error: '管理员创建失败' };
          }
          admin = newAdmin;
        }

        if (admin) {
          setSession(admin);
          return { success: true, isAdmin: true };
        }
      }

      // 2. 普通用户登录
      const { data: userProfile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('username', username)
        .eq('password_plain', password) // 使用明文密码比较
        .eq('is_frozen', false)
        .single();

      if (error || !userProfile) {
        return { success: false, isAdmin: false, error: '用户名或密码错误' };
      }

      // 更新最后登录时间
      await supabase
        .from('profiles')
        .update({ last_login_at: new Date().toISOString() })
        .eq('id', userProfile.id);

      setSession(userProfile);
      return { success: true, isAdmin: !!userProfile.is_admin };

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
          password_plain: password, // 存储明文密码
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

  const logout = () => {
    localStorage.removeItem(SESSION_KEY);
    setUser(null);
    
    // 显示退出成功提示
    toast({
      title: '退出成功',
      description: '您已安全退出登录，正在跳转到登录页面...',
    });
    
    // 延迟跳转，让用户看到提示
    setTimeout(() => {
      router.push('/login');
    }, 1500);
  };

  const setSession = (userData: SecureUser) => {
    const sessionData = {
      userId: userData.id,
      expiry: Date.now() + SESSION_DURATION,
    };
    localStorage.setItem(SESSION_KEY, JSON.stringify(sessionData));
    setUser(userData);
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