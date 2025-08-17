import { useEffect, useState, useRef } from "react";
import type { TradeRaw } from "@/types";
import { availablePairs } from "@/types";

const streams = availablePairs
  .filter(p => !p.includes('/USD')) // Assuming USDT is the main quote currency for streams
  .map(p => `${p.replace('/', '').toLowerCase()}@trade`);


export default function useTrades() {
  const [tradesMap, setTradesMap] = useState<Record<string, TradeRaw>>({});
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    const initWS = () => {
      // Prevent duplicate connections
      if (wsRef.current && wsRef.current.readyState < 2) { // 0: CONNECTING, 1: OPEN
        return;
      }

      const ws = new WebSocket(
        `wss://stream.binance.com:9443/stream?streams=${streams.join("/")}`
      );
      wsRef.current = ws;

      ws.onopen = () => {
        console.log("✅ Connected to Binance Aggregate Stream");
      };

      ws.onmessage = (event) => {
        try {
          const { stream, data } = JSON.parse(event.data);
          if (stream && data) {
            setTradesMap((prev) => ({
              ...prev,
              [stream]: {
                price: parseFloat(data.p),
                quantity: parseFloat(data.q),
                time: data.T,
              },
            }));
          }
        } catch (error) {
          console.error("Error parsing WebSocket message:", error);
        }
      };

      ws.onerror = (err) => {
        console.error("❌ WS error:", err);
      };

      ws.onclose = (ev) => {
        console.warn("⚠️ WS connection closed", ev.code, ev.reason);
        // Don't auto-reconnect in dev to avoid spamming, but this is where you'd add it.
        // setTimeout(initWS, 5000); 
      };
    };

    initWS();

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  return tradesMap;
}
