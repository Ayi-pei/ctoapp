import { useEffect, useRef, useState } from "react";

/**
 * Supported streams based on project's cryptocurrencies (paired with USDT)
 */
const STREAMS = [
  "btcusdt@trade",
  "ethusdt@trade",
  "solusdt@trade",
  "xrpusdt@trade",
  "ltcusdt@trade",
  "bnbusdt@trade",
  "maticusdt@trade",
  "dogeusdt@trade",
  "adausdt@trade",
  "shibusdt@trade",
  "avaxusdt@trade",
  "linkusdt@trade",
  "dotusdt@trade",
  "uniusdt@trade",
  "trxusdt@trade",
  "xlmusdt@trade",
  "vetusdt@trade",
  "eosusdt@trade",
  "filusdt@trade",
  "icpusdt@trade",
];

type TradeRaw = { price: number; quantity: number; time: number };

export default function useTrades(intervalMs = 5000) {
  const [tradesMap, setTradesMap] = useState<Record<string, TradeRaw>>({});
  const [displayedTrades, setDisplayedTrades] = useState<Record<string, TradeRaw>>({});
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    const ws = new WebSocket(`wss://stream.binance.com:9443/ws/${STREAMS.join("/")}`);
    wsRef.current = ws;

    ws.onmessage = (event) => {
      try {
        const { s: symbol, p: priceStr, q: qtyStr, T: time } = JSON.parse(event.data);
        const stream = `${symbol.toLowerCase()}@trade`;
        const price = parseFloat(priceStr);
        const qty = parseFloat(qtyStr);
        
        // Update raw tradesMap (for real-time price list)
        setTradesMap(prev => ({ ...prev, [stream]: { price, quantity: qty, time } }));

      } catch (e) {
        console.warn("ws parse error", e);
      }
    };

    ws.onopen = () => console.log("Binance WS connected");
    ws.onclose = () => console.log("Binance WS closed");
    ws.onerror = (err) => console.error("Binance WS err", err);

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
        setDisplayedTrades(tradesMap);
    }, intervalMs);

    return () => clearInterval(timer);
  }, [tradesMap, intervalMs]);


  return {
    displayedTrades,
  };
}
