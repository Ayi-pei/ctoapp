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
function standardizeResponse(rawData: any[], idToPairMap: Record<string, string>) {
  if (!Array.isArray(rawData)) return [];

  return rawData.map((item) => ({
    symbol: idToPairMap[item.id] || item.symbol?.toUpperCase(),
    price: item.current_price || null,
    timestamp: item.last_updated ? new Date(item.last_updated).toISOString() : new Date().toISOString(),
    source: "coingecko",
  }));
}

// Supports GET requests for batch currency data.
export async function GET(req: Request) {
  const apiKey = process.env.COINGECKO_API_KEY;
  try {
    const url = new URL(req.url);
    const instruments = url.searchParams.get("instruments") || "BTC/USDT";
    const pairs = instruments.split(",").map((s: string) => s.trim()).filter(Boolean);
    
    const idToPairMap: Record<string, string> = {};
    const ids = pairs.map((pair) => {
        const id = PAIR_TO_ID[pair] || pair.toLowerCase();
        idToPairMap[id] = pair; // Map id back to the original pair
        return id;
    }).join(",");

    let apiUrl = `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=${ids}`;
    if (apiKey) {
      apiUrl += `&x_cg_demo_api_key=${apiKey}`;
    }

    const response = await fetch(apiUrl);
    if (!response.ok) {
        const errorBody = await response.json().catch(() => ({ message: 'Failed to parse error body' }));
        console.error("CoinGecko API Error:", response.status, errorBody);
        return NextResponse.json({ error: `CoinGecko API error: ${response.status}`, details: errorBody }, { status: 502 });
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
    try {
      // Try to parse the body, but don't fail if it's empty or not JSON
      body = await req.json();
    } catch (e) {
      // Ignore JSON parsing errors
    }

    let pairs: string[] = [];
    // 1. Check body for various supported formats
    if (Array.isArray(body.pairs)) {
      pairs = body.pairs;
    } else if (body.pair) {
      pairs = [body.pair];
    } else if (typeof body.instruments === 'string') {
      pairs = body.instruments.split(',').map((s: string) => s.trim()).filter(Boolean);
    }

    // 2. If no pairs found in body, check URL search parameters
    if (pairs.length === 0) {
      const instruments = url.searchParams.get("instruments");
      if (instruments) {
        pairs = instruments.split(',').map((s: string) => s.trim()).filter(Boolean);
      }
    }

    if (pairs.length === 0) {
        return NextResponse.json({ error: "Missing 'pairs' or 'instruments' in request body or query string" }, { status: 400 });
    }

    const idToPairMap: Record<string, string> = {};
    const ids = pairs.map((pair) => {
        const id = PAIR_TO_ID[pair] || pair.toLowerCase();
        idToPairMap[id] = pair; // Map id back to the original pair
        return id;
    }).join(",");

    let apiUrl = `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=${ids}`;
    if (apiKey) {
        apiUrl += `&x_cg_demo_api_key=${apiKey}`;
    }

    const response = await fetch(apiUrl);
    if (!response.ok) {
        const errorBody = await response.json().catch(() => ({ message: 'Failed to parse error body' }));
        console.error("CoinGecko API Error:", response.status, errorBody);
        return NextResponse.json({ error: `CoinGecko API error: ${response.status}`, details: errorBody }, { status: 502 });
    }

    const data = await response.json();
    const result = standardizeResponse(data, idToPairMap);

    return NextResponse.json({ data: result });
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
