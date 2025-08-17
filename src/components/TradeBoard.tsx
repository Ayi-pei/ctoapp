import React, { useState, useEffect } from "react";
import ReactECharts from "echarts-for-react";
import { availablePairs } from "@/types";
import { useMarket } from "@/context/market-data-context";
import { useBalance } from "@/context/balance-context";
import { OrderBook } from "./order-book";
import { TradeHistory } from "./trade-history";
import { OrderForm } from "./order-form";
import { SpotOrderForm } from "./spot-order-form";
import { MarketOverview } from "./market-overview";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SmartTrade } from "./smart-trade";


export default function TradeBoard() {
  const { tradingPair, data, summaryData } = useMarket();
  const { balances, placeContractTrade, placeSpotTrade } = useBalance();

  if (!data) {
    return <div>Loading market data...</div>;
  }
  
  const { orderBook, trades, summary, priceData } = data;
  const [baseAsset, quoteAsset] = tradingPair.split('/');


  const klineOption = {
      backgroundColor: "transparent",
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'cross' }
      },
      xAxis: { 
        type: 'category', 
        data: priceData.map((d: any) => d.time),
        axisLine: { lineStyle: { color: '#8392A5' } } 
      },
      yAxis: { 
        scale: true, 
        axisLine: { lineStyle: { color: '#8392A5' } }, 
        splitLine: { show: false } 
      },
      grid: {
        left: '10%',
        right: '5%',
        bottom: '15%',
        top: '5%',
      },
      series: [{
        name: 'Price',
        type: "line",
        data: priceData.map((d: any) => d.price.toFixed(4)),
        smooth: true,
        showSymbol: false,
        lineStyle: { color: '#26a69a', width: 2 }
      }]
    };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
      
      <div className="lg:col-span-4 space-y-4">
        <MarketOverview summary={summary} />
        
        <div className="h-[400px] w-full bg-card rounded-lg p-2">
            <ReactECharts option={klineOption} style={{ height: "100%", width: '100%' }} />
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
                    onPlaceTrade={(trade) => placeSpotTrade(trade)}
                    baseAsset={baseAsset}
                    quoteAsset={quoteAsset}
                    currentPrice={summary.price}
                />
            </TabsContent>
             <TabsContent value="smart">
                <SmartTrade tradingPair={tradingPair} />
            </TabsContent>
        </Tabs>
      </div>

      <div className="lg:col-span-1 space-y-4">
        <OrderBook asks={orderBook.asks} bids={orderBook.bids} tradingPair={tradingPair}/>
        <TradeHistory trades={trades} />
      </div>

    </div>
  );
}
