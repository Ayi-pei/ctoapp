import { type NextRequest, NextResponse } from "next/server";
import {
  getCurrentSession,
  simpleUnifiedAuth,
} from "@/lib/auth/simple-unified-auth";
import { supabase } from "@/lib/supabaseClient";

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

    // 调用数据库函数执行签到
    const { data, error } = await supabase.rpc("perform_daily_check_in");

    if (error) {
      console.error("Database function call failed:", error);
      return new NextResponse(
        JSON.stringify({
          error: "签到失败，请稍后再试。",
          debug: error.message || "Unknown database error",
        }),
        { status: 500 }
      );
    }

    if (!data.success) {
      return new NextResponse(
        JSON.stringify({
          error: data.error,
          debug: "Check-in logic failed",
        }),
        {
          status: 400,
        }
      );
    }

    // 签到成功，为用户增加余额
    // 直接使用备用方法更新余额表，不依赖可能不存在的函数
    try {
      // 先检查用户是否已有USDT余额记录
      const { data: balanceData, error: balanceQueryError } = await supabase
        .from("balances")
        .select("available_balance")
        .eq("user_id", session.userId)
        .eq("asset", "USDT")
        .single();

      if (balanceQueryError && balanceQueryError.code !== "PGRST116") {
        // PGRST116是"Results contain 0 rows"错误，这是正常的
        throw new Error(
          `Failed to query balance: ${balanceQueryError.message}`
        );
      }

      if (balanceData) {
        // 用户已有USDT余额记录，更新它
        const { error: updateError } = await supabase
          .from("balances")
          .update({
            available_balance: balanceData.available_balance + data.reward,
            updated_at: new Date(),
          })
          .eq("user_id", session.userId)
          .eq("asset", "USDT");

        if (updateError)
          throw new Error(`Failed to update balance: ${updateError.message}`);
      } else {
        // 用户没有USDT余额记录，创建新记录
        const { error: insertError } = await supabase.from("balances").insert({
          user_id: session.userId,
          asset: "USDT",
          available_balance: data.reward,
          frozen_balance: 0,
        });

        if (insertError)
          throw new Error(`Failed to insert balance: ${insertError.message}`);
      }

      // 记录交易日志
      const { error: logError } = await supabase.from("transactions").insert({
        user_id: session.userId,
        type: "adjustment",
        asset: "USDT",
        amount: data.reward,
        status: "completed",
        created_at: new Date(),
      });

      if (logError)
        throw new Error(`Failed to log transaction: ${logError.message}`);

      // 成功更新余额
      console.log("Successfully credited user balance");
    } catch (balanceError: any) {
      console.error("Failed to credit user balance:", balanceError);
      // 即使余额增加失败，签到本身已经成功
      return NextResponse.json({
        success: true,
        message: "签到成功，但奖励发放失败，请联系客服。",
        reward: data.reward,
        streak_day: data.streak_day,
        debug:
          "Balance crediting failed: " +
          (balanceError.message || "Unknown error"),
      });
    }

    return NextResponse.json({
      success: true,
      message: "签到成功",
      reward: data.reward,
      streak_day: data.streak_day,
    });
  } catch (e: any) {
    console.error("An unexpected error occurred in /api/rewards/check-in:", e);
    return new NextResponse(
      JSON.stringify({
        error: "一个意外的错误发生了，请稍后再试。",
        debug: e.message || "Unknown error",
      }),
      { status: 500 }
    );
  }
}
