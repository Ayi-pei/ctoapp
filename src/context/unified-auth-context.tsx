"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
  useCallback,
} from "react";
import { useRouter } from "next/navigation";
import type { User as UserType, SecureUser } from "@/types";
import { supabase, isSupabaseEnabled } from "@/lib/supabaseClient";
import { toast } from "@/hooks/use-toast";

export type User = UserType;

interface AuthContextType {
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
  ) => Promise<{
    success: boolean;
    error?:
      | "username_exists"
      | "invalid_code"
      | "database_error"
      | "internal_error";
  }>;
  updateUser: (userId: string, updates: Partial<User>) => Promise<boolean>;
  isLoading: boolean;
  checkAuth: () => Promise<void>;
  getUserById: (id: string) => Promise<User | null>;
  getAllUsers: () => Promise<User[]>;
  getDownline: (userId: string) => Promise<User[]>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function UnifiedAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SecureUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  // 检查认证状态
  const checkAuth = useCallback(async () => {
    try {
      const response = await fetch("/api/auth/me", {
        method: "GET",
        credentials: "include", // 包含HttpOnly cookies
      });

      if (response.ok) {
        const data = await response.json();
        if (data.authenticated && data.user) {
          setUser(data.user as SecureUser);
        } else {
          setUser(null);
        }
      } else {
        setUser(null);
      }
    } catch (error) {
      console.error("Auth check error:", error);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // 登录功能
  const login = useCallback(async (username: string, password: string) => {
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (data.success && data.user) {
        setUser(data.user as SecureUser);
        return { success: true, isAdmin: !!data.user.is_admin };
      } else {
        return {
          success: false,
          isAdmin: false,
          error: data.error || "Login failed",
        };
      }
    } catch (error) {
      console.error("Login error:", error);
      return { success: false, isAdmin: false, error: "Network error" };
    }
  }, []);

  // 注册功能
  const register = useCallback(
    async (username: string, password: string, invitationCode: string) => {
      try {
        const response = await fetch("/api/auth/register", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify({ username, password, invitationCode }),
        });

        const data = await response.json();

        if (data.success) {
          // 注册成功后自动登录
          if (data.user) {
            setUser(data.user as SecureUser);
          }
          return { success: true };
        } else {
          return { success: false, error: data.error };
        }
      } catch (error) {
        console.error("Register error:", error);
        return { success: false, error: "internal_error" };
      }
    },
    []
  );

  // 登出功能
  const logout = useCallback(async () => {
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
      });
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      setUser(null);

      toast({
        title: "退出成功",
        description: "您已安全退出登录，正在跳转到登录页面...",
      });

      setTimeout(() => {
        router.push("/login");
      }, 800);
    }
  }, [router]);

  // 更新用户信息
  const updateUser = useCallback(
    async (userId: string, updates: Partial<User>) => {
      try {
        const response = await fetch("/api/auth/update", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify({ userId, updates }),
        });

        const data = await response.json();

        if (data.success && data.user) {
          setUser(data.user as SecureUser);
          return true;
        }
        return false;
      } catch (error) {
        console.error("Update user error:", error);
        return false;
      }
    },
    []
  );

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
          },
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
          },
        ];
      }

      const { data, error } = await supabase.rpc("get_user_downline", {
        user_id: userId,
      });

      if (error) {
        console.error("Error fetching downline:", error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error("Error in getDownline:", error);
      return [];
    }
  };

  // 初始化检查认证状态
  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const contextValue: AuthContextType = {
    isAuthenticated: !!user,
    user,
    isAdmin: user?.is_admin || false,
    login,
    logout,
    register,
    updateUser,
    isLoading,
    checkAuth,
    getUserById,
    getAllUsers,
    getDownline,
  };

  return (
    <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within a UnifiedAuthProvider");
  }
  return context;
}

// 高阶组件：需要认证的页面
export function withAuth<P extends object>(
  WrappedComponent: React.ComponentType<P>
) {
  return function AuthenticatedComponent(props: P) {
    const { isAuthenticated, isLoading } = useAuth();
    const router = useRouter();

    useEffect(() => {
      if (!isLoading && !isAuthenticated) {
        router.push("/login");
      }
    }, [isAuthenticated, isLoading, router]);

    if (isLoading) {
      return (
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      );
    }

    if (!isAuthenticated) {
      return null;
    }

    return <WrappedComponent {...props} />;
  };
}

// 高阶组件：需要管理员权限的页面
export function withAdminAuth<P extends object>(
  WrappedComponent: React.ComponentType<P>
) {
  return function AdminAuthenticatedComponent(props: P) {
    const { isAuthenticated, isAdmin, isLoading } = useAuth();
    const router = useRouter();

    useEffect(() => {
      if (!isLoading) {
        if (!isAuthenticated) {
          router.push("/login");
        } else if (!isAdmin) {
          router.push("/dashboard");
        }
      }
    }, [isAuthenticated, isAdmin, isLoading, router]);

    if (isLoading) {
      return (
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      );
    }

    if (!isAuthenticated || !isAdmin) {
      return null;
    }

    return <WrappedComponent {...props} />;
  };
}
