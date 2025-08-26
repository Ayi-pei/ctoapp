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
    const response = await fetch(apiUrl);
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
  try {
    const body = await req.json();
    // 支持批量币种参数，如 { pairs: ["BTC/USDT", "ETH/USDT"] }
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
    const pairs: string[] = Array.isArray(body.pairs)
      ? body.pairs
      : body.pair
      ? [body.pair]
      : ["BTC/USDT"];
    const ids = pairs
      .map((pair: string) => PAIR_TO_ID[pair] || pair.toLowerCase())
      .join(",");
    // 构造正确的 CoinGecko markets API URL
    const apiUrl = `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=${ids}`;
    const response = await fetch(apiUrl);
    if (!response.ok) {
      return NextResponse.json(
        { error: "CoinGecko API error", status: response.status },
        { status: 502 }
      );
    }
    const data = await response.json();
    // 标准化返回结构
    const result = Array.isArray(data)
      ? data.map((item: any) => ({
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
