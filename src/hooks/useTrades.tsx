import { useEffect, useRef, useState } from "react";

/**
 * Supported streams based on project's cryptocurrencies (paired with USDT)
 */
const STREAMS = [
  "btcusdt@trade",
  "ethusdt@trade",
  "solusdt@trade",
  "xrpusdt@trade",
  "ltcusdt@trade",
  "bnbusdt@trade",
  "maticusdt@trade",
  "dogeusdt@trade",
  "adausdt@trade",
  "shibusdt@trade",
  "avaxusdt@trade",
  "linkusdt@trade",
  "dotusdt@trade",
  "uniusdt@trade",
  "trxusdt@trade",
  "xlmusdt@trade",
  "vetusdt@trade",
  "eosusdt@trade",
  "filusdt@trade",
  "icpusdt@trade",
];

type TradeRaw = { price: number; quantity: number; time: number };
type OHLC = { open: number; high: number; low: number; close: number; time: number };

export default function useTrades(intervalMs = 5000, maxCandles = 50) {
  const [tradesMap, setTradesMap] = useState<Record<string, TradeRaw>>({});
  const [klineData, setKlineData] = useState<Record<string, OHLC[]>>({});
  const tempOHLCs = useRef<Record<string, OHLC | null>>({});
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    // Initialize temp map
    STREAMS.forEach(s => (tempOHLCs.current[s] = null));

    const ws = new WebSocket(`wss://stream.binance.com:9443/ws/${STREAMS.join("/")}`);
    wsRef.current = ws;

    ws.onmessage = (event) => {
      try {
        const { s: symbol, p: priceStr, q: qtyStr, T: time } = JSON.parse(event.data);
        const stream = `${symbol.toLowerCase()}@trade`;

        const price = parseFloat(priceStr);
        const qty = parseFloat(qtyStr);
        
        // Update raw tradesMap (for real-time price list)
        setTradesMap(prev => ({ ...prev, [stream]: { price, quantity: qty, time } }));

        // Update temporary OHLC for the current interval window
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
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setKlineData(prev => {
        const next = { ...prev };
        STREAMS.forEach(stream => {
          const tmp = tempOHLCs.current[stream];
          if (tmp) {
            const arr = next[stream] ? [...next[stream]] : [];
            arr.push({ ...tmp }); // push a copy
            if (arr.length > maxCandles) arr.splice(0, arr.length - maxCandles);
            next[stream] = arr;
            tempOHLCs.current[stream] = null;
          }
        });
        return next;
      });
    }, intervalMs);

    return () => clearInterval(timer);
  }, [intervalMs, maxCandles]);


  return {
    tradesMap,
    klineData,
  };
}
