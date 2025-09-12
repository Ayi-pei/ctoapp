import { NextResponse } from "next/server";

export async function GET() {
  try {
    // 检查关键环境变量的配置状态（不暴露实际值）
    const envCheck = {
      SESSION_SECRET: !!process.env.SESSION_SECRET,
      SUPABASE_URL: !!process.env.SUPABASE_URL,
      SUPABASE_SERVICE_ROLE_KEY: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      COINGECKO_API_KEY: !!process.env.COINGECKO_API_KEY,
      NODE_ENV: process.env.NODE_ENV,
      ADMIN_NAME: !!process.env.ADMIN_NAME,
      ADMIN_KEY: !!process.env.ADMIN_KEY,
      ADMIN_AUTH: !!process.env.ADMIN_AUTH,
    };

    // 检查必要的配置
    const missingConfig = Object.entries(envCheck)
      .filter(([key, value]) => !value && key !== "COINGECKO_API_KEY") // CoinGecko API密钥是可选的
      .map(([key]) => key);

    const status = missingConfig.length === 0 ? "healthy" : "warning";

    return NextResponse.json({
      status,
      timestamp: new Date().toISOString(),
      environment: {
        ...envCheck,
        missingConfig: missingConfig.length > 0 ? missingConfig : undefined,
      },
      services: {
        database:
          envCheck.SUPABASE_URL && envCheck.SUPABASE_SERVICE_ROLE_KEY
            ? "configured"
            : "not_configured",
        authentication: envCheck.SESSION_SECRET
          ? "configured"
          : "not_configured",
        external_api: envCheck.COINGECKO_API_KEY
          ? "configured"
          : "using_free_tier",
      },
    });
  } catch (error) {
    console.error("Health check error:", error);
    return NextResponse.json(
      {
        status: "error",
        timestamp: new Date().toISOString(),
        error: "Health check failed",
      },
      { status: 500 }
    );
  }
}
