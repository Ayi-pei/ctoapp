import { NextResponse } from "next/server";

const API_KEY = process.env.ALPHA_VANTAGE_API_KEY;

// 简单的内存缓存来避免频繁请求
const cache: Record<string, { data: any; timestamp: number }> = {};

/**
 * Next.js API Route: /api/alpha-vantage
 *
 * This route acts as a server-side proxy to the Alpha Vantage API.
 * It's designed to securely handle requests for various functions like
 * historical options data, currency exchange rates, etc.
 */
export async function GET(request: Request) {
  if (!API_KEY) {
    return NextResponse.json(
      { error: "Alpha Vantage API key is not configured." },
      { status: 500 }
    );
  }

  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get("symbol");
  const func = searchParams.get("function") || "HISTORICAL_OPTIONS";
  const date = searchParams.get("date");

  if (!symbol) {
    return NextResponse.json(
      { error: "Symbol parameter is required." },
      { status: 400 }
    );
  }

  if (func === "HISTORICAL_OPTIONS" && !date) {
    return NextResponse.json(
      { error: "Date parameter is required for HISTORICAL_OPTIONS." },
      { status: 400 }
    );
  }

  // 创建缓存键
  const cacheKey = `${func}-${symbol}-${date || ""}`;

  // 检查缓存（5分钟内有效）
  const now = Date.now();
  if (cache[cacheKey] && now - cache[cacheKey].timestamp < 5 * 60 * 1000) {
    console.log(`Returning cached data for ${cacheKey}`);
    return NextResponse.json(cache[cacheKey].data);
  }

  try {
    const params: Record<string, string> = {
      function: func,
      symbol: symbol,
      apikey: API_KEY,
    };
    if (date) {
      params.date = date;
    }

    const queryParams = new URLSearchParams(params);
    const url = `https://www.alphavantage.co/query?${queryParams.toString()}`;

    const response = await fetch(url, {
      method: "GET",
      headers: {
        "User-Agent": "request",
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({
        error:
          "Failed to fetch from Alpha Vantage and could not parse error response.",
      }));
      console.error("Alpha Vantage API proxy error:", errorData);
      return NextResponse.json(
        { error: "Failed to fetch from Alpha Vantage", details: errorData },
        { status: response.status }
      );
    }

    const data = await response.json();

    if (data["Error Message"]) {
      // Handle cases where the API returns a structured error message
      return NextResponse.json(
        { error: data["Error Message"] },
        { status: 400 }
      );
    }

    if (data["Information"]) {
      // Handle cases where the API returns information (like rate limits)
      // 返回 429 状态码并包含错误信息
      return NextResponse.json({ error: data["Information"] }, { status: 429 });
    }

    // 缓存成功的响应
    cache[cacheKey] = {
      data,
      timestamp: now,
    };

    return NextResponse.json(data);
  } catch (error) {
    console.error("Alpha Vantage API proxy error (unknown):", error);
    return NextResponse.json(
      { error: "An internal server error occurred" },
      { status: 500 }
    );
  }
}
