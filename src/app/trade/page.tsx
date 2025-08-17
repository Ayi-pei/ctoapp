
"use client";

import React from 'react';
import DashboardLayout from "@/components/dashboard-layout";
import TradeBoard from '@/components/TradeBoard';
import { SmartTrade } from '@/components/smart-trade';
import { TradeDataProvider } from '@/context/trade-data-context';

function TradePage() {
  return (
    <DashboardLayout>
      <main className="p-4 flex flex-col gap-4">
        <TradeDataProvider>
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="w-full lg:w-2/3">
              <TradeBoard />
            </div>
            <div className="w-full lg:w-1/3">
              <SmartTrade tradingPair="BTC/USDT" />
            </div>
          </div>
        </TradeDataProvider>
      </main>
    </DashboardLayout>
  );
};

export default function SuspenseWrapper() {
    return (
        <React.Suspense fallback={<DashboardLayout><main className="p-4">Loading...</main></DashboardLayout>}>
            <TradePage />
        </React.Suspense>
    )
}
