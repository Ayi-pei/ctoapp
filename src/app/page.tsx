
"use client";

import { useMarketData } from "@/hooks/use-market-data";
import { TradeHeader } from "@/components/trade-header";
import { OrderForm } from "@/components/order-form";
import { OrderBook } from "@/components/order-book";
import { TradeHistory } from "@/components/trade-history";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";

export default function Home() {
  const { tradingPair, changeTradingPair, data, availablePairs } = useMarketData();

  if (!data) {
    return (
        <div className="min-h-screen bg-background p-4">
             <TradeHeader 
                tradingPair={tradingPair}
                availablePairs={availablePairs}
                onTradingPairChange={changeTradingPair}
            />
            <main className="p-4">
                <div className="grid grid-cols-1 lg:grid-cols-[1fr_350px] gap-4">
                    <div className="flex flex-col gap-4">
                        <Skeleton className="h-[460px] w-full" />
                        <Skeleton className="h-[300px] w-full" />
                    </div>
                    <div className="flex flex-col gap-4">
                        <Skeleton className="h-[500px] w-full" />
                        <Skeleton className="h-[300px] w-full" />
                    </div>
                </div>
            </main>
        </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <TradeHeader 
        tradingPair={tradingPair}
        availablePairs={availablePairs}
        onTradingPairChange={changeTradingPair}
      />
      <main className="p-4">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_350px] gap-4">
          <div className="flex flex-col gap-4">
            <Card>
              <CardContent className="h-[460px] flex items-center justify-center">
                <p>价格图表当前不可用。</p>
              </CardContent>
            </Card>
            <OrderForm />
          </div>
          <div className="flex flex-col gap-4">
            <OrderBook asks={data.orderBook.asks} bids={data.orderBook.bids} tradingPair={tradingPair} />
            <TradeHistory trades={data.trades} />
          </div>
        </div>
      </main>
    </div>
  );
}
