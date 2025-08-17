
"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { availablePairs, TradeRaw } from "@/types";

type TradeInfo = {
    price: number;
    quantity: number;
    timestamp: number;
};
type TradesMap = Record<string, TradeInfo>;

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
        // For multi-stream, the stream name is in `stream`, data is in `data`
        const streamData = message.data;
        const streamName = message.stream;
        
        if (streamData && streamData.s && streamData.p && streamData.q && streamData.T) {
            const pairName = availablePairs.find(p => `${p.replace('/', '').toLowerCase()}@aggTrade` === streamName);
            if (pairName) {
                 const newTrade: TradeInfo = {
                    price: parseFloat(streamData.p),
                    quantity: parseFloat(streamData.q),
                    timestamp: streamData.T,
                };

                setTradesMap(prev => ({
                    ...prev,
                    [pairName]: newTrade,
                }));
            }
        }
      } catch (err) {
        console.error("WS message parse error:", err);
      }
    };

    ws.onerror = (err) => {
        console.error("❌ WS error:", err);
    };

    ws.onclose = () => {
      if (wsRef.current) {
        console.warn("⚠️ WS connection closed unexpectedly. Reconnecting...");
        setTimeout(connect, 5000); 
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
