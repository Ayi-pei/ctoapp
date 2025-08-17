
"use client";

import { useEffect, useState, useRef } from "react";
import { availablePairs } from "@/types";

const streams = availablePairs.map(p => `${p.replace('/', '').toLowerCase()}@trade`);

export default function useTrades() {
  const [tradesMap, setTradesMap] = useState<Record<string, any>>({});
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    const initWS = () => {
      // Prevent creating a new WebSocket if one already exists or is connecting
      if (wsRef.current && wsRef.current.readyState < 2) { // 0=CONNECTING, 1=OPEN
          console.log("WebSocket connection already exists or is connecting.");
          return;
      }
      
      const ws = new WebSocket(
        `wss://stream.binance.com:9443/stream?streams=${streams.join("/")}`
      );
      wsRef.current = ws;

      ws.onopen = () => {
          console.log(`✅ WS connected to ${streams.length} streams.`);
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.data && msg.stream) {
            const { stream, data } = msg;
            // The state update is lightweight, so it's fine to do it this often.
            // The heavy UI updates will be throttled in the context.
            setTradesMap(prev => ({
              ...prev,
              [stream]: { price: parseFloat(data.p), quantity: parseFloat(data.q), time: data.T }
            }));
          }
        } catch (err) {
          console.error("WS message parse error:", err);
        }
      };

      ws.onerror = (err) => {
          console.error("❌ WS error:", err);
      };

      ws.onclose = (ev) => {
        console.warn("⚠️ WS connection closed", ev);
        // Only try to reconnect if the closure was unexpected.
        if (ev.code !== 1000) { 
           setTimeout(initWS, 3000); // Attempt to reconnect after 3 seconds
        }
      };
    };

    initWS();

    // The cleanup function, called when the component unmounts.
    return () => {
      if (wsRef.current) {
        // Set a custom flag to prevent auto-reconnection on manual close.
        (wsRef.current as any).isClosedByCleanup = true;
        wsRef.current.close(1000, "Component unmounted");
        wsRef.current = null;
        console.log("WebSocket connection closed on component cleanup.");
      }
    };
  }, []); // Empty dependency array ensures this runs only once on mount.

  return tradesMap;
}
