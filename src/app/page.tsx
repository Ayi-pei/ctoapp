
"use client";
import React from 'react';
import ReactECharts from "echarts-for-react";
import { useMarket } from "@/context/market-data-context";
import { Skeleton } from '@/components/ui/skeleton';

export default function Home() {
    const { tradingPair, changeTradingPair, availablePairs, klineData, getLatestPrice } = useMarket();

    const currentKlineData = klineData[tradingPair] || [];
    
    if (!currentKlineData || currentKlineData.length === 0) {
        return (
             <div className="p-4">
                <Skeleton className="h-8 w-full mb-4" />
                <Skeleton className="h-9 w-48 mb-2" />
                <Skeleton className="h-[400px] w-full" />
            </div>
        )
    }

    const klineOption = {
        xAxis: {
            type: "category",
            data: currentKlineData.map(d => new Date(d.time).toLocaleTimeString()),
            boundaryGap: true,
        },
        yAxis: { scale: true },
        tooltip: { trigger: "axis" },
        series: [
            {
                type: "candlestick",
                data: currentKlineData.map(d => [d.open, d.close, d.low, d.high]),
                itemStyle: {
                  color: '#26a69a',
                  color0: '#ef5350',
                  borderColor: '#26a69a',
                  borderColor0: '#ef5350'
                }
            },
        ],
    };

    return (
        <div className="p-4">
            <h1 className="text-2xl font-bold mb-4">Real-time Market Data</h1>
            
            {/* 币种选择按钮 */}
            <div className="flex flex-wrap gap-2 mb-4">
                {availablePairs.map(symbol => (
                <button
                    key={symbol}
                    onClick={() => changeTradingPair(symbol)}
                    className={`px-3 py-1 rounded text-sm transition-colors ${
                    tradingPair === symbol ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"
                    }`}
                >
                    {symbol}
                </button>
                ))}
            </div>

            {/* 最新价格 */}
            <h2 className="mb-2">{tradingPair} 实时价格: {getLatestPrice(tradingPair).toFixed(4)}</h2>

            {/* K 线图 */}
            <ReactECharts option={klineOption} style={{ height: 400 }} />
        </div>
    );
}
