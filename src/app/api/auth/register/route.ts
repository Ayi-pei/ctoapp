import { NextResponse } from "next/server";
import {
  simpleUnifiedAuth,
  generateAdminInvitationCode,
  signSession,
  getDefaultCookieOptions,
  sessionCookieName,
} from "@/lib/auth/simple-unified-auth";
import { unifiedAuth } from "@/lib/auth/unified-auth";
import bcrypt from "bcrypt";

// 验证邀请码是否为管理员邀请码
export function isAdminInvitationCode(invitationCode: string): boolean {
  const ADMIN_AUTH = process.env.ADMIN_AUTH;
  if (!ADMIN_AUTH) return false;

  // 生成基于ADMIN_AUTH的6位邀请码
  const adminInvitationCode = generateAdminInvitationCode(ADMIN_AUTH);

  console.log("isAdminInvitationCode: 验证邀请码", {
    provided: invitationCode,
    expected: adminInvitationCode,
    isMatch: invitationCode === adminInvitationCode,
  });

  return invitationCode === adminInvitationCode;
}

export async function POST(request: Request) {
  try {
    const { username, password, invitationCode } = await request.json();

    if (!username || !password || !invitationCode) {
      return NextResponse.json(
        { success: false, error: "Missing required fields" },
        { status: 400 }
      );
    }

    // 检查邀请码是否为管理员邀请码
    if (isAdminInvitationCode(invitationCode)) {
      console.log("注册: 使用管理员邀请码注册");

      // 对于管理员邀请码，我们创建一个普通用户（不是管理员）
      const ADMIN_AUTH = process.env.ADMIN_AUTH;

      if (!ADMIN_AUTH) {
        return NextResponse.json(
          { success: false, error: "Server configuration error" },
          { status: 500 }
        );
      }

      // 生成用户邀请码
      const userInvitationCode = Math.random()
        .toString(36)
        .substring(2, 8)
        .toUpperCase();

      // 创建会话token
      // 使用用户名作为ID，这在实际应用中应该使用更安全的唯一ID
      const token = signSession(username);

      // 返回成功响应并设置认证cookie
      const response = NextResponse.json({
        success: true,
        user: {
          id: username,
          username: username,
          nickname: username,
          email: `${username}@coinsr.app`,
          inviter_id: "admin_local_fixed",
          is_admin: false,
          is_test_user: true,
          is_frozen: false,
          invitation_code: userInvitationCode,
          created_at: new Date().toISOString(),
          credit_score: 100,
        },
        message: "账户注册成功",
      });

      response.cookies.set(sessionCookieName, token, getDefaultCookieOptions());
      return response;
    }

    // 对于非管理员邀请码，返回错误（因为我们没有数据库支持）
    return NextResponse.json(
      { success: false, error: "邀请码无效" },
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
