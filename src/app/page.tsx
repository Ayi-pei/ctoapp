
"use client";

import { useMarketData } from "@/hooks/use-market-data";
import { TradeHeader } from "@/components/trade-header";
import { PriceChart } from "@/components/price-chart";
import { OrderForm } from "@/components/order-form";
import { OrderBook } from "@/components/order-book";
import { TradeHistory } from "@/components/trade-history";
import { Skeleton } from "@/components/ui/skeleton";

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
            <PriceChart priceData={data.priceData} tradingPair={tradingPair} />
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
