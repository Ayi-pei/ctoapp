
"use client";

import React from 'react';
import DashboardLayout from "@/components/dashboard-layout";
import TradeBoard from '@/components/TradeBoard';
import { useSearchParams } from 'next/navigation';

function TradePage() {
  const searchParams = useSearchParams();
  const tab = searchParams.get('tab');
  
  return (
    <DashboardLayout>
      <main className="p-4 flex flex-col gap-4">
          <TradeBoard initialTab={tab || 'contract'} />
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
