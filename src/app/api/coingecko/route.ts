import { NextResponse } from "next/server";

// Maps our internal pair format to CoinGecko'''s API `id`.
const PAIR_TO_ID: Record<string, string> = {
  "BTC/USDT": "bitcoin",
  "ETH/USDT": "ethereum",
  "SOL/USDT": "solana",
  "XRP/USDT": "ripple",
  "LTC/USDT": "litecoin",
  "BNB/USDT": "binancecoin",
  "MATIC/USDT": "matic-network",
  "DOGE/USDT": "dogecoin",
  "ADA/USDT": "cardano",
  "SHIB/USDT": "shiba-inu",
  "AVAX/USDT": "avalanche-2",
  "LINK/USDT": "chainlink",
  "DOT/USDT": "polkadot",
  "UNI/USDT": "uniswap",
  "TRX/USDT": "tron",
  "XLM/USDT": "stellar",
  "VET/USDT": "vechain",
  "EOS/USDT": "eos",
  "FIL/USDT": "filecoin",
  "ICP/USDT": "internet-computer",
};

/**
 * Standardize the response from CoinGecko API.
 */
function standardizeResponse(
  rawData: any[],
  idToPairMap: Record<string, string>
) {
  if (!Array.isArray(rawData)) return [];

  return rawData.map((item) => ({
    symbol: idToPairMap[item.id] || item.symbol?.toUpperCase(),
    price: item.current_price || null,
    timestamp: item.last_updated
      ? new Date(item.last_updated).toISOString()
      : new Date().toISOString(),
    source: "coingecko",
  }));
}

// Supports GET requests for batch currency data.
export async function GET(req: Request) {
  const apiKey = process.env.COINGECKO_API_KEY;
  try {
    const url = new URL(req.url);
    const instruments = url.searchParams.get("instruments") || "BTC/USDT";
    const pairs = instruments
      .split(",")
      .map((s: string) => s.trim())
      .filter(Boolean);

    // 验证pairs参数
    const validPairs = pairs.filter((pair) => {
      return (
        typeof pair === "string" &&
        pair.trim().length > 0 &&
        (PAIR_TO_ID[pair] || pair.includes("/"))
      );
    });

    if (validPairs.length === 0) {
      return NextResponse.json(
        {
          error: "No valid trading pairs found",
          supportedPairs: Object.keys(PAIR_TO_ID),
          received: pairs,
        },
        { status: 400 }
      );
    }

    const idToPairMap: Record<string, string> = {};
    const ids = validPairs
      .map((pair) => {
        const id = PAIR_TO_ID[pair] || pair.toLowerCase().replace("/", "");
        idToPairMap[id] = pair; // Map id back to the original pair
        return id;
      })
      .join(",");

    let apiUrl = `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=${ids}&order=market_cap_desc&per_page=100&page=1&sparkline=false`;
    if (apiKey && apiKey.trim()) {
      apiUrl += `&x_cg_demo_api_key=${apiKey}`;
    }

    console.log("CoinGecko API Request:", apiUrl.replace(apiKey || "", "***"));

    const response = await fetch(apiUrl, {
      headers: {
        Accept: "application/json",
        "User-Agent": "CoinSR-App/1.0",
      },
      // 添加超时设置
      signal: AbortSignal.timeout(10000), // 10秒超时
    });
    if (!response.ok) {
      const errorBody = await response
        .json()
        .catch(() => ({ message: "Failed to parse error body" }));
      console.error("CoinGecko API Error:", response.status, errorBody);
      return NextResponse.json(
        {
          error: `CoinGecko API error: ${response.status}`,
          details: errorBody,
        },
        { status: 502 }
      );
    }

    const raw = await response.json();
    const result = standardizeResponse(raw, idToPairMap);

    return NextResponse.json({ data: result });
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

// Supports POST requests for batch currency data.
export async function POST(req: Request) {
  const apiKey = process.env.COINGECKO_API_KEY;
  try {
    const url = new URL(req.url);
    let body: any = {};

    // 更安全的请求体解析
    try {
      const contentType = req.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        const bodyText = await req.text();
        if (bodyText.trim()) {
          body = JSON.parse(bodyText);
        }
      }
    } catch (e) {
      console.warn("Failed to parse request body:", e);
      // 继续使用默认的空对象
    }

    let pairs: string[] = [];

    // 1. 检查请求体中的各种支持格式
    if (Array.isArray(body.pairs)) {
      pairs = body.pairs.filter((p: any) => typeof p === "string" && p.trim());
    } else if (typeof body.pair === "string" && body.pair.trim()) {
      pairs = [body.pair.trim()];
    } else if (
      typeof body.instruments === "string" &&
      body.instruments.trim()
    ) {
      pairs = body.instruments
        .split(",")
        .map((s: string) => s.trim())
        .filter(Boolean);
    }

    // 2. 如果请求体中没有找到参数，检查URL查询参数
    if (pairs.length === 0) {
      const instruments = url.searchParams.get("instruments");
      if (instruments && instruments.trim()) {
        pairs = instruments
          .split(",")
          .map((s: string) => s.trim())
          .filter(Boolean);
      }
    }

    // 3. 如果仍然没有参数，使用默认值
    if (pairs.length === 0) {
      pairs = ["BTC/USDT"]; // 默认使用比特币
      console.warn("No instruments specified, using default: BTC/USDT");
    }

    // 验证并清理pairs参数
    const validPairs = pairs.filter((pair) => {
      return (
        typeof pair === "string" &&
        pair.trim().length > 0 &&
        (PAIR_TO_ID[pair] || pair.includes("/"))
      );
    });

    if (validPairs.length === 0) {
      return NextResponse.json(
        {
          error: "No valid trading pairs found",
          supportedPairs: Object.keys(PAIR_TO_ID),
          received: pairs,
        },
        { status: 400 }
      );
    }

    const idToPairMap: Record<string, string> = {};
    const ids = validPairs
      .map((pair) => {
        const id = PAIR_TO_ID[pair] || pair.toLowerCase().replace("/", "");
        idToPairMap[id] = pair; // Map id back to the original pair
        return id;
      })
      .join(",");

    let apiUrl = `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=${ids}&order=market_cap_desc&per_page=100&page=1&sparkline=false`;
    if (apiKey && apiKey.trim()) {
      apiUrl += `&x_cg_demo_api_key=${apiKey}`;
    }

    console.log("CoinGecko API Request:", apiUrl.replace(apiKey || "", "***"));

    const response = await fetch(apiUrl, {
      headers: {
        Accept: "application/json",
        "User-Agent": "CoinSR-App/1.0",
      },
      // 添加超时设置
      signal: AbortSignal.timeout(10000), // 10秒超时
    });
    if (!response.ok) {
      const errorBody = await response
        .json()
        .catch(() => ({ message: "Failed to parse error body" }));
      console.error("CoinGecko API Error:", response.status, errorBody);
      return NextResponse.json(
        {
          error: `CoinGecko API error: ${response.status}`,
          details: errorBody,
        },
        { status: 502 }
      );
    }

    const data = await response.json();
    const result = standardizeResponse(data, idToPairMap);

    return NextResponse.json({ data: result });
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
