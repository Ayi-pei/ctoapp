
import { useEffect, useRef, useState } from "react";

/**
 * Supported streams (add or remove as needed)
 */
const STREAMS = [
  "btcusdt@trade",
  "ethusdt@trade",
  "solusdt@trade",
  // ... can add more here
];

type TradeRaw = { price: number; quantity: number; time: number };

export default function useTrades() {
  const [tradesMap, setTradesMap] = useState<Record<string, TradeRaw>>({});
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    // Prevent creating a new WebSocket if one already exists.
    if (wsRef.current) {
        return;
    }
    
    const initWS = () => {
      const ws = new WebSocket(`wss://stream.binance.com:9443/stream?streams=${STREAMS.join("/")}`);
      wsRef.current = ws;

      ws.onopen = () => console.log("✅ WS connected");

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.data && msg.stream) {
            const { stream, data } = msg;
            setTradesMap(prev => ({
              ...prev,
              [stream]: { price: parseFloat(data.p), quantity: parseFloat(data.q), time: data.T }
            }));
          }
        } catch (err) {
          console.error("WS message parse error:", err);
        }
      };

      ws.onerror = (err) => console.error("❌ WS error:", err);

      ws.onclose = (ev) => {
        console.warn("⚠️ WS connection closed", ev);
        wsRef.current = null; // Clear the ref to allow re-initialization
        // Automatic reconnection
        setTimeout(initWS, 1000); 
      };
    };

    initWS();

    // Cleanup on component unmount
    return () => {
      if (wsRef.current) {
        // Prevent reconnection attempts on unmount
        wsRef.current.onclose = null; 
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, []); // Empty dependency array ensures this runs only once on mount

  return tradesMap;
}
