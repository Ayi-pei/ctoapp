import { type NextRequest, NextResponse } from "next/server";
import {
  getCurrentSession,
  simpleUnifiedAuth,
} from "@/lib/auth/simple-unified-auth";

export const dynamic = "force-dynamic";

// POST handler to perform a daily check-in
export async function POST(request: NextRequest) {
  try {
    // 使用自定义认证系统验证会话
    const session = await getCurrentSession();

    if (!session.valid || !session.userId) {
      return new NextResponse(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
      });
    }

    // 获取用户信息
    const user = await simpleUnifiedAuth.getUser(session.userId);
    if (!user) {
      return new NextResponse(JSON.stringify({ error: "User not found" }), {
        status: 401,
      });
    }

    // TODO: 实现签到逻辑
    // 目前返回模拟成功响应
    return NextResponse.json({
      message: "签到成功",
      reward: 0.5,
      streak: 1,
    });
  } catch (e: any) {
    console.error("An unexpected error occurred in /api/rewards/check-in:", e);
    return new NextResponse(
      JSON.stringify({ error: "一个意外的错误发生了，请稍后再试。" }),
      { status: 500 }
    );
  }
}
