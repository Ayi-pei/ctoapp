import { useEffect, useRef, useState } from "react";

/**
 * 支持的 streams（按需增减）
 */
const STREAMS = [
  "btcusdt@trade",
  "ethusdt@trade",
  "solusdt@trade",
  // ... 可以继续加 20-30 个
];

type TradeRaw = { price: number; quantity: number; time: number };
type OHLC = { open: number; high: number; low: number; close: number; time: number };

export default function useTrades(intervalMs = 5000, maxCandles = 50) {
  const [tradesMap, setTradesMap] = useState<Record<string, TradeRaw>>({});
  const [displayedTrades, setDisplayedTrades] = useState<Record<string, TradeRaw>>({});
  const [klineData, setKlineData] = useState<Record<string, OHLC[]>>({});
  const tempOHLCs = useRef<Record<string, OHLC | null>>({});
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    // 初始化 temp map
    STREAMS.forEach(s => (tempOHLCs.current[s] = null));

    const ws = new WebSocket(`wss://stream.binance.com:9443/stream?streams=${STREAMS.join("/")}`);
    wsRef.current = ws;

    ws.onmessage = (event) => {
      try {
        const { stream, data } = JSON.parse(event.data);
        // data.p = price string, data.q = qty string, data.T = trade time
        const price = parseFloat(data.p);
        const qty = parseFloat(data.q);
        const time = data.T || Date.now();

        // 更新原始 tradesMap（实时）
        setTradesMap(prev => ({ ...prev, [stream]: { price, quantity: qty, time } }));

        // 更新临时 OHLC（在当前 5s 窗口内）
        const tmp = tempOHLCs.current[stream];
        if (!tmp) {
          tempOHLCs.current[stream] = { open: price, high: price, low: price, close: price, time };
        } else {
          tmp.high = Math.max(tmp.high, price);
          tmp.low = Math.min(tmp.low, price);
          tmp.close = price;
          tmp.time = time;
        }
      } catch (e) {
        console.warn("ws parse error", e);
      }
    };

    ws.onopen = () => console.log("Binance WS connected");
    ws.onclose = () => console.log("Binance WS closed");
    ws.onerror = (err) => console.error("Binance WS err", err);

    return () => {
      ws.close();
      wsRef.current = null;
    };
  }, []);

  useEffect(() => {
    // 定时器：每 intervalMs 刷新 displayedTrades，并把 tempOHLC 推到 klineData（生成 candle）
    const timer = setInterval(() => {
      // 1) 刷新显示数据（用于列表）
      setDisplayedTrades(prev => {
        const updated: Record<string, TradeRaw> = {};
        Object.entries(tradesMap).forEach(([stream, t]) => { updated[stream] = t; });
        return updated;
      });

      // 2) 将 tempOHLCs 中已收集的 candle 推到 klineData，清空 temp
      setKlineData(prev => {
        const next = { ...prev };
        STREAMS.forEach(stream => {
          const tmp = tempOHLCs.current[stream];
          if (tmp) {
            const arr = next[stream] ? [...next[stream]] : [];
            arr.push({ ...tmp }); // push a copy
            // 保持最大长度
            if (arr.length > maxCandles) arr.splice(0, arr.length - maxCandles);
            next[stream] = arr;
            // 清空 temp，等待下一周期
            tempOHLCs.current[stream] = null;
          } else {
            // 若本周期没有任何 trade（极少见），可以选择用最后一根的 close 填充
            // 这里我们不填充，保持不产生空 candle
          }
        });
        return next;
      });
    }, intervalMs);

    return () => clearInterval(timer);
  }, [tradesMap, intervalMs, maxCandles]);

  // 交易逻辑（示例：买入）
  // 使用 klineData 中最后一根 candle 的 close 作为成交价（若不存在则用 displayedTrades）
  const buy = (stream: string, amount: number, onSuccess?: (price: number) => void) => {
    const candles = klineData[stream];
    const lastCandle = candles?.length ? candles[candles.length - 1] : null;
    const price = lastCandle?.close ?? displayedTrades[stream]?.price;
    if (!price) return null;
    onSuccess?.(price);
    return price;
  };

  const sell = (stream: string, amount: number, onSuccess?: (price: number) => void) => {
    const candles = klineData[stream];
    const lastCandle = candles?.length ? candles[candles.length - 1] : null;
    const price = lastCandle?.close ?? displayedTrades[stream]?.price;
    if (!price) return null;
    onSuccess?.(price);
    return price;
  };

  return {
    tradesMap,
    displayedTrades,
    klineData,
    buy,
    sell,
  };
}
