

"use client";

import { useEffect, useState, useRef } from "react";
import { availablePairs } from "@/types";

type Trade = {
  price: number;
  quantity: number;
  time: number;
};

type TradesMap = Record<string, Trade>;

export default function useTrades() {
  const [tradesMap, setTradesMap] = useState<TradesMap>({});
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    // If a connection already exists, do nothing.
    if (wsRef.current) {
        return;
    }

    const streams = availablePairs.map(p => `${p.replace('/', '').toLowerCase()}@aggTrade`).join('/');
    const ws = new WebSocket(
      `wss://stream.binance.com:9443/ws/${streams}`
    );
    wsRef.current = ws;

    ws.onopen = () => {
        console.log(`✅ WS connected to aggregate trade streams.`);
    };

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        const streamName = message.stream;
        const tradeData = message.data;

        if (streamName && tradeData) {
            const newTrade: Trade = {
                price: parseFloat(tradeData.p),
                quantity: parseFloat(tradeData.q),
                time: tradeData.T,
            };
            setTradesMap(prev => ({
                ...prev,
                [streamName]: newTrade,
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
      if (wsRef.current) { // Only log if the closure was unexpected
        console.warn("⚠️ WS connection closed unexpectedly", ev);
      }
    };

    return () => {
      if (wsRef.current) {
        console.log("WebSocket connection closed intentionally on component unmount.");
        wsRef.current.onclose = null; // Prevent the onclose handler from firing on manual close
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, []);

  return tradesMap;
}
