import { NextResponse } from "next/server";
import {
  getCurrentSession,
  simpleUnifiedAuth,
} from "@/lib/auth/simple-unified-auth";

// 模拟用户存储
const mockUsers: Record<string, any> = {
  admin_local_fixed: {
    id: "admin_local_fixed",
    username: "adminsrf",
    nickname: "Administrator",
    email: "adminsrf@coinsr.app",
    inviter_id: null,
    is_admin: true,
    is_test_user: false,
    is_frozen: false,
    invitation_code: "8R8R8R",
    created_at: new Date().toISOString(),
    credit_score: 999,
  },
  testuser1: {
    id: "testuser1",
    username: "testuser1",
    nickname: "Test User",
    email: "testuser1@coinsr.app",
    inviter_id: "admin_local_fixed",
    is_admin: false,
    is_test_user: true,
    is_frozen: false,
    invitation_code: "TEST01",
    created_at: new Date().toISOString(),
    credit_score: 100,
  },
};

export async function GET() {
  try {
    // 检查环境变量配置
    const sessionSecret = process.env.SESSION_SECRET;
    if (!sessionSecret) {
      console.error("SESSION_SECRET is not configured");
      return NextResponse.json(
        {
          authenticated: false,
          error: "Server configuration error",
        },
        { status: 500 }
      );
    }

    const session = await getCurrentSession();
    console.log(
      "Auth check - session valid:",
      session.valid,
      "userId:",
      session.userId
    );

    if (!session.valid || !session.userId) {
      return NextResponse.json(
        {
          authenticated: false,
          message: "No valid session found",
        },
        { status: 401 }
      );
    }

    // 获取用户信息
    let user = await simpleUnifiedAuth.getUser(session.userId);

    // 如果simpleUnifiedAuth没有找到用户，检查模拟用户存储
    if (!user && mockUsers[session.userId]) {
      user = mockUsers[session.userId];
    }

    // 如果还是没有找到用户，为普通用户创建基本用户对象
    if (!user) {
      // 为普通用户创建基本用户对象
      user = {
        id: session.userId,
        username: session.userId, // 使用userId作为用户名
        nickname: session.userId,
        email: `${session.userId}@coinsr.app`,
        inviter_id: null,
        is_admin: false,
        is_test_user: false,
        is_frozen: false,
        invitation_code: "USER001",
        created_at: new Date().toISOString(),
        credit_score: 100,
      };

      // 将新用户添加到模拟存储中
      mockUsers[session.userId] = user;
    }

    console.log("Auth check - user found:", !!user);

    if (!user) {
      return NextResponse.json(
        {
          authenticated: false,
          message: "User not found",
        },
        { status: 401 }
      );
    }

    return NextResponse.json({
      authenticated: true,
      user: {
        id: user.id,
        username: user.username,
        nickname: user.nickname,
        email: user.email,
        is_admin: user.is_admin,
        is_test_user: user.is_test_user,
        credit_score: user.credit_score,
        invitation_code: user.invitation_code,
      },
    });
  } catch (error) {
    console.error("Auth me error:", error);
    return NextResponse.json(
      {
        authenticated: false,
        error: "Internal server error",
      },
      { status: 500 }
    );
  }
}
