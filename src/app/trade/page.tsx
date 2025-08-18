
"use client";

import React from 'react';
import DashboardLayout from "@/components/dashboard-layout";
import TradeBoard from '@/components/TradeBoard';
import { useSearchParams } from 'next/navigation';

function TradePageContents() {
  const searchParams = useSearchParams();
  const tab = searchParams.get('tab') || 'contract';
  
  return (
    <TradeBoard initialTab={tab} />
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
