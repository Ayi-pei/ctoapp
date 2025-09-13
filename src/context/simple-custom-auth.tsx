"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import type { User as UserType, SecureUser } from "@/types";
import { supabase, isSupabaseEnabled } from "@/lib/supabaseClient";
import { toast } from "@/hooks/use-toast";

export type User = UserType;

interface SimpleAuthContextType {
  isAuthenticated: boolean;
  user: SecureUser | null;
  isAdmin: boolean;
  login: (
    username: string,
    password: string
  ) => Promise<{ success: boolean; isAdmin: boolean; error?: string }>;
  logout: () => void;
  register: (
    username: string,
    password: string,
    invitationCode: string
  ) => Promise<{ success: boolean; error?: string }>;
  isLoading: boolean;
  getUserById: (id: string) => Promise<User | null>;
  getAllUsers: () => Promise<User[]>;
  getDownline: (userId: string) => Promise<User[]>;
  updateUser: (userId: string, updates: Partial<User>) => Promise<boolean>;
}

const SimpleAuthContext = createContext<SimpleAuthContextType | undefined>(
  undefined
);

// 由服务端会话 Cookie 维护登录态，无需本地存储 token

export function SimpleAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SecureUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  // 初始化检查会话
  useEffect(() => {
    const initAuth = async () => {
      try {
        console.log("SimpleAuthProvider: 开始初始化认证状态...");

        // 添加超时控制，防止请求挂起
        const controller = new AbortController();
        const timeoutId = setTimeout(() => {
          controller.abort();
          console.warn("SimpleAuthProvider: API请求超时");
        }, 10000); // 10秒超时

        // 向后端请求当前登录用户
        const res = await fetch("/api/auth/me", {
          credentials: "include",
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        const json = await res.json();
        console.log("SimpleAuthProvider: API响应", {
          status: res.status,
          authenticated: json.authenticated,
          hasUser: !!json.user,
        });

        if (res.ok && json.authenticated && json.user) {
          console.log("SimpleAuthProvider: 用户已认证", json.user.username);
          setUser(json.user as SecureUser);
        } else {
          console.log("SimpleAuthProvider: 用户未认证");
          setUser(null);
        }
      } catch (e) {
        if (e instanceof Error && e.name === "AbortError") {
          console.warn("SimpleAuthProvider: API请求被取消（超时）");
        } else {
          console.warn("SimpleAuthProvider: API调用失败:", e);
        }
        setUser(null);
      } finally {
        console.log("SimpleAuthProvider: 初始化完成");
        setIsLoading(false);
      }
    };

    initAuth();
  }, []);

  const login = async (
    username: string,
    password: string
  ): Promise<{ success: boolean; isAdmin: boolean; error?: string }> => {
    try {
      // Delegate admin/secure checks to server API
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const json = await res.json();
      if (res.ok && json.success && json.user) {
        // 会话由后端 Cookie 维护，这里只存到内存
        setUser(json.user as SecureUser);
        return { success: true, isAdmin: !!json.user.is_admin };
      }

      // 如果服务端校验失败，直接按失败处理（不在前端做密码校验）
      return {
        success: false,
        isAdmin: false,
        error: json?.error || "用户名或密码错误",
      };
    } catch (error) {
      console.error("Login error:", error);
      return { success: false, isAdmin: false, error: "登录失败" };
    }
  };

  const register = async (
    username: string,
    password: string,
    invitationCode: string
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      // 通过 API 路由进行注册，确保与服务端认证系统一致
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password, invitationCode }),
      });

      const json = await res.json();

      if (res.ok && json.success) {
        return { success: true };
      }

      return { success: false, error: json?.error || "注册失败" };
    } catch (error) {
      console.error("Registration error:", error);
      return { success: false, error: "注册过程中发生错误" };
    }
  };

  const logout = async () => {
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
      });
    } catch {}
    setUser(null);

    toast({
      title: "退出成功",
      description: "您已安全退出登录，正在跳转到登录页面...",
    });

    setTimeout(() => {
      router.push("/login");
    }, 800);
  };

  // 不再使用本地存储的“伪会话”
  const setSession = (_userData: SecureUser) => {
    setUser(_userData);
  };

  const getUserById = async (id: string): Promise<User | null> => {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", id)
      .single();
    return error ? null : data;
  };

  const getAllUsers = async (): Promise<User[]> => {
    const { data, error } = await supabase.from("profiles").select("*");
    return error ? [] : data;
  };

  const getDownline = async (userId: string): Promise<User[]> => {
    try {
      if (!isSupabaseEnabled) {
        // 开发环境回退：无 Supabase 时返回 mock 下级
        return [
          {
            id: "mock1",
            username: "下级一",
            nickname: "下级一",
            email: "mock1@local",
            inviter_id: userId,
            is_admin: false,
            is_test_user: true,
            is_frozen: false,
            invitation_code: "MOCK1",
            created_at: new Date().toISOString(),
            credit_score: 100,
          } as any,
          {
            id: "mock2",
            username: "下级二",
            nickname: "下级二",
            email: "mock2@local",
            inviter_id: userId,
            is_admin: false,
            is_test_user: true,
            is_frozen: false,
            invitation_code: "MOCK2",
            created_at: new Date().toISOString(),
            credit_score: 100,
          } as any,
        ];
      }
      const { data, error } = await supabase.rpc("get_downline", {
        p_user_id: userId,
      });
      return error ? [] : data;
    } catch {
      return [];
    }
  };

  const updateUser = async (
    userId: string,
    updates: Partial<User>
  ): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from("profiles")
        .update(updates)
        .eq("id", userId);

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
    throw new Error("useSimpleAuth must be used within a SimpleAuthProvider");
  }
  return context;
}
