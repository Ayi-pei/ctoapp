"use client";

import { MarketSummary } from "@/types";

interface MarketDataDebugProps {
  cryptoData: MarketSummary[];
  forexData: MarketSummary[];
  summaryData: MarketSummary[];
}

export function MarketDataDebug({ cryptoData, forexData, summaryData }: MarketDataDebugProps) {
  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 bg-black/80 text-white p-4 rounded-lg text-xs max-w-sm z-50">
      <h4 className="font-bold mb-2">市场数据调试信息</h4>
      <div className="space-y-1">
        <div>总数据: {summaryData.length} 条</div>
        <div>币种数据: {cryptoData.length} 条</div>
        <div>期货数据: {forexData.length} 条</div>
        
        {cryptoData.length > 0 && (
          <div>
            <div className="font-semibold mt-2">币种:</div>
            {cryptoData.slice(0, 3).map(d => (
              <div key={d.pair}>{d.pair}: ${d.price}</div>
            ))}
          </div>
        )}
        
        {forexData.length > 0 && (
          <div>
            <div className="font-semibold mt-2">期货:</div>
            {forexData.slice(0, 3).map(d => (
              <div key={d.pair}>{d.pair}: ${d.price}</div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}