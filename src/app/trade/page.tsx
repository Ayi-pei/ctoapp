

import React from 'react';
import DashboardLayout from "@/components/dashboard-layout";
import TradeBoard from '@/components/TradeBoard';

// The page now accepts searchParams as a prop, which is the recommended
// way for Server Components to access URL parameters in Next.js App Router.
export default function TradePage({
  searchParams,
}: {
  searchParams?: { [key: string]: string | string[] | undefined };
}) {
  const tab = searchParams?.tab || 'contract';
  
  return (
    <DashboardLayout>
        <TradeBoard initialTab={Array.isArray(tab) ? tab[0] : tab} />
    </DashboardLayout>
  )
}
