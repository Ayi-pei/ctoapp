"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import type { User as UserType, SecureUser } from '@/types';
import { supabase, isSupabaseEnabled } from '@/lib/supabaseClient';
import bcrypt from 'bcrypt';

export type User = UserType;

interface CustomAuthContextType {
  isAuthenticated: boolean;
  user: SecureUser | null;
  isAdmin: boolean;
  login: (username: string, password: string) => Promise<{ success: boolean; isAdmin: boolean; error?: string }>;
  logout: () => void;
  register: (username: string, password: string, invitationCode: string) => Promise<{ success: boolean; error?: 'username_exists' | 'invalid_code' | 'database_error' | string }>;
  isLoading: boolean;
  getUserById: (id: string) => Promise<User | null>;
  getAllUsers: () => Promise<User[]>;
  getDownline: (userId: string) => Promise<User[]>;
  updateUser: (userId: string, updates: Partial<User>) => Promise<boolean>;
}

const CustomAuthContext = createContext<CustomAuthContextType | undefined>(undefined);

// 会话存储键
const SESSION_KEY = 'coinsr_session';
const SESSION_EXPIRY_KEY = 'coinsr_session_expiry';

export function CustomAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SecureUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  // 检查本地会话
  useEffect(() => {
    const checkSession = async () => {
      if (!isSupabaseEnabled) {
        console.warn("Supabase is disabled. Auth will not function.");
        setIsLoading(false);
        return;
      }

      const sessionData = localStorage.getItem(SESSION_KEY);
      const sessionExpiry = localStorage.getItem(SESSION_EXPIRY_KEY);

      if (sessionData && sessionExpiry) {
        const expiryTime = parseInt(sessionExpiry);
        if (Date.now() < expiryTime) {
          try {
            const userData = JSON.parse(sessionData);
            // 验证用户是否仍然存在且有效
            const { data, error } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', userData.id)
              .eq('is_frozen', false)
              .single();

            if (data && !error) {
              setUser(data as SecureUser);
            } else {
              // 清除无效会话
              localStorage.removeItem(SESSION_KEY);
              localStorage.removeItem(SESSION_EXPIRY_KEY);
            }
          } catch (error) {
            console.error('Session validation error:', error);
            localStorage.removeItem(SESSION_KEY);
            localStorage.removeItem(SESSION_EXPIRY_KEY);
          }
        } else {
          // 会话已过期
          localStorage.removeItem(SESSION_KEY);
          localStorage.removeItem(SESSION_EXPIRY_KEY);
        }
      }
      setIsLoading(false);
    };

    checkSession();
  }, []);

  const login = async (username: string, password: string): Promise<{ success: boolean; isAdmin: boolean; error?: string }> => {
    try {
      // 1. 检查管理员登录
      if (
        username === process.env.NEXT_PUBLIC_ADMIN_NAME &&
        password === process.env.NEXT_PUBLIC_ADMIN_KEY
      ) {
        // 查找或创建管理员账户
        let { data: adminProfile, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('username', username)
          .single();

        if (error && error.code === 'PGRST116') {
          // 管理员不存在，创建一个
          const adminId = crypto.randomUUID();
          const { data: newAdmin, error: createError } = await supabase
            .from('profiles')
            .insert({
              id: adminId,
              username: username,
              nickname: 'Administrator',
              email: null, // 不使用邮箱
              is_admin: true,
              is_test_user: false,
              invitation_code: process.env.NEXT_PUBLIC_ADMIN_AUTH || 'ADMIN001',
              password_hash: await bcrypt.hash(password, 10),
              created_at: new Date().toISOString(),
            })
            .select()
            .single();

          if (createError) {
            return { success: false, isAdmin: false, error: '管理员账户创建失败' };
          }
          adminProfile = newAdmin;
        } else if (error) {
          return { success: false, isAdmin: false, error: '登录失败' };
        }

        // 验证密码（对于已存在的管理员）
        if (adminProfile.password_hash) {
          const isValidPassword = await bcrypt.compare(password, adminProfile.password_hash);
          if (!isValidPassword) {
            return { success: false, isAdmin: false, error: '密码错误' };
          }
        }

        // 设置会话
        setSession(adminProfile);
        return { success: true, isAdmin: true };
      }

      // 2. 普通用户登录
      const { data: userProfile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('username', username)
        .eq('is_frozen', false)
        .single();

      if (error || !userProfile) {
        return { success: false, isAdmin: false, error: '用户不存在或已被冻结' };
      }

      // 验证密码
      if (!userProfile.password_hash) {
        return { success: false, isAdmin: false, error: '账户配置错误' };
      }

      const isValidPassword = await bcrypt.compare(password, userProfile.password_hash);
      if (!isValidPassword) {
        return { success: false, isAdmin: false, error: '密码错误' };
      }

      // 更新最后登录时间
      await supabase
        .from('profiles')
        .update({ last_login_at: new Date().toISOString() })
        .eq('id', userProfile.id);

      // 设置会话
      setSession(userProfile);
      return { success: true, isAdmin: !!userProfile.is_admin };

    } catch (error) {
      console.error('Login error:', error);
      return { success: false, isAdmin: false, error: '登录过程中发生错误' };
    }
  };

  const register = async (username: string, password: string, invitationCode: string): Promise<{ success: boolean; error?: string }> => {
    try {
      // 1. 检查用户名是否已存在
      const { data: existingUser } = await supabase
        .from('profiles')
        .select('id')
        .eq('username', username)
        .single();

      if (existingUser) {
        return { success: false, error: 'username_exists' };
      }

      // 2. 验证邀请码
      const { data: inviter, error: inviterError } = await supabase
        .from('profiles')
        .select('id')
        .eq('invitation_code', invitationCode)
        .single();

      if (inviterError || !inviter) {
        return { success: false, error: 'invalid_code' };
      }

      // 3. 创建新用户
      const userId = crypto.randomUUID();
      const passwordHash = await bcrypt.hash(password, 10);
      const newInvitationCode = Math.random().toString(36).substring(2, 8).toUpperCase();

      const { data: newUser, error: createError } = await supabase
        .from('profiles')
        .insert({
          id: userId,
          username: username,
          nickname: username,
          email: null, // 不使用邮箱
          inviter_id: inviter.id,
          invitation_code: newInvitationCode,
          password_hash: passwordHash,
          is_admin: false,
          is_test_user: true,
          credit_score: 95,
          avatar_url: `https://api.dicebear.com/8.x/initials/svg?seed=${username}`,
          created_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (createError) {
        console.error('User creation error:', createError);
        return { success: false, error: 'database_error' };
      }

      // 4. 创建初始余额（调用数据库函数）
      await supabase.rpc('create_initial_balances', { p_user_id: userId });

      return { success: true };

    } catch (error) {
      console.error('Registration error:', error);
      return { success: false, error: 'database_error' };
    }
  };

  const logout = () => {
    localStorage.removeItem(SESSION_KEY);
    localStorage.removeItem(SESSION_EXPIRY_KEY);
    setUser(null);
    router.push('/login');
  };

  const setSession = (userData: SecureUser) => {
    const expiryTime = Date.now() + (24 * 60 * 60 * 1000); // 24小时
    localStorage.setItem(SESSION_KEY, JSON.stringify(userData));
    localStorage.setItem(SESSION_EXPIRY_KEY, expiryTime.toString());
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
      const { password, ...profileUpdates } = updates as any;

      if (password) {
        profileUpdates.password_hash = await bcrypt.hash(password, 10);
      }

      const { error } = await supabase
        .from('profiles')
        .update(profileUpdates)
        .eq('id', userId);

      if (error) throw error;

      // 如果更新的是当前用户，刷新状态
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
    <CustomAuthContext.Provider value={value}>
      {children}
    </CustomAuthContext.Provider>
  );
}

export function useCustomAuth() {
  const context = useContext(CustomAuthContext);
  if (context === undefined) {
    throw new Error('useCustomAuth must be used within a CustomAuthProvider');
  }
  return context;
}