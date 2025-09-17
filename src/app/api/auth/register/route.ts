import { NextResponse } from "next/server";
import {
  simpleUnifiedAuth,
  generateAdminInvitationCode,
} from "@/lib/auth/simple-unified-auth";
import { unifiedAuth } from "@/lib/auth/unified-auth";

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
      // 管理员邀请码有效，可以继续注册
      // TODO: 这里可以添加实际的用户创建逻辑
      // 目前只返回成功，后续可以扩展完整的注册流程
      return NextResponse.json({
        success: true,
        message: "注册成功（使用管理员邀请码）",
      });
    }

    // 使用统一认证系统注册（针对其他邀请码）
    // 注意：这里可能需要更新为使用 simple-unified-auth
    // 目前保持对现有代码的兼容性
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
