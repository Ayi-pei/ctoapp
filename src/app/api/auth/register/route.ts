import { NextResponse } from "next/server";
import { unifiedAuth } from "@/lib/auth/unified-auth";

export async function POST(request: Request) {
  try {
    const { username, password, invitationCode } = await request.json();

    if (!username || !password || !invitationCode) {
      return NextResponse.json(
        { success: false, error: "Missing required fields" },
        { status: 400 }
      );
    }

    // 使用统一认证系统注册
    const result = await unifiedAuth.registerUser(
      username,
      password,
      invitationCode
    );

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: "Registration successful",
      });
    }

    // 错误处理
    let errorMessage = "注册失败";
    switch (result.error) {
      case "username_exists":
        errorMessage = "用户名已存在";
        break;
      case "invalid_code":
        errorMessage = "邀请码无效";
        break;
      case "database_error":
        errorMessage = "数据库错误";
        break;
      case "internal_error":
        errorMessage = "系统内部错误";
        break;
      default:
        errorMessage = result.error || "注册失败";
    }

    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 400 }
    );
  } catch (error) {
    console.error("Register API error:", error);
    return NextResponse.json(
      { success: false, error: "服务器内部错误" },
      { status: 500 }
    );
  }
}
