
import { useEffect, useRef, useState } from "react";

type TradeRaw = { price: number; quantity: number; time: number };

export default function useTrades() {
  const [tradesMap, setTradesMap] = useState<Record<string, TradeRaw>>({});
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    // This function initializes the WebSocket connection.
    const initWS = () => {
      
      const url = "wss://stream.binance.com:9443/ws";
      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log("✅ Connected to Binance WS:", url);
        // After connecting, send a subscription message.
        ws.send(JSON.stringify({
          method: "SUBSCRIBE",
          params: ["btcusdt@aggTrade"],
          id: 1
        }));
      };

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          
          // Check for subscription confirmation or actual trade data.
          if (message.result === null && message.id === 1) {
            console.log("✅ Subscription to btcusdt@aggTrade successful");
            return;
          }
          
          // Now, the trade data is the entire message object.
          if (message.e === "aggTrade" && message.p && message.q) {
            const streamName = message.s.toLowerCase() + "@aggtrade";
            
            setTradesMap((prev) => ({
              ...prev,
              [streamName]: {
                price: parseFloat(message.p),
                quantity: parseFloat(message.q),
                time: message.T,
              },
            }));
          }
        } catch (err) {
          console.error("WS message parse error:", err);
        }
      };

      ws.onerror = (event) => {
        console.error("❌ A WebSocket error occurred. Type: ", event.type);
      };

      ws.onclose = (event) => {
        console.warn("⚠️ WS connection closed", event.code, event.reason);
        if (wsRef.current === ws) {
            wsRef.current = null;
        }
        setTimeout(initWS, 3000);
      };
    };

    if (!wsRef.current) {
        initWS();
    }

    return () => {
      if (wsRef.current) {
        wsRef.current.onclose = null; 
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, []); 

  return tradesMap;
}
