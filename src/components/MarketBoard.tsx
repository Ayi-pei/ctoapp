

"use client";
import React from "react";
import { useEnhancedMarket } from "@/context/enhanced-market-data-context";
import ReactECharts from "echarts-for-react";
import { OHLC } from "@/types";

const symbols = [
  'BTC/USDT','ETH/USDT','SOL/USDT','XRP/USDT','LTC/USDT',
 'BNB/USDT','MATIC/USDT','DOGE/USDT','ADA/USDT','SHIB/USDT',
 'AVAX/USDT','LINK/USDT','DOT/USDT','UNI/USDT','TRX/USDT',
 'XLM/USDT','VET/USDT','EOS/USDT','FIL/USDT','ICP/USDT',  'BTC/USD-PERP', 'ETH/USD-PERP'
];

export function MarketBoard() {
  const { tradingPair, changeTradingPair, getLatestPrice, klineData } = useEnhancedMarket();

  const getOption = () => {
    const currentPairKlineData = klineData[tradingPair];
    if (!currentPairKlineData || currentPairKlineData.length === 0) {
        return {}; 
    }

    const data = currentPairKlineData.map((item: OHLC) => [
        item.time,
        item.open,
        item.close,
        item.low,
        item.high,
    ]);

    return {
        tooltip: {
            trigger: 'axis',
            axisPointer: {
                type: 'cross'
            }
        },
        grid: {
            left: '10%',
            right: '10%',
            bottom: '15%'
        },
        xAxis: {
            type: 'category',
            data: data.map((item: (number | string)[]) => item[0]),
            scale: true,
            boundaryGap: false,
            axisLine: { onZero: false },
            splitLine: { show: false },
            min: 'dataMin',
            max: 'dataMax'
        },
        yAxis: {
            scale: true,
            splitArea: {
                show: true
            }
        },
        dataZoom: [
            {
                type: 'inside',
                start: 50,
                end: 100
            },
            {
                show: true,
                type: 'slider',
                top: '90%',
                start: 50,
                end: 100
            }
        ],
        series: [
            {
                name: tradingPair,
                type: 'candlestick',
                data: data.map((item: (number | string)[]) => [item[1], item[2], item[3], item[4]]),
                itemStyle: {
                    color: '#00ff00',
                    color0: '#ff0000',
                    borderColor: '#00ff00',
                    borderColor0: '#ff0000'
                }
            }
        ]
    };
};

  return (
    <div className="bg-card p-4 rounded-lg shadow-lg">
      <div className="flex flex-wrap gap-2 mb-4">
        {symbols.map(symbol => (
          <button 
            key={symbol} 
            onClick={() => changeTradingPair(symbol)} 
            className={`px-3 py-1 rounded text-xs ${tradingPair === symbol ? 'bg-primary text-primary-foreground' : 'bg-secondary'}`}>
            {symbol}
          </button>
        ))}
      </div>
      <div className="font-bold text-xl mb-2">{tradingPair} - {getLatestPrice(tradingPair)}</div>
      <ReactECharts option={getOption()} style={{ height: '400px' }} />
    </div>
  );
}
