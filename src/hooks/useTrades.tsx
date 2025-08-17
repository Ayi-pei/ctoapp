
"use client";

import { useEffect, useState, useRef } from "react";

export default function useTrades() {
  const [tradesMap, setTradesMap] = useState<Record<string, any>>({});
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    // If a connection already exists, do nothing.
    // This prevents the effect from creating a new connection on every re-render in Strict Mode.
    if (wsRef.current) {
        return;
    }

    const ws = new WebSocket(
      `wss://stream.binance.com:9443/ws/!aggTrade@arr`
    );
    wsRef.current = ws;

    ws.onopen = () => {
        console.log(`✅ WS connected to aggregate trade stream.`);
    };

    ws.onmessage = (event) => {
      try {
        const trades = JSON.parse(event.data);
        if (Array.isArray(trades)) {
          setTradesMap(prev => {
              const newMap = { ...prev };
              trades.forEach(trade => {
                  const streamName = `${trade.s.toLowerCase()}@aggtrade`;
                  newMap[streamName] = { 
                      price: parseFloat(trade.p), 
                      quantity: parseFloat(trade.q), 
                      time: trade.T 
                  };
              });
              return newMap;
          });
        }
      } catch (err) {
        console.error("WS message parse error:", err);
      }
    };

    ws.onerror = (err) => {
        console.error("❌ WS error:", err);
    };

    ws.onclose = (ev) => {
      // We only log the closure, but we don't attempt to reconnect here.
      // The useEffect cleanup and setup will handle creating a new connection if needed.
      if (!ev.wasClean) {
          console.warn("⚠️ WS connection closed unexpectedly", ev);
      }
    };

    // The cleanup function, called when the component unmounts or before the effect re-runs.
    return () => {
      if (wsRef.current) {
        wsRef.current.close(1000, "Component unmounted");
        wsRef.current = null; // Ensure the ref is cleared on cleanup.
        console.log("WebSocket connection closed on component cleanup.");
      }
    };
  }, []); // Empty dependency array ensures this runs only on mount and unmount.

  return tradesMap;
}
