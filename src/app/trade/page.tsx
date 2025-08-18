
"use client";

import React from 'react';
import DashboardLayout from "@/components/dashboard-layout";
import TradeBoard from '@/components/TradeBoard';
import { useSearchParams } from 'next/navigation';

// To fix the "params are being enumerated" error, we explicitly define the props
// that the page component receives, even if we don't use `params`.
// This prevents Next.js from warning about unsafe access.
function TradePage({
  params,
  searchParams,
}: {
  params: {};
  searchParams: { [key: string]: string | string[] | undefined };
}) {
  const tab = searchParams?.tab || 'contract';
  
  return (
    <DashboardLayout>
      <main className="p-4 flex flex-col gap-4">
          <TradeBoard initialTab={Array.isArray(tab) ? tab[0] : tab} />
      </main>
    </DashboardLayout>
  );
};

// We wrap the page in Suspense because `useSearchParams` (used indirectly here)
// opts the page into dynamic rendering.
export default function SuspenseWrapper(props: any) {
    return (
        <React.Suspense fallback={<DashboardLayout><main className="p-4">Loading...</main></DashboardLayout>}>
            <TradePage {...props} />
        </React.Suspense>
    )
}
