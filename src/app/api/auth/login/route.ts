import { NextResponse } from "next/server";
import {
  unifiedAuth,
  signSession,
  getDefaultCookieOptions,
  sessionCookieName,
} from "@/lib/auth/unified-auth";

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
    const adminResult = await unifiedAuth.adminLogin(username, password);
    if (adminResult.success && adminResult.user) {
      const token = signSession(adminResult.user.id);
      const response = NextResponse.json({
        success: true,
        user: adminResult.user,
      });
      response.cookies.set(sessionCookieName, token, getDefaultCookieOptions());
      return response;
    }

    // 尝试普通用户登录
    const userResult = await unifiedAuth.userLogin(username, password);
    if (userResult.success && userResult.user) {
      const token = signSession(userResult.user.id);
      const response = NextResponse.json({
        success: true,
        user: userResult.user,
      });
      response.cookies.set(sessionCookieName, token, getDefaultCookieOptions());
      return response;
    }

    // 登录失败
    return NextResponse.json(
      {
        success: false,
        error: userResult.error || "Invalid username or password",
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
