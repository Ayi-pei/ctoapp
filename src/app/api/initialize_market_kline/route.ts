import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// 查询干预规则
async function getIntervention(pair: string, time: number) {
  const { data, error } = await supabase
    .from("market_interventions")
    .select("rule,start_time,end_time")
    .eq("trading_pair", pair)
    .lte("start_time", new Date(time).toISOString())
    .gte("end_time", new Date(time).toISOString())
    .order("priority", { ascending: false })
    .limit(1);
  
  if (error) {
    console.error(`Error fetching intervention for ${pair}:`, error);
    return null;
  }

  return data?.[0]?.rule || null;
}

// 生成 4 小时（240 根 1m K线）模拟数据并批量插入，自动应用干预
async function generateKlines(pair: string, basePrice: number) {
  const klines = [];
  let price = basePrice;
  for (let i = 0; i < 240; i++) {
    price = price * (1 + (Math.random() - 0.5) * 0.01); // ±0.5% 波动
    const open = price * (0.99 + Math.random() * 0.02);
    const high = price * (1.0 + Math.random() * 0.02);
    const low = price * (0.98 + Math.random() * 0.02);
    const close = price;
    const volume = 100 + Math.random() * 50;
    const time = Date.now() - (240 - i) * 60 * 1000; // 过去 240 分钟
    let finalOpen = open,
      finalHigh = high,
      finalLow = low,
      finalClose = close,
      finalVolume = volume,
      isIntervened = false;
    // 查找并应用干预规则
    const rule = await getIntervention(pair, time);
    if (rule) {
      isIntervened = true;
      if (rule.forceValue) {
        finalOpen = finalHigh = finalLow = finalClose = rule.forceValue;
      } else {
        if (rule.priceMultiplier) {
          finalOpen *= rule.priceMultiplier;
          finalHigh *= rule.priceMultiplier;
          finalLow *= rule.priceMultiplier;
          finalClose *= rule.priceMultiplier;
        }
        if (rule.priceOffset) {
          finalOpen += rule.priceOffset;
          finalHigh += rule.priceOffset;
          finalLow += rule.priceOffset;
          finalClose += rule.priceOffset;
        }
        if (rule.volumeMultiplier) {
          finalVolume *= rule.volumeMultiplier;
        }
      }
    }
    klines.push({
      trading_pair: pair,
      time,
      open: finalOpen,
      high: finalHigh,
      low: finalLow,
      close: finalClose,
      volume: finalVolume,
      is_intervened: isIntervened,
      created_at: new Date(time).toISOString(),
    });
  }
  return klines;
}

export async function POST(req: Request) {
  try {
    const { pair, pairs } = await req.json();
    const targetPairs = pairs || (pair ? [pair] : []);
    if (!targetPairs.length) {
      return NextResponse.json({ error: "Missing pairs" }, { status: 400 });
    }
    const results = [];
    for (const p of targetPairs) {
      // 获取最新价格
      const { data: summary, error: summaryError } = await supabase
        .from("market_summary_data")
        .select("price")
        .eq("pair", p)
        .single();
      if (summaryError || !summary) {
        results.push({ pair: p, error: "No base price found" });
        continue;
      }
      const klines = await generateKlines(p, Number(summary.price));
      // 批量插入
      const { error: insertError } = await supabase
        .from("market_kline_data")
        .insert(klines);
      if (insertError) {
        results.push({ pair: p, error: insertError.message });
      } else {
        results.push({ pair: p, ok: true, count: klines.length });
      }
    }
    return NextResponse.json({ results });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
