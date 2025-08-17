
import { useEffect, useRef, useState } from "react";

type TradeRaw = { price: number; quantity: number; time: number };

export default function useTrades() {
  const [tradesMap, setTradesMap] = useState<Record<string, TradeRaw>>({});
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    // This function initializes the WebSocket connection.
    const initWS = () => {
      // Use the reliable single stream URL.
      const url = "wss://stream.binance.com:9443/ws/btcusdt@trade";
      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log("✅ Connected to Binance WS:", url);
      };

      ws.onmessage = (event) => {
        try {
          // Data from a single stream is not wrapped in a "stream" object.
          const trade = JSON.parse(event.data);
          const streamName = "btcusdt@trade"; // Manually set the stream name
          
          if (trade.p && trade.q) {
            setTradesMap((prev) => ({
              ...prev,
              [streamName]: {
                price: parseFloat(trade.p),
                quantity: parseFloat(trade.q),
                time: trade.T,
              },
            }));
          }
        } catch (err) {
          console.error("WS message parse error:", err);
        }
      };

      ws.onerror = (event) => {
        console.error("❌ WS error:", event);
      };

      ws.onclose = (event) => {
        console.warn("⚠️ WS connection closed", event.code, event.reason);
        // Clear the ref to allow re-initialization on next attempt
        if (wsRef.current === ws) {
            wsRef.current = null;
        }
        // Attempt to reconnect after a delay.
        setTimeout(initWS, 3000);
      };
    };

    // Initialize the connection only if it doesn't already exist.
    if (!wsRef.current) {
        initWS();
    }

    // Cleanup function to close the WebSocket when the component unmounts.
    return () => {
      if (wsRef.current) {
        // Remove the onclose handler to prevent reconnection attempts on unmount.
        wsRef.current.onclose = null;
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, []); // Empty dependency array ensures this runs only once.

  return tradesMap;
}
