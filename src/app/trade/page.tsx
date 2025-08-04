
"use client";

import { useMarketData } from "@/hooks/use-market-data";
import { OrderForm } from "@/components/order-form";
import { OrderBook } from "@/components/order-book";
import { TradeHistory } from "@/components/trade-history";
import { Skeleton } from "@/components/ui/skeleton";
import { MarketOverview } from "@/components/market-overview";
import DashboardLayout from "@/components/dashboard-layout";
import { useBalance } from "@/context/balance-context";

export default function TradePage() {
  const marketData = useMarketData();
  const { tradingPair, data, summaryData } = marketData;
  const { balance, placeTrade, isLoading: isBalanceLoading } = useBalance();

  const renderContent = () => {
    if (!data || !summaryData.length || isBalanceLoading) {
      return (
        <main className="p-4">
            <div className="mb-4">
              <Skeleton className="h-[90px] w-full" />
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_350px] gap-4">
                <div className="flex flex-col gap-4">
                  <Skeleton className="h-[500px] w-full" />
                </div>
                <div className="flex flex-col gap-4">
                    <Skeleton className="h-[220px] w-full" />
                    <Skeleton className="h-[420px] w-full" />
                </div>
            </div>
        </main>
      );
    }

    return (
      <main className="p-4">
        <div className="mb-4">
            <MarketOverview summary={summaryData.find(s => s.pair === tradingPair)} />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-[350px_1fr] gap-4">
            <div className="flex flex-col gap-4">
                <OrderBook asks={data.orderBook.asks} bids={data.orderBook.bids} tradingPair={tradingPair} />
                 <TradeHistory trades={data.trades} />
            </div>
            <div className="flex flex-col gap-4">
                <OrderForm 
                  tradingPair={tradingPair}
                  balance={balance}
                  onPlaceTrade={placeTrade} 
                />
            </div>
        </div>
      </main>
    );
  }

  return (
    <DashboardLayout useMarketData={() => marketData}>
      {renderContent()}
    </DashboardLayout>
  );
}
