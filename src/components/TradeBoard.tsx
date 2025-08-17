import React, { useState, useEffect } from "react";
import ReactECharts from "echarts-for-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useMarket } from "@/context/market-data-context";
import { useBalance } from "@/context/balance-context";
import { useAdminSettings } from "@/context/admin-settings-context";
import { OrderForm } from "./order-form";
import { SpotOrderForm } from "./spot-order-form";
import { MarketOverview } from "./market-overview";
import { SmartTrade } from "./smart-trade";
import { Button } from "./ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"


export default function TradeBoard() {
  const { tradingPair, getLatestPrice, klineData: allKlineData } = useMarket();
  const { balances, placeContractTrade, placeSpotTrade } = useBalance();
  const { startOverride } = useAdminSettings();

  const klineData = allKlineData[tradingPair] || [];
  const [baseAsset, quoteAsset] = tradingPair.split('/');
  const latestPrice = getLatestPrice(tradingPair);

  if (klineData.length === 0) {
    return <div>Loading market data...</div>;
  }
  
  const klineOption = {
      backgroundColor: "transparent",
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'cross' }
      },
      xAxis: {
        type: "category",
        data: klineData.map((d) => new Date(d.time).toLocaleTimeString()),
        axisLine: { lineStyle: { color: "#8392A5" } }
      },
      yAxis: {
        scale: true,
        axisLine: { lineStyle: { color: "#8392A5" } },
        splitLine: { show: false }
      },
      grid: {
        left: "10%",
        right: "5%",
        bottom: "15%",
        top: "5%",
      },
      series: [{
        name: tradingPair,
        type: "candlestick",
        data: klineData.map(d => [d.open, d.close, d.low, d.high]),
        itemStyle: {
          color: '#26a69a',
          color0: '#ef5350',
          borderColor: '#26a69a',
          borderColor0: '#ef5350'
        }
      }]
    };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">

      <div className="lg:col-span-5 space-y-4">

        <div className="h-[400px] w-full bg-card rounded-lg p-2">
          <ReactECharts option={klineOption} style={{ height: "100%", width: "100%" }} />
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

        {/* Admin 控制示例按钮 */}
        <div className="mt-2">
          <Button
            className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700"
            onClick={() => startOverride(tradingPair, latestPrice + 100, 10, 10)} // 10秒内固定价格
          >
            Admin +100 临时干预 10 秒
          </Button>
        </div>
      </div>
    </div>
  );
}
