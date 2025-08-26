import { NextResponse } from "next/server";

// Coindesk API 不支持批量 symbols，需循环请求
const SUPPORTED_PAIRS = [
  "BTC/USDT",
  "ETH/USDT",
  "SOL/USDT",
  "XRP/USDT",
  "LTC/USDT",
  "BNB/USDT",
  "MATIC/USDT",
  "DOGE/USDT",
  "ADA/USDT",
  "SHIB/USDT",
  "AVAX/USDT",
  "LINK/USDT",
  "DOT/USDT",
  "UNI/USDT",
  "TRX/USDT",
  "XLM/USDT",
  "VET/USDT",
  "EOS/USDT",
  "FIL/USDT",
  "ICP/USDT",
];

// 映射币种到 Coindesk API symbol（如有不同需调整）
const PAIR_TO_SYMBOL: Record<string, string> = {
  "BTC/USDT": "BTC",
  "ETH/USDT": "ETH",
  "SOL/USDT": "SOL",
  "XRP/USDT": "XRP",
  "LTC/USDT": "LTC",
  "BNB/USDT": "BNB",
  "MATIC/USDT": "MATIC",
  "DOGE/USDT": "DOGE",
  "ADA/USDT": "ADA",
  "SHIB/USDT": "SHIB",
  "AVAX/USDT": "AVAX",
  "LINK/USDT": "LINK",
  "DOT/USDT": "DOT",
  "UNI/USDT": "UNI",
  "TRX/USDT": "TRX",
  "XLM/USDT": "XLM",
  "VET/USDT": "VET",
  "EOS/USDT": "EOS",
  "FIL/USDT": "FIL",
  "ICP/USDT": "ICP",
};

export async function GET(req: Request) {
  const apiKey = process.env.COINDESK_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "Missing COINDESK_API_KEY" },
      { status: 500 }
    );
  }
  try {
    const url = new URL(req.url);
    const instruments = url.searchParams.get("instruments") || "BTC/USDT";
    const pairs = instruments
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    const results = [];
    for (const pair of pairs) {
      const symbol = PAIR_TO_SYMBOL[pair] || pair.split("/")[0];
      // 这里假设 Coindesk API 单币种行情接口如下（请根据官方文档调整）
      const apiUrl = `https://api.coindesk.com/v1/bpi/currentprice/${symbol}.json`;
      try {
        const response = await fetch(apiUrl, {
          headers: { Authorization: `Bearer ${apiKey}` },
        });
        if (!response.ok) {
          results.push({
            symbol: pair,
            error: `Coindesk API error: ${response.status}`,
          });
          continue;
        }
        const raw = await response.json();
        // 兼容 Coindesk 响应结构
        const price = raw?.bpi?.USD?.rate_float || null;
        const timestamp = raw?.time?.updatedISO || Date.now();
        results.push({
          symbol: pair,
          price,
          timestamp,
          source: "coindesk",
        });
      } catch (err) {
        results.push({ symbol: pair, error: String(err) });
      }
    }
    return NextResponse.json({ data: results });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
