import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// CoinGecko ID 映射（可补充/自动化扩展）
const COINGECKO_ID_MAP: Record<string, string> = {
  BTC: "bitcoin",
  ETH: "ethereum",
  SOL: "solana",
  XRP: "ripple",
  LTC: "litecoin",
  BNB: "binancecoin",
  MATIC: "matic-network",
  DOGE: "dogecoin",
  ADA: "cardano",
  SHIB: "shiba-inu",
  AVAX: "avalanche-2",
  LINK: "chainlink",
  DOT: "polkadot",
  UNI: "uniswap",
  TRX: "tron",
  XLM: "stellar",
  VET: "vechain",
  EOS: "eos",
  FIL: "filecoin",
  ICP: "internet-computer",
};

// Coindesk 支持的 symbol
const COINDESK_SYMBOLS = ["BTC", "ETH"]; // 可扩展

export default async function handler() {
  try {
    // 1. 查询所有激活的资产
    const { data: assets, error } = await supabase
      .from("supported_assets")
      .select("asset, is_active, asset_type")
      .eq("is_active", true);
    if (error) throw error;
    // 2. 生成 PAIRS、PAIR_TO_ID、PAIR_TO_SYMBOL
    const PAIRS: string[] = [];
    const PAIR_TO_ID: Record<string, string> = {};
    const PAIR_TO_SYMBOL: Record<string, string> = {};
    for (const asset of assets) {
      if (asset.asset_type === "crypto") {
        const pair = `${asset.asset}/USDT`;
        PAIRS.push(pair);
        PAIR_TO_ID[pair] =
          COINGECKO_ID_MAP[asset.asset] || asset.asset.toLowerCase();
        PAIR_TO_SYMBOL[pair] = COINDESK_SYMBOLS.includes(asset.asset)
          ? asset.asset
          : "";
      }
      // 可扩展法币、其他类型
    }
    // 3. 返回自动生成的配置
    return new Response(JSON.stringify({ PAIRS, PAIR_TO_ID, PAIR_TO_SYMBOL }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
    });
  }
}
