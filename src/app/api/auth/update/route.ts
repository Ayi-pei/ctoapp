import { NextResponse } from "next/server";
import {
  getCurrentSession,
  unifiedAuth,
  signSession,
  getDefaultCookieOptions,
  sessionCookieName,
} from "@/lib/auth/unified-auth";

export async function POST(request: Request) {
  try {
    const session = await getCurrentSession();

    if (!session.valid || !session.userId) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { userId: targetUserId, updates } = body;

    if (!targetUserId || !updates || typeof updates !== "object") {
      return NextResponse.json(
        { success: false, error: "Invalid input" },
        { status: 400 }
      );
    }

    const result = await unifiedAuth.updateUser(
      targetUserId,
      updates,
      session.userId
    );

    if (result.success) {
      // 如果用户更新自己的信息且返回了新的用户数据，创建新的会话令牌
      if (session.userId === targetUserId && result.user) {
        const newToken = signSession(result.user.id);
        const response = NextResponse.json({
          success: true,
          user: result.user,
        });
        response.cookies.set(
          sessionCookieName,
          newToken,
          getDefaultCookieOptions()
        );
        return response;
      }

      return NextResponse.json({ success: true });
    } else {
      const statusCode = result.error === "Forbidden" ? 403 : 500;
      return NextResponse.json(
        { success: false, error: result.error },
        { status: statusCode }
      );
    }
  } catch (error) {
    console.error("Update user API error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
