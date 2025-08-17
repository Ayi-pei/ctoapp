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

export default function useTrades() {
  const [tradesMap, setTradesMap] = useState<Record<string, TradeRaw>>({});
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    const url = `wss://stream.binance.com:9443/stream?streams=${STREAMS.join("/")}`;
    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log("✅ Connected to Binance WS:", url);
    };

    ws.onmessage = (event) => {
      try {
        const { stream, data } = JSON.parse(event.data);
        setTradesMap((prev) => ({
          ...prev,
          [stream]: {
            price: parseFloat(data.p),
            quantity: parseFloat(data.q),
            time: data.T,
          },
        }));
      } catch (e) {
        console.warn("ws parse error", e);
      }
    };
    
    ws.onclose = (event) => {
      console.warn("⚠️ WS closed:", event.code, event.reason);
    };

    ws.onerror = (event) => {
      console.error("❌ WS error event:", event);
    };

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  return tradesMap;
}
