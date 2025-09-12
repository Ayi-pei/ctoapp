import { createClient } from "@supabase/supabase-js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";
import type { User } from "@/types";

// 环境变量配置
const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
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

// 创建 Supabase 客户端
const createSupabaseClient = () => {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.warn("Supabase environment variables not configured:", {
      hasUrl: !!SUPABASE_URL,
      hasServiceKey: !!SUPABASE_SERVICE_ROLE_KEY,
    });
    return null;
  }

  try {
    return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  } catch (error) {
    console.error("Failed to create Supabase client:", error);
    return null;
  }
};

// JWT 会话管理
export const signSession = (userId: string): string => {
  return jwt.sign({ userId }, SESSION_SECRET, { expiresIn: SESSION_TTL });
};

export const verifySession = (
  token?: string
): { valid: boolean; userId?: string } => {
  if (!token) return { valid: false };

  try {
    const decoded = jwt.verify(token, SESSION_SECRET) as { userId: string };
    return { valid: true, userId: decoded.userId };
  } catch {
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

    if (!token) {
      return { valid: false, error: "No session token found" };
    }

    const sessionResult = verifySession(token);
    if (!sessionResult.valid) {
      return { valid: false, error: "Invalid session token" };
    }

    return { valid: true, userId: sessionResult.userId };
  } catch (error) {
    console.error("getCurrentSession error:", error);
    return { valid: false, error: "Session verification failed" };
  }
};

// 统一认证类
export class UnifiedAuth {
  private supabase;

  constructor() {
    this.supabase = createSupabaseClient();
  }

  // 管理员直接登录
  async adminLogin(
    username: string,
    password: string
  ): Promise<{ success: boolean; user?: User; error?: string }> {
    if (username === ADMIN_NAME && password === ADMIN_KEY) {
      // 如果没有 Supabase，允许本地管理员登录
      if (!this.supabase) {
        const adminUser: User = {
          id: "admin_local",
          username: ADMIN_NAME,
          nickname: "Administrator",
          email: "admin@local",
          inviter_id: null,
          is_admin: true,
          is_test_user: false,
          is_frozen: false,
          invitation_code: ADMIN_AUTH,
          created_at: new Date().toISOString(),
          credit_score: 999,
        };
        return { success: true, user: adminUser };
      }

      // 如果有 Supabase，检查管理员配置
      try {
        const { data: adminProfile } = await this.supabase
          .from("profiles")
          .select("*")
          .eq("username", ADMIN_NAME)
          .single();

        if (!adminProfile) {
          // 创建管理员档案
          const adminId = crypto.randomUUID();
          const passwordHash = await bcrypt.hash(password, 10);

          await this.supabase.from("profiles").insert({
            id: adminId,
            username: ADMIN_NAME,
            nickname: "Administrator",
            email: `${ADMIN_NAME}@coinsr.app`,
            password_hash: passwordHash,
            invitation_code: ADMIN_AUTH,
            is_admin: true,
            is_test_user: false,
            is_frozen: false,
            credit_score: 999,
            created_at: new Date().toISOString(),
          });

          const newUser: User = {
            id: adminId,
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

          return { success: true, user: newUser };
        }

        const safeAdminUser: User = {
          id: adminProfile.id,
          username: adminProfile.username,
          nickname: adminProfile.nickname || "Administrator",
          email: adminProfile.email,
          inviter_id: adminProfile.inviter_id,
          is_admin: true,
          is_test_user: !!adminProfile.is_test_user,
          is_frozen: !!adminProfile.is_frozen,
          invitation_code: adminProfile.invitation_code,
          created_at: adminProfile.created_at,
          credit_score: adminProfile.credit_score ?? 999,
        };

        return { success: true, user: safeAdminUser };
      } catch (error) {
        console.error("Admin login error:", error);
        return { success: false, error: "Admin configuration error" };
      }
    }

    return { success: false, error: "Invalid admin credentials" };
  }

  // 普通用户登录
  async userLogin(
    username: string,
    password: string
  ): Promise<{ success: boolean; user?: User; error?: string }> {
    if (!this.supabase) {
      return { success: false, error: "Database not configured" };
    }

    try {
      const { data: userProfile, error } = await this.supabase
        .from("profiles")
        .select(
          "id, username, nickname, email, inviter_id, is_admin, is_test_user, is_frozen, invitation_code, created_at, credit_score, password_hash"
        )
        .eq("username", username)
        .single();

      if (error || !userProfile || userProfile.is_frozen) {
        return { success: false, error: "Invalid username or password" };
      }

      if (!userProfile.password_hash) {
        return {
          success: false,
          error: "Account not configured for password login",
        };
      }

      const passwordOk = await bcrypt.compare(
        password,
        userProfile.password_hash
      );
      if (!passwordOk) {
        return { success: false, error: "Invalid username or password" };
      }

      // 更新最后登录时间
      await this.supabase
        .from("profiles")
        .update({ last_login_at: new Date().toISOString() })
        .eq("id", userProfile.id);

      const safeUser: User = {
        id: userProfile.id,
        username: userProfile.username,
        nickname: userProfile.nickname,
        email: userProfile.email,
        inviter_id: userProfile.inviter_id,
        is_admin: userProfile.is_admin,
        is_test_user: userProfile.is_test_user,
        is_frozen: userProfile.is_frozen,
        invitation_code: userProfile.invitation_code,
        created_at: userProfile.created_at,
        credit_score: userProfile.credit_score,
      };

      return { success: true, user: safeUser };
    } catch (error) {
      console.error("User login error:", error);
      return { success: false, error: "Internal server error" };
    }
  }

  // 用户注册
  async registerUser(
    username: string,
    password: string,
    invitationCode: string
  ): Promise<{ success: boolean; user?: User; error?: string }> {
    if (!this.supabase) {
      // 开发环境回退
      if (invitationCode === ADMIN_AUTH) {
        return { success: true };
      }
      return { success: false, error: "invalid_code" };
    }

    try {
      // 检查用户名是否已存在
      const { data: existingUser } = await this.supabase
        .from("profiles")
        .select("id")
        .eq("username", username)
        .single();

      if (existingUser) {
        return { success: false, error: "username_exists" };
      }

      // 验证邀请码
      let inviter: { id: string } | null = null;

      // 先从数据库查找
      const { data: inviterDb } = await this.supabase
        .from("profiles")
        .select("id")
        .eq("invitation_code", invitationCode)
        .single();

      if (inviterDb) {
        inviter = inviterDb;
      } else if (invitationCode === ADMIN_AUTH) {
        // 匹配管理员邀请码
        const { data: adminProfile } = await this.supabase
          .from("profiles")
          .select("id")
          .eq("username", ADMIN_NAME)
          .single();

        if (adminProfile) {
          inviter = adminProfile;
        } else {
          // 创建管理员记录
          const adminId = crypto.randomUUID();
          const adminPasswordHash = await bcrypt.hash(ADMIN_KEY, 10);

          await this.supabase.from("profiles").insert({
            id: adminId,
            username: ADMIN_NAME,
            nickname: "Administrator",
            email: `${ADMIN_NAME}@coinsr.app`,
            password_hash: adminPasswordHash,
            invitation_code: ADMIN_AUTH,
            is_admin: true,
            is_test_user: false,
            is_frozen: false,
            credit_score: 999,
            created_at: new Date().toISOString(),
          });

          inviter = { id: adminId };
        }
      }

      if (!inviter) {
        return { success: false, error: "invalid_code" };
      }

      // 创建新用户
      const userId = crypto.randomUUID();
      const passwordHash = await bcrypt.hash(password, 10);
      const newInvitationCode = Math.random()
        .toString(36)
        .substring(2, 8)
        .toUpperCase();

      const newUserProfileData = {
        id: userId,
        username,
        nickname: username,
        email: null,
        inviter_id: inviter.id,
        invitation_code: newInvitationCode,
        password_hash: passwordHash,
        is_admin: false,
        is_test_user: true,
        credit_score: 95,
        avatar_url: `https://api.dicebear.com/8.x/initials/svg?seed=${username}`,
        created_at: new Date().toISOString(),
      };

      const { data: createdUser, error: createError } = await this.supabase
        .from("profiles")
        .insert(newUserProfileData)
        .select(
          "id, username, nickname, email, inviter_id, is_admin, is_test_user, is_frozen, invitation_code, created_at, credit_score"
        )
        .single();

      if (createError || !createdUser) {
        console.error("Create user error:", createError);
        return { success: false, error: "database_error" };
      }

      // 创建初始余额
      await this.supabase.rpc("create_initial_balances", { p_user_id: userId });

      return { success: true, user: createdUser };
    } catch (error) {
      console.error("Register error:", error);
      return { success: false, error: "internal_error" };
    }
  }

  // 获取用户信息
  async getUser(userId: string): Promise<User | null> {
    if (!this.supabase) {
      // 开发环境回退
      return {
        id: userId,
        username: userId === "admin_local" ? "admin" : userId.substring(0, 8),
        nickname: userId === "admin_local" ? "Administrator" : "Local User",
        email: `${userId}@noemail.app`,
        inviter_id: null,
        is_admin: userId === "admin_local",
        is_test_user: true,
        is_frozen: false,
        invitation_code: "LOCAL",
        created_at: new Date().toISOString(),
        credit_score: 100,
      };
    }

    try {
      const { data: profile, error } = await this.supabase
        .from("profiles")
        .select(
          "id, username, nickname, email, inviter_id, is_admin, is_test_user, is_frozen, invitation_code, created_at, credit_score"
        )
        .eq("id", userId)
        .single();

      if (error || !profile) {
        return null;
      }

      return {
        id: profile.id,
        username: profile.username,
        nickname: profile.nickname,
        email: profile.email ?? `${profile.username}@noemail.app`,
        inviter_id: profile.inviter_id,
        is_admin: profile.is_admin,
        is_test_user: profile.is_test_user,
        is_frozen: !!profile.is_frozen,
        invitation_code: profile.invitation_code,
        created_at: profile.created_at,
        credit_score: profile.credit_score,
      };
    } catch (error) {
      console.error("Get user error:", error);
      return null;
    }
  }

  // 更新用户信息
  async updateUser(
    targetUserId: string,
    updates: Partial<User>,
    callerId: string
  ): Promise<{ success: boolean; user?: User; error?: string }> {
    if (!this.supabase) {
      return { success: false, error: "Database not configured" };
    }

    try {
      // 检查调用者权限
      const { data: callerProfile } = await this.supabase
        .from("profiles")
        .select("is_admin")
        .eq("id", callerId)
        .single();

      if (!callerProfile) {
        return { success: false, error: "Caller not found" };
      }

      const isAdmin = callerProfile.is_admin;

      // 权限检查：管理员或用户自己
      if (!isAdmin && callerId !== targetUserId) {
        return { success: false, error: "Forbidden" };
      }

      const allowedFields = ["nickname", "email", "avatar_url"] as const;
      const adminOnlyFields = [
        "is_frozen",
        "is_test_user",
        "credit_score",
        "is_admin",
      ] as const;
      const toUpdate: any = {};

      for (const key in updates) {
        const updateKey = key as keyof Partial<User>;
        if (allowedFields.includes(updateKey as any)) {
          toUpdate[key] = updates[updateKey];
        }
        if (isAdmin && adminOnlyFields.includes(updateKey as any)) {
          toUpdate[key] = updates[updateKey];
        }
      }

      // 密码更新
      if (
        "password" in updates &&
        updates.password &&
        callerId === targetUserId
      ) {
        toUpdate.password_hash = await bcrypt.hash(
          updates.password as string,
          10
        );
      }

      if (Object.keys(toUpdate).length === 0) {
        return { success: false, error: "No updatable fields provided" };
      }

      const { error: updateError } = await this.supabase
        .from("profiles")
        .update(toUpdate)
        .eq("id", targetUserId);

      if (updateError) {
        console.error("Update user error:", updateError);
        return { success: false, error: "Database error" };
      }

      // 如果用户更新自己的信息，返回更新后的用户数据
      if (callerId === targetUserId) {
        const updatedUser = await this.getUser(targetUserId);
        if (updatedUser) {
          return { success: true, user: updatedUser };
        }
      }

      return { success: true };
    } catch (error) {
      console.error("Update user error:", error);
      return { success: false, error: "Internal server error" };
    }
  }
}

// 单例实例
export const unifiedAuth = new UnifiedAuth();
