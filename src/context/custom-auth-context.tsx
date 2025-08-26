"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import type { User as UserType, SecureUser } from '@/types';
import { supabase, isSupabaseEnabled } from '@/lib/supabaseClient';

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
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const json = await res.json();
      if (res.ok && json.success && json.user) {
        setSession(json.user as SecureUser);
        return { success: true, isAdmin: !!json.user.is_admin };
      }
      return { success: false, isAdmin: false, error: json?.error || '用户名或密码错误' };
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, isAdmin: false, error: '登录过程中发生错误' };
    }
  };

  const register = async (username: string, password: string, invitationCode: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password, invitationCode }),
      });
      const json = await res.json();
      if (res.ok && json.success) {
        return { success: true };
      }
      return { success: false, error: json?.error || '注册失败' };
    } catch (error) {
      console.error('Registration error:', error);
      return { success: false, error: '注册过程中发生错误' };
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
      const res = await fetch('/api/auth/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, updates }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) return false;

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