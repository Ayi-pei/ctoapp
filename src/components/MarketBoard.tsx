

"use client";
import React, { useState } from "react";
import { useMarket } from "@/context/market-data-context";
import ReactECharts from "echarts-for-react";

const symbols = [
  'BTC/USDT','ETH/USDT','SOL/USDT','XRP/USDT','LTC/USDT',
  'BNB/USDT','MATIC/USDT','DOGE/USDT','ADA/USDT','SHIB/USDT',
  'AVAX/USDT','LINK/USDT','DOT/USDT','UNI/USDT','TRX/USDT',
  'XLM/USDT','VET/USDT','EOS/USDT','FIL/USDT','ICP/USDT',  'BTC/USD-PERP', 'ETH/USD-PERP'
];

export function MarketBoard() {
  const { tradingPair, changeTradingPair, getLatestPrice, klineData } = useMarket();

  const currentKlineData = klineData[tradingPair] || [];

  const klineOption = {
    xAxis: {
      type: "category",
      data: currentKlineData.map(d => d.time),
      boundaryGap: true,
    },
    yAxis: { scale: true },
    tooltip: { trigger: "axis" },
    series: [
      {
        type: "line",
        data: currentKlineData.map(d => d.close),
        smooth: true,
        showSymbol: false,
        lineStyle: { color: "#26a69a", width: 2 }
      },
    ],
  };

  return (
    <div>
      {/* 币种选择按钮 */}
      <div className="flex flex-wrap gap-2 mb-4">
        {symbols.map(symbol => (
          <button
            key={symbol}
            onClick={() => changeTradingPair(symbol)}
            className={`px-3 py-1 rounded ${
              tradingPair === symbol ? "bg-blue-600 text-white" : "bg-gray-700 text-gray-200"
            }`}
          >
            {symbol}
          </button>
        ))}
      </div>

      {/* 最新价格 */}
      <h2 className="mb-2">{tradingPair} 实时价格: {getLatestPrice(tradingPair)}</h2>

      {/* K 线图 */}
      <ReactECharts option={klineOption} style={{ height: 400 }} />
    </div>
  );
}