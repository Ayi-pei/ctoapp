

"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { availablePairs, TradeRaw } from "@/types";

type TradesMap = Record<string, TradeRaw[]>;
const MAX_TRADES_PER_SYMBOL = 50;

export default function useTrades() {
  const [tradesMap, setTradesMap] = useState<TradesMap>({});
  const wsRef = useRef<WebSocket | null>(null);

  const connect = useCallback(() => {
    // If a connection already exists or is connecting, do nothing.
    if (wsRef.current && wsRef.current.readyState < 2) {
        return;
    }

    const streams = availablePairs.map(p => `${p.replace('/', '').toLowerCase()}@aggTrade`).join('/');
    const ws = new WebSocket(`wss://stream.binance.com:9443/ws/${streams}`);
    wsRef.current = ws;

    ws.onopen = () => {
        console.log(`✅ WS connected to aggregate trade streams.`);
    };

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        const streamName = message.s; // Stream name is in 's' for multi-stream
        
        if (streamName && message.p && message.q && message.T) {
            const newTrade: TradeRaw = {
                stream: streamName,
                price: parseFloat(message.p),
                quantity: parseFloat(message.q),
                timestamp: message.T,
            };

            setTradesMap(prev => {
                const existingTrades = prev[streamName] || [];
                const updatedTrades = [...existingTrades, newTrade];
                // Keep only the last N trades
                if (updatedTrades.length > MAX_TRADES_PER_SYMBOL) {
                    updatedTrades.shift(); 
                }
                return {
                    ...prev,
                    [streamName]: updatedTrades,
                };
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
      // Only log if the closure was unexpected (i.e., not initiated by the cleanup function)
      if (wsRef.current) {
        console.warn("⚠️ WS connection closed unexpectedly", ev.code, ev.reason);
        // Optional: Implement reconnect logic here
        // setTimeout(connect, 5000); // Reconnect after 5 seconds
      }
    };
  }, []);

  useEffect(() => {
    connect();

    return () => {
      if (wsRef.current) {
        console.log("WebSocket connection closed intentionally on component unmount.");
        const wsToClose = wsRef.current;
        wsRef.current = null; // Mark as intentionally closed
        wsToClose.close();
      }
    };
  }, [connect]);


  return tradesMap;
}
