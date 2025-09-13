import { NextResponse } from "next/server";
import {
  getCurrentSession,
  simpleUnifiedAuth,
} from "@/lib/auth/simple-unified-auth";

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

    const user = await simpleUnifiedAuth.getUser(session.userId);
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
