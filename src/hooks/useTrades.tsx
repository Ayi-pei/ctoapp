
import { useState } from "react";

type TradeRaw = { price: number; quantity: number; time: number };

// This hook is currently returning a stable empty value to prevent WebSocket
// connection errors. The application will use simulated data from other hooks.
export default function useTrades() {
  const [tradesMap] = useState<Record<string, TradeRaw>>({});
  return tradesMap;
}
