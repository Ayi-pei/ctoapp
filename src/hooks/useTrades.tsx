
"use client";

import { useEffect, useState, useRef } from "react";

export default function useTrades() {
  const [tradesMap, setTradesMap] = useState<Record<string, any>>({});
  const wsRef = useRef<WebSocket | null>(null);
  const isUnmounting = useRef(false);

  useEffect(() => {
    // If a connection already exists, do nothing.
    if (wsRef.current) {
        return;
    }
    isUnmounting.current = false;

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
      if (isUnmounting.current) {
        console.log("WebSocket connection closed intentionally on component unmount.");
        return;
      }
      if (!ev.wasClean) {
          console.warn("⚠️ WS connection closed unexpectedly", ev);
      }
    };

    return () => {
      isUnmounting.current = true;
      if (wsRef.current) {
        wsRef.current.close(1000, "Component unmounted");
        wsRef.current = null;
        console.log("WebSocket connection closed on component cleanup.");
      }
    };
  }, []);

  return tradesMap;
}
