import { NextResponse } from "next/server";
import {
  simpleUnifiedAuth,
  signSession,
  getDefaultCookieOptions,
  sessionCookieName,
} from "@/lib/auth/simple-unified-auth";

export async function POST(request: Request) {
  try {
    const { username, password } = await request.json();

    if (!username || !password) {
      return NextResponse.json(
        { success: false, error: "Missing username or password" },
        { status: 400 }
      );
    }

    // 首先尝试管理员登录
    const adminResult = await simpleUnifiedAuth.adminLogin(username, password);
    if (adminResult.success && adminResult.user) {
      const token = signSession(adminResult.user.id);
      const response = NextResponse.json({
        success: true,
        user: adminResult.user,
      });
      response.cookies.set(sessionCookieName, token, getDefaultCookieOptions());
      return response;
    }

    // 对于普通用户登录，我们暂时使用简单的验证
    // 在实际应用中，这里应该查询数据库验证用户
    if (username === "testuser1" && password === "testpassword1") {
      const user = {
        id: username,
        username: username,
        nickname: "Test User",
        email: `${username}@coinsr.app`,
        inviter_id: "admin_local_fixed",
        is_admin: false,
        is_test_user: true,
        is_frozen: false,
        invitation_code: "TEST01",
        created_at: new Date().toISOString(),
        credit_score: 100,
      };

      const token = signSession(user.id);
      const response = NextResponse.json({
        success: true,
        user: user,
      });
      response.cookies.set(sessionCookieName, token, getDefaultCookieOptions());
      return response;
    }

    // 登录失败
    return NextResponse.json(
      {
        success: false,
        error: "Invalid username or password",
      },
      { status: 401 }
    );
  } catch (error) {
    console.error("Login API error:", error);
    const errorMessage =
      error instanceof Error
        ? error.message
        : "An internal server error occurred";
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}
