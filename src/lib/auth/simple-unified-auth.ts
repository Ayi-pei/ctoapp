import jwt from "jsonwebtoken";
import { cookies } from "next/headers";
import type { User } from "@/types";

// 环境变量配置
const SESSION_SECRET = process.env.SESSION_SECRET!;
const SESSION_TTL = parseInt(process.env.SESSION_TTL || "86400", 10);

// 管理员配置
const ADMIN_NAME = process.env.ADMIN_NAME || "admin";
const ADMIN_KEY = process.env.ADMIN_KEY || "admin123";
const ADMIN_AUTH = process.env.ADMIN_AUTH || "ADMIN8888";

// Cookie 配置
export const sessionCookieName = "auth-token";

export const getDefaultCookieOptions = () => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  maxAge: SESSION_TTL,
  path: "/",
});

// JWT 会话管理
export const signSession = (userId: string): string => {
  return jwt.sign({ userId }, SESSION_SECRET, { expiresIn: SESSION_TTL });
};

export const verifySession = (
  token?: string
): { valid: boolean; userId?: string } => {
  if (!token) {
    console.log("verifySession: token 为空");
    return { valid: false };
  }

  try {
    console.log("verifySession: 尝试验证 JWT token, 长度:", token.length);
    const decoded = jwt.verify(token, SESSION_SECRET) as { userId: string };
    console.log("verifySession: JWT 验证成功, userId:", decoded.userId);
    return { valid: true, userId: decoded.userId };
  } catch (error) {
    console.log(
      "verifySession: JWT 验证失败:",
      error instanceof Error ? error.message : error
    );
    return { valid: false };
  }
};

// 获取当前用户会话
export const getCurrentSession = async (): Promise<{
  valid: boolean;
  userId?: string;
  error?: string;
}> => {
  try {
    // 检查必要的环境变量
    if (!SESSION_SECRET) {
      console.error("SESSION_SECRET is not configured");
      return { valid: false, error: "Server configuration error" };
    }

    const cookieStore = await cookies();
    const token = cookieStore.get(sessionCookieName)?.value;

    console.log("getCurrentSession: 检查会话", {
      hasToken: !!token,
      cookieName: sessionCookieName,
      tokenLength: token?.length || 0,
    });

    if (!token) {
      console.log("getCurrentSession: 未找到会话token");
      return { valid: false, error: "No session token found" };
    }

    const sessionResult = verifySession(token);
    console.log("getCurrentSession: 会话验证结果", {
      valid: sessionResult.valid,
      userId: sessionResult.userId,
    });

    if (!sessionResult.valid) {
      console.log("getCurrentSession: 会话token无效");
      return { valid: false, error: "Invalid session token" };
    }

    console.log("getCurrentSession: 会话验证成功");
    return { valid: true, userId: sessionResult.userId };
  } catch (error) {
    console.error("getCurrentSession error:", error);
    return { valid: false, error: "Session verification failed" };
  }
};

// 简化的认证类 - 只处理管理员验证
export class SimpleUnifiedAuth {
  // 管理员直接登录 - 避免 Supabase RLS 问题
  async adminLogin(
    username: string,
    password: string
  ): Promise<{ success: boolean; user?: User; error?: string }> {
    if (username === ADMIN_NAME && password === ADMIN_KEY) {
      // 使用固定的管理员用户，避免数据库操作
      const adminUser: User = {
        id: "admin_local_fixed", // 使用固定 ID
        username: ADMIN_NAME,
        nickname: "Administrator",
        email: `${ADMIN_NAME}@coinsr.app`,
        inviter_id: null,
        is_admin: true,
        is_test_user: false,
        is_frozen: false,
        invitation_code: ADMIN_AUTH,
        created_at: new Date().toISOString(),
        credit_score: 999,
      };

      console.log("adminLogin: 使用本地管理员验证", {
        username: adminUser.username,
        id: adminUser.id,
      });

      return { success: true, user: adminUser };
    }

    return { success: false, error: "Invalid admin credentials" };
  }

  // 获取用户信息 - 简化版
  async getUser(userId: string): Promise<User | null> {
    console.log("getUser: 开始查找用户", { userId });

    // 如果是管理员的固定ID，直接返回管理员用户
    if (userId === "admin_local_fixed") {
      const adminUser: User = {
        id: "admin_local_fixed",
        username: ADMIN_NAME,
        nickname: "Administrator",
        email: `${ADMIN_NAME}@coinsr.app`,
        inviter_id: null,
        is_admin: true,
        is_test_user: false,
        is_frozen: false,
        invitation_code: ADMIN_AUTH,
        created_at: new Date().toISOString(),
        credit_score: 999,
      };

      console.log("getUser: 返回管理员用户信息", {
        username: adminUser.username,
      });
      return adminUser;
    }

    console.log("getUser: 用户ID不是管理员，返回null");
    return null;
  }
}

// 单例实例
export const simpleUnifiedAuth = new SimpleUnifiedAuth();
