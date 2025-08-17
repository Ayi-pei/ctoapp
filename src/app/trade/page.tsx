

"use client";

import React from 'react';
import DashboardLayout from "@/components/dashboard-layout";
import TradeBoard from '@/components/TradeBoard';


function TradePage() {
  return (
    <DashboardLayout>
      <main className="p-4 flex flex-col gap-4">
        <TradeBoard />
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
