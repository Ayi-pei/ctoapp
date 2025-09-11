"use client";
import React from "react";
import { useEnhancedMarket } from "@/context/enhanced-market-data-context";
import ReactECharts from "echarts-for-react";
import { OHLC } from "@/types";

const symbols = [
  "BTC/USDT",
  "ETH/USDT",
  "SOL/USDT",
  "XRP/USDT",
  "LTC/USDT",
  "BNB/USDT",
  "MATIC/USDT",
  "DOGE/USDT",
  "ADA/USDT",
  "SHIB/USDT",
  "AVAX/USDT",
  "LINK/USDT",
  "DOT/USDT",
  "UNI/USDT",
  "TRX/USDT",
  "XLM/USDT",
  "VET/USDT",
  "EOS/USDT",
  "FIL/USDT",
  "ICP/USDT",
  "BTC/USD-PERP",
  "ETH/USD-PERP",
];

export function MarketBoard() {
  const { tradingPair, changeTradingPair, getLatestPrice, klineData } =
    useEnhancedMarket();

  const getOption = () => {
    const currentPairKlineData = klineData[tradingPair];
    if (!currentPairKlineData || currentPairKlineData.length === 0) {
      return {};
    }

    const klineOption = {
      xAxis: {
        type: "category",
        data: currentPairKlineData.map((d: any) => d.time),
        boundaryGap: true,
      },
      yAxis: { scale: true },
      tooltip: { trigger: "axis" },
      series: [
        {
          type: "line",
          data: currentPairKlineData.map((d: any) => d.close),
          smooth: true,
          showSymbol: false,
          lineStyle: { color: "#26a69a", width: 2 },
        },
      ],
    };

    return klineOption;
  };

  return (
    <div className="bg-card p-4 rounded-lg shadow-lg">
      <div className="flex flex-wrap gap-2 mb-4">
        {symbols.map((symbol) => (
          <button
            key={symbol}
            onClick={() => changeTradingPair(symbol)}
            className={`px-3 py-1 rounded text-xs ${
              tradingPair === symbol
                ? "bg-primary text-primary-foreground"
                : "bg-secondary"
            }`}
          >
            {symbol}
          </button>
        ))}
      </div>
      <div className="font-bold text-xl mb-2">
        {tradingPair} - {getLatestPrice(tradingPair)}
      </div>
      <ReactECharts option={getOption()} style={{ height: "400px" }} />
    </div>
  );
}
