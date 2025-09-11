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
import type { User } from "@/types";

interface AuthContextType {
  isAuthenticated: boolean;
  user: User | null;
  isAdmin: boolean;
  login: (
    username: string,
    password: string
  ) => Promise<{ success: boolean; error?: string }>;
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
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function UnifiedAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
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
          setUser(data.user);
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
        setUser(data.user);
        return { success: true };
      } else {
        return { success: false, error: data.error || "Login failed" };
      }
    } catch (error) {
      console.error("Login error:", error);
      return { success: false, error: "Network error" };
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
            setUser(data.user);
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
      router.push("/login");
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
          setUser(data.user);
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
