
"use client";

import { useMarketData } from "@/hooks/use-market-data";
import { TradeHeader } from "@/components/trade-header";
import { OrderForm } from "@/components/order-form";
import { OrderBook } from "@/components/order-book";
import { TradeHistory } from "@/components/trade-history";
import { Skeleton } from "@/components/ui/skeleton";
import { MarketOverview } from "@/components/market-overview";
import { useAuth } from "@/context/auth-context";

export default function TradePage() {
  const { tradingPair, changeTradingPair, data, availablePairs, summaryData } = useMarketData();
  const { logout } = useAuth();

  if (!data || !summaryData) {
    return (
        <div className="min-h-screen bg-background p-4">
             <TradeHeader 
                tradingPair={tradingPair}
                availablePairs={availablePairs}
                onTradingPairChange={changeTradingPair}
                onLogout={logout}
            />
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
        onLogout={logout}
      />
      <main className="p-4">
        <div className="mb-4">
          <MarketOverview summary={summaryData} onSelectPair={changeTradingPair} />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_350px] gap-4">
          <div className="flex flex-col gap-4">
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
