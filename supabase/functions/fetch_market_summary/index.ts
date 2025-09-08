import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const PAIRS = [
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

export async function GET() {
  try {
    // CoinGecko 批量行情
    const ids = PAIRS.map((p) => PAIR_TO_ID[p]).join(",");
    const cgRes = await fetch(
      `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=${ids}`
    );
    const cgJson = await cgRes.json();
    // Coindesk 循环行情
    const coindeskResults: any[] = [];
    for (const pair of PAIRS) {
      const symbol = PAIR_TO_SYMBOL[pair];
      try {
        const cdRes = await fetch(
          `https://api.coindesk.com/v1/bpi/currentprice/${symbol}.json`
        );
        if (cdRes.ok) {
          const raw = await cdRes.json();
          coindeskResults.push({
            pair,
            price: raw?.bpi?.USD?.rate_float || null,
            source: "coindesk",
            updated_at: raw?.time?.updatedISO || new Date().toISOString(),
          });
        }
      } catch {}
    }
    // 合并结果，优先用 CoinGecko，补充 Coindesk
    const upserts = PAIRS.map((pair) => {
      const cg = cgJson.find((item: any) => item.id === PAIR_TO_ID[pair]);
      const cd = coindeskResults.find((item: any) => item.pair === pair);
      return {
        pair,
        price: cg?.current_price ?? cd?.price ?? null,
        change: cg?.price_change_percentage_24h ?? 0,
        volume: cg?.total_volume ?? 0,
        high: cg?.high_24h ?? null,
        low: cg?.low_24h ?? null,
        source: cg ? "coingecko" : cd ? "coindesk" : null,
        updated_at:
          cg?.last_updated ?? cd?.updated_at ?? new Date().toISOString(),
      };
    });
    // upsert 到 market_summary_data
    const { error } = await supabase
      .from("market_summary_data")
      .upsert(upserts, { onConflict: "pair" });
    if (error) throw error;
    return new Response(JSON.stringify({ ok: true, count: upserts.length }), {
      status: 200,
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
    });
  }
}
