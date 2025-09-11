import { NextResponse } from "next/server";
import {
  unifiedAuth,
  signSession,
  getDefaultCookieOptions,
  sessionCookieName,
} from "@/lib/auth/unified-auth";

export async function POST(request: Request) {
  try {
    const { username, password, invitationCode } = await request.json();

    if (!username || !password || !invitationCode) {
      return NextResponse.json(
        { success: false, error: "Missing fields" },
        { status: 400 }
      );
    }

    const result = await unifiedAuth.registerUser(
      username,
      password,
      invitationCode
    );

    if (result.success) {
      if (result.user) {
        // 注册成功后自动创建会话
        const token = signSession(result.user.id);
        const response = NextResponse.json({
          success: true,
          user: result.user,
        });
        response.cookies.set(
          sessionCookieName,
          token,
          getDefaultCookieOptions()
        );
        return response;
      }
      return NextResponse.json({ success: true });
    } else {
      const statusCode = result.error === "username_exists" ? 409 : 400;
      return NextResponse.json(
        { success: false, error: result.error },
        { status: statusCode }
      );
    }
  } catch (error) {
    console.error("Register API error:", error);
    return NextResponse.json(
      { success: false, error: "internal_error" },
      { status: 500 }
    );
  }
}
