
"use client";

import { OrderBook } from "@/components/order-book";
import { Skeleton } from "@/components/ui/skeleton";
import { MarketOverview } from "@/components/market-overview";
import DashboardLayout from "@/components/dashboard-layout";
import { useBalance } from "@/context/balance-context";
import { SpotOrderForm } from "@/components/spot-order-form";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import Image from "next/image";
import { OrderForm } from "@/components/order-form";
import { useSearchParams } from 'next/navigation';
import React from 'react';
import { useMarket } from "@/context/market-data-context";

function TradePageContent() {
  const marketData = useMarket();
  const { tradingPair, data, summaryData } = marketData;
  const { balances, placeSpotTrade, placeContractTrade, isLoading: isBalanceLoading } = useBalance();
  const searchParams = useSearchParams();
  const tab = searchParams.get('tab');
  const defaultTab = tab === 'contract' ? 'contract' : 'spot';


  if (!data || !summaryData.length || isBalanceLoading) {
    return (
      <main className="p-4">
          <div className="mb-4">
            <Skeleton className="h-[90px] w-full" />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_350px] gap-4">
              <div className="flex flex-col gap-4">
                <Skeleton className="h-[500px] w-full" />
                <Skeleton className="h-[300px] w-full" />
              </div>
              <div className="flex flex-col gap-4">
                  <Skeleton className="h-[420px] w-full" />
                  <Skeleton className="h-[200px] w-full" />
              </div>
          </div>
      </main>
    );
  }

  const [baseAsset, quoteAsset] = tradingPair.split('/');

  return (
    <main className="p-4 space-y-4">
      <div className="mb-4">
          <MarketOverview summary={summaryData.find(s => s.pair === tradingPair)} />
      </div>
      <Tabs defaultValue={defaultTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="spot">币币交易</TabsTrigger>
              <TabsTrigger value="contract">秒合约</TabsTrigger>
          </TabsList>
          <TabsContent value="spot">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                  <div className="flex flex-col gap-4">
                      <OrderBook asks={data.orderBook.asks} bids={data.orderBook.bids} tradingPair={tradingPair} />
                  </div>
                  <div className="flex flex-col gap-4">
                      <SpotOrderForm
                          tradingPair={tradingPair}
                          balances={balances}
                          onPlaceTrade={(trade) => placeSpotTrade(trade, tradingPair)}
                          baseAsset={baseAsset}
                          quoteAsset={quoteAsset}
                          currentPrice={data.summary.price}
                      />
                  </div>
              </div>
          </TabsContent>
          <TabsContent value="contract">
               <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                  <div className="flex flex-col gap-4">
                      <OrderBook asks={data.orderBook.asks} bids={data.orderBook.bids} tradingPair={tradingPair} />
                  </div>
                  <div className="flex flex-col gap-4">
                      <OrderForm
                          tradingPair={tradingPair}
                          balance={balances['USDT']?.available || 0}
                          onPlaceTrade={(trade) => placeContractTrade(trade, tradingPair)}
                      />
                  </div>
              </div>
          </TabsContent>
      </Tabs>
      
      <div className="pt-4">
          <Tabs defaultValue="current">
              <TabsList>
                  <TabsTrigger value="current">当前委托</TabsTrigger>
                  <TabsTrigger value="history">历史委托</TabsTrigger>
              </TabsList>
              <TabsContent value="current">
                  <Card>
                      <CardContent className="pt-6 flex flex-col items-center justify-center text-center h-48">
                           <Image src="https://placehold.co/100x100.png" alt="No data" width={80} height={80} data-ai-hint="illustration no-data" />
                          <p className="mt-4 text-muted-foreground">暂无数据</p>
                      </CardContent>
                  </Card>
              </TabsContent>
              <TabsContent value="history">
                   <Card>
                      <CardContent className="pt-6 flex flex-col items-center justify-center text-center h-48">
                           <Image src="https://placehold.co/100x100.png" alt="No data" width={80} height={80} data-ai-hint="illustration no-data" />
                           <p className="mt-4 text-muted-foreground">暂无数据</p>
                      </CardContent>
                  </Card>
              </TabsContent>
          </Tabs>
      </div>
    </main>
  );
}

function TradePage() {
  return (
    <DashboardLayout>
      <TradePageContent />
    </DashboardLayout>
  );
}


export default function TradePageWrapper() {
    return (
        <React.Suspense fallback={<DashboardLayout><main className="p-4"><Skeleton className="h-full w-full" /></main></DashboardLayout>}>
            <TradePage />
        </React.Suspense>
    )
}
