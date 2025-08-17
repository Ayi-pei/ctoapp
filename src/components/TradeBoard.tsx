
"use client";

import React from "react";
import ReactECharts from "echarts-for-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useMarket } from "@/context/market-data-context";
import { useBalance } from "@/context/balance-context";
import { OrderForm } from "./order-form";
import { SpotOrderForm } from "./spot-order-form";
import { SmartTrade } from "./smart-trade";
import { MarketOverview } from "./market-overview";
import { Skeleton } from "./ui/skeleton";

// Helper function to get computed style of a CSS variable
const getCssVar = (variable: string) => {
  if (typeof window === 'undefined') return '';
  // Remove 'hsl(' and ')' and any spaces
  const hslValues = getComputedStyle(document.documentElement)
    .getPropertyValue(variable)
    .replace(/hsl\(|\)|\s/g, '');
  return hslValues;
}

export default function TradeBoard() {
  const { tradingPair, klineData: allKlineData, summaryData, getLatestPrice } = useMarket();
  const { balances, placeContractTrade, placeSpotTrade } = useBalance();

  const klineData = allKlineData[tradingPair] || [];
  const currentSummary = summaryData.find(s => s.pair === tradingPair);
  
  const [baseAsset, quoteAsset] = tradingPair.split('/');

  const chartColorHsl = getCssVar('--chart-2');
  const chartColorRgbaStart = `hsla(${chartColorHsl}, 0.3)`;
  const chartColorRgbaEnd = `hsla(${chartColorHsl}, 0)`;
  
  const klineOption = {
      backgroundColor: "transparent",
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'cross' }
      },
      xAxis: {
        type: "category",
        data: klineData.map((d) => new Date(d.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })),
        axisLine: { lineStyle: { color: "hsl(var(--muted-foreground))" } },
        axisLabel: { color: "hsl(var(--muted-foreground))" },
        boundaryGap: false,
      },
      yAxis: {
        scale: true,
        axisLine: { show: false },
        axisLabel: { show: false },
        splitLine: { show: true, lineStyle: { color: "hsl(var(--border))", type: 'dashed' } }
      },
      grid: {
        left: "5",
        right: "5",
        bottom: "25",
        top: "10",
      },
      series: [{
        name: tradingPair,
        type: "line",
        data: klineData.map(d => d.close),
        smooth: true,
        showSymbol: false,
        lineStyle: {
          color: `hsl(${chartColorHsl})`,
          width: 2,
        },
        areaStyle: {
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [{
                offset: 0, color: chartColorRgbaStart
            }, {
                offset: 1, color: chartColorRgbaEnd
            }]
          }
        },
      }]
    };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">

      <div className="lg:col-span-5 space-y-4">
        <MarketOverview summary={currentSummary} />

        <div className="h-[400px] w-full bg-card rounded-lg p-2">
           {klineData.length > 0 ? (
              <ReactECharts option={klineOption} style={{ height: "100%", width: "100%" }} />
            ) : (
              <div className="flex justify-center items-center h-full">
                <Skeleton className="h-full w-full" />
              </div>
            )}
        </div>

        <Tabs defaultValue="contract">
          <TabsList>
            <TabsTrigger value="contract">秒合约</TabsTrigger>
            <TabsTrigger value="spot">币币</TabsTrigger>
            <TabsTrigger value="smart">智能交易</TabsTrigger>
          </TabsList>
          <TabsContent value="contract">
            <OrderForm
              tradingPair={tradingPair}
              balance={balances[quoteAsset]?.available || 0}
              onPlaceTrade={(trade) => placeContractTrade(trade, tradingPair)}
              quoteAsset={quoteAsset}
            />
          </TabsContent>
          <TabsContent value="spot">
            <SpotOrderForm
              tradingPair={tradingPair}
              balances={balances}
              onPlaceTrade={placeSpotTrade}
              baseAsset={baseAsset}
              quoteAsset={quoteAsset}
              currentPrice={getLatestPrice(tradingPair)}
            />
          </TabsContent>
          <TabsContent value="smart">
            <SmartTrade tradingPair={tradingPair} />
          </TabsContent>
        </Tabs>

      </div>
    </div>
  );
}
