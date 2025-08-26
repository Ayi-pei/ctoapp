import { NextResponse } from "next/server";

// 支持 GET 批量币种行情查询，标准化返回结构
export async function GET(req: Request) {
  const apiKey = process.env.COINGECKO_API_KEY;
  try {
    const url = new URL(req.url);
    // instruments 参数如 BTC,ETH,SOL
    const instruments = url.searchParams.get("instruments") || "bitcoin";
    // CoinGecko markets API 支持逗号分隔的 ids
    // 需将 BTC/USDT 转为 CoinGecko id（如 bitcoin, ethereum...）
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
    const pairs = instruments
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    const ids = pairs
      .map((pair) => PAIR_TO_ID[pair] || pair.toLowerCase())
      .join(",");
    // markets API: https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=bitcoin,ethereum
    const apiUrl = `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=${ids}`;
    const headers: Record<string, string> = {};
    if (apiKey) headers["Authorization"] = `Bearer ${apiKey}`;
    const response = await fetch(apiUrl, { headers });
    if (!response.ok) {
      return NextResponse.json(
        { error: "CoinGecko API error", status: response.status },
        { status: 502 }
      );
    }
    const raw = await response.json();
    // 标准化返回结构
    const result = Array.isArray(raw)
      ? raw.map((item) => ({
          symbol: item.symbol?.toUpperCase() || item.id,
          price: item.current_price || null,
          timestamp: item.last_updated || Date.now(),
          source: "coingecko",
        }))
      : [];
    return NextResponse.json({ data: result });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function POST(req: Request) {
  // 解析请求体
  const body = await req.json();
  // 示例：代理请求到 Coingecko API
  const apiKey = process.env.COINGECKO_API_KEY;
  const response = await fetch(
    `https://api.coingecko.com/api/v3/coins/markets?...`,
    { headers: { Authorization: `Bearer ${apiKey}` } }
  );
  const data = await response.json();
  return NextResponse.json(data);
}
