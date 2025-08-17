
import { useEffect, useRef, useState } from "react";

type TradeRaw = { price: number; quantity: number; time: number };

export default function useTrades() {
  const [tradesMap, setTradesMap] = useState<Record<string, TradeRaw>>({});
  const wsRef = useRef<WebSocket | null>(null);
  const streamName = "btcusdt@trade";

  useEffect(() => {
    // This check prevents the effect from running twice in development's Strict Mode,
    // which can cause the "closed before established" error.
    if (wsRef.current) {
      return;
    }
    
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
      console.warn("⚠️ WS connection closed", {
        code: event.code,
        reason: event.reason,
        wasClean: event.wasClean,
      });
      wsRef.current = null; // Clear the ref on close
    };

    ws.onerror = (event) => {
      console.error("❌ WS error:", event);
      wsRef.current = null; // Also clear on error
    };

    // The cleanup function will now properly close the connection
    // only when the component unmounts.
    return () => {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.close();
      }
      wsRef.current = null;
    };
  }, []); // The empty dependency array is correct, ensuring this runs only once.

  return tradesMap;
}
