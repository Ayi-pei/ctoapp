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
import { MarketList } from "./market-list";

// Helper function to get computed style of a CSS variable
const getCssVar = (variable: string): string => {
    if (typeof window === 'undefined') return '';
    return getComputedStyle(document.documentElement).getPropertyValue(variable).trim();
};


export default function TradeBoard({ initialTab = 'contract' }: { initialTab?: string }) {
  const { tradingPair, klineData: allKlineData, summaryData, getLatestPrice, cryptoSummaryData, klineData } = useMarket();
  const { balances, placeContractTrade, placeSpotTrade } = useBalance();

  const currentKlineData = allKlineData[tradingPair] || [];
  const currentSummary = summaryData.find(s => s.pair === tradingPair);
  const currentPrice = getLatestPrice(tradingPair); // Get the single source of truth for the price
  
  const [baseAsset, quoteAsset] = tradingPair.split('/');
  
  const chartColor = `hsl(${getCssVar('--chart-1')})`;
  const chartBorderColor = `hsl(${getCssVar('--border')})`;
  const chartMutedColor = `hsl(${getCssVar('--muted-foreground')})`;
  
  // Correctly format the HSL value for use in HSLA by replacing spaces with commas
  const chartColorRaw = getCssVar('--chart-1').replace(/ /g, ',');
  const chartAreaColorStart = `hsla(${chartColorRaw}, 0.2)`;
  const chartAreaColorEnd = `hsla(${chartColorRaw}, 0)`;


  const klineOption = {
      backgroundColor: "transparent",
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'cross' }
      },
      xAxis: {
        type: "category",
        data: currentKlineData.map((d) => d.time),
        axisLine: { lineStyle: { color: chartMutedColor } },
        axisLabel: { 
            color: chartMutedColor,
            interval: 3599, // Approx 1 hour (3600 seconds)
            formatter: (value: string | number) => { // Accept both string and number
                const date = new Date(Number(value)); // Ensure value is a number
                if (isNaN(date.getTime())) {
                    return ''; // Return empty string for invalid dates
                }
                return `${date.getHours().toString().padStart(2, '0')}:00`;
            }
        },
        boundaryGap: false,
      },
      yAxis: {
        scale: true,
        axisLine: { show: false },
        axisLabel: { 
            show: true,
            color: chartMutedColor,
            formatter: (value: number) => value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 8 })
        },
        splitLine: { show: true, lineStyle: { color: chartBorderColor, opacity: 0.5, type: 'dashed' } }
      },
      grid: {
        left: "5",
        right: "60",
        bottom: "25",
        top: "10",
        containLabel: true,
      },
      series: [{
        name: tradingPair,
        type: "line",
        data: currentKlineData.map(d => d.close),
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
    <div className="space-y-4 p-4 trade-background">

      <div className="space-y-4">
        <MarketOverview summary={currentSummary} />

        <div className="h-[240px] w-full bg-card/50 backdrop-blur-sm rounded-lg p-2">
           {currentKlineData.length > 0 ? (
              <ReactECharts option={klineOption} style={{ height: "100%", width: "100%" }} />
            ) : (
              <div className="flex justify-center items-center h-full">
                <Skeleton className="h-full w-full bg-muted" />
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
              currentPrice={currentPrice}
            />
          </TabsContent>
          <TabsContent value="smart">
            <SmartTrade tradingPair={tradingPair} />
          </TabsContent>
        </Tabs>
      </div>

      <div className="pt-4">
        <MarketList summary={cryptoSummaryData} klineData={klineData} />
      </div>
    </div>
  );
}