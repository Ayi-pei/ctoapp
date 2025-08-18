
"use client";

import React from 'react';
import DashboardLayout from "@/components/dashboard-layout";
import TradeBoard from '@/components/TradeBoard';
import { useSearchParams } from 'next/navigation';

function TradePageContents() {
  const searchParams = useSearchParams();
  const tab = searchParams.get('tab') || 'contract';
  
  return (
    <div className="h-full w-full">
        <main className="p-4 flex flex-col gap-4">
            <TradeBoard initialTab={tab} />
        </main>
    </div>
  );
};

export default function TradePage() {
    return (
        <DashboardLayout>
            <React.Suspense fallback={<main className="p-4">Loading...</main>}>
                <TradePageContents />
            </React.Suspense>
        </DashboardLayout>
    )
}
