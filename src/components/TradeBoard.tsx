
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
import { cn } from "@/lib/utils";

// Helper function to get computed style of a CSS variable
const getCssVar = (variable: string): string[] => {
    if (typeof window === 'undefined') return ['0', '0', '0'];
    const style = getComputedStyle(document.documentElement);
    const value = style.getPropertyValue(variable).trim();
    // Assuming HSL format "H S% L%"
    return value.replace(/%/g, '').split(' ');
};


export default function TradeBoard({ initialTab = 'contract' }: { initialTab?: string }) {
  const { tradingPair, klineData: allKlineData, summaryData, getLatestPrice } = useMarket();
  const { balances, placeContractTrade, placeSpotTrade } = useBalance();

  const klineData = allKlineData[tradingPair] || [];
  const currentSummary = summaryData.find(s => s.pair === tradingPair);
  
  const [baseAsset, quoteAsset] = tradingPair.split('/');
  
  const chartColor = "#4481eb";
  const chartAreaColorStart = "rgba(68, 129, 235, 0.3)";
  const chartAreaColorEnd = "rgba(68, 129, 235, 0)";

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
          color: chartColor,
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
                offset: 0, color: chartAreaColorStart
            }, {
                offset: 1, color: chartAreaColorEnd
            }]
          }
        },
      }]
    };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">

      <div className="lg:col-span-5 space-y-4">
        <MarketOverview summary={currentSummary} />

        <div className="h-[400px] w-full bg-slate-800/80 rounded-lg p-2">
           {klineData.length > 0 ? (
              <ReactECharts option={klineOption} style={{ height: "100%", width: "100%" }} />
            ) : (
              <div className="flex justify-center items-center h-full">
                <Skeleton className="h-full w-full bg-slate-700" />
              </div>
            )}
        </div>

        <Tabs defaultValue={initialTab}>
          <TabsList className="bg-secondary rounded-md p-1 h-auto">
            <TabsTrigger value="contract" className={cn("px-6 py-2 text-sm rounded-md data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-md")}>秒合约</TabsTrigger>
            <TabsTrigger value="spot" className={cn("px-6 py-2 text-sm rounded-md data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-md")}>币币</TabsTrigger>
            <TabsTrigger value="smart" className={cn("px-6 py-2 text-sm rounded-md data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-md")}>智能交易</TabsTrigger>
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
