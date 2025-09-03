
"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import type { User as UserType, SecureUser } from '@/types';
import { supabase, isSupabaseEnabled } from '@/lib/supabaseClient';

export type User = UserType;

interface AuthContextType {
  isAuthenticated: boolean;
  user: SecureUser | null;
  isAdmin: boolean;
  login: (username: string, password: string) => Promise<{ success: boolean; isAdmin: boolean }>;
  logout: () => void;
  register: (username: string, password: string, invitationCode: string) => Promise<{ success: boolean; error?: 'username_exists' | 'invalid_code' | 'supabase_error' }>;
  isLoading: boolean;
  getUserById: (id: string) => Promise<User | null>;
  getAllUsers: () => Promise<User[]>;
  getDownline: (userId: string) => Promise<User[]>;
  updateUser: (userId: string, updates: Partial<User>) => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SecureUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  
  useEffect(() => {
    if (!isSupabaseEnabled) {
        console.warn("Supabase is disabled. Auth will not function.");
        setIsLoading(false);
        return;
    }

    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
        setIsLoading(true);
        if (session?.user) {
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', session.user.id)
                .single();

            if (error) {
                console.error('Error fetching user profile:', error);
                setUser(null);
            } else {
                 setUser(data as SecureUser);
            }
        } else {
            setUser(null);
        }
        setIsLoading(false);
    });

    return () => {
        authListener.subscription.unsubscribe();
    };
  }, []);

  const login = async (username: string, password: string): Promise<{ success: boolean; isAdmin: boolean }> => {
    // 前端不再使用环境变量进行管理员登录，统一走服务端校验
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const json = await res.json();
      if (res.ok && json.success) {
        return { success: true, isAdmin: !!json.user?.is_admin };
      }
      return { success: false, isAdmin: false };
    } catch (e) {
      console.error('Login via API failed:', e);
      return { success: false, isAdmin: false };
    }

    // Regular user login
    const { data, error } = await supabase.auth.signInWithPassword({
        email: `${username}@noemail.app`,
        password,
    });
    
    if (error || !data?.user) {
        console.error("User login failed:", error);
        return { success: false, isAdmin: false };
    }

    const { data: profile } = await supabase.from('profiles').select('is_admin').eq('id', data.user.id).single();

    return { success: true, isAdmin: !!profile?.is_admin };
  };
  
  const register = async (username: string, password: string, invitationCode: string): Promise<{ success: boolean; error?: 'username_exists' | 'invalid_code' | 'supabase_error' }> => {
    // 1. Check if username already exists
    const { data: existingUser, error: existingUserError } = await supabase
      .from('profiles')
      .select('id')
      .eq('username', username)
      .single();

    if (existingUser) {
      return { success: false, error: 'username_exists' };
    }
    
    // 2. Find inviter
    const { data: inviter, error: inviterError } = await supabase
        .from('profiles')
        .select('id')
        .eq('invitation_code', invitationCode)
        .single();
        
    if (inviterError || !inviter) {
         return { success: false, error: 'invalid_code' };
    }

    // 3. Sign up the new user
    const { data, error } = await supabase.auth.signUp({
        email: `${username}@noemail.app`,
        password: password,
        options: {
            data: {
                username: username,
                nickname: username,
                invitation_code: Math.random().toString(36).substring(2, 8).toUpperCase(),
                inviter_id: inviter.id,
                credit_score: 95,
                is_test_user: true, // New users are test users by default
                avatar_url: `https://api.dicebear.com/8.x/initials/svg?seed=${username}`,
            }
        }
    });

    if (error || !data.user) {
        console.error("Supabase sign up error:", error);
        return { success: false, error: 'supabase_error' };
    }

    if (typeof window !== 'undefined') {
        console.log(`New user registered: ${username} (ID: ${data.user.id})`);
    }

    return { success: true };
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    router.replace('/login');
  };
  
  const getUserById = async (id: string): Promise<User | null> => {
      const { data, error } = await supabase.from('profiles').select('*').eq('id', id).single();
      if (error) {
          console.error(`Error fetching user ${id}:`, error);
          return null;
      }
      return data;
  }

  const getAllUsers = async (): Promise<User[]> => {
    const { data, error } = await supabase.from('profiles').select('*');
    if (error) {
        console.error("Error fetching all users:", error);
        return [];
    }
    return data || [];
  }

  const getDownline = async (userId: string): Promise<User[]> => {
     const { data, error } = await supabase.rpc('get_downline', { p_user_id: userId });
     if (error) {
         console.error('Error fetching downline:', error);
         return [];
     }
     return data;
  };

  const updateUser = async (userId: string, updates: Partial<User>): Promise<boolean> => {
      const { password, ...profileUpdates } = updates;
      
      try {
        if (password) {
            const { error: authError } = await supabase.auth.admin.updateUserById(userId, { password });
            if (authError) throw authError;
        }

        if (Object.keys(profileUpdates).length > 0) {
            const { error: profileError } = await supabase
                .from('profiles')
                .update(profileUpdates)
                .eq('id', userId);
            if (profileError) throw profileError;
        }
        
        // If the updated user is the current user, refresh the user state
        if (user && user.id === userId) {
            const refreshedUser = await getUserById(userId);
            setUser(refreshedUser as SecureUser);
        }

        return true;
      } catch (error) {
          console.error(`Failed to update user ${userId}:`, error);
          return false;
      }
  }

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
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
