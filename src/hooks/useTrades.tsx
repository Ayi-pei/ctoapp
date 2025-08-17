import { useEffect, useRef, useState } from "react";

type TradeRaw = { price: number; quantity: number; time: number };

export default function useTrades() {
  const [tradesMap, setTradesMap] = useState<Record<string, TradeRaw>>({});
  const wsRef = useRef<WebSocket | null>(null);
  const streamName = "btcusdt@trade";

  useEffect(() => {
    const url = `wss://stream.binance.com:9443/ws/${streamName}`;
    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log("✅ Connected to Binance WS:", url);
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        // Data from a single stream is not wrapped in a "stream" object
        setTradesMap((prev) => ({
          ...prev,
          [streamName]: {
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
