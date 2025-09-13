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

    // TODO: 如果需要支持普通用户登录，可以在这里添加
    // const userResult = await simpleUnifiedAuth.userLogin(username, password);

    // 登录失败
    return NextResponse.json(
      {
        success: false,
        error: adminResult.error || "Invalid username or password",
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
