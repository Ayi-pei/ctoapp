
import React from 'react';
import DashboardLayout from "@/components/dashboard-layout";
import TradeBoard from '@/components/TradeBoard';

// This page now accepts searchParams as a prop, which is the recommended
// way for Server Components to access URL parameters in Next.js App Router.
// We are destructuring 'tab' directly from searchParams to avoid enumerating the object,
// which would cause a Next.js runtime error.
export default async function TradePage({
  searchParams,
}: {
  // In Next.js >= 15, searchParams is an async dynamic API and must be awaited
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const resolved = await searchParams;
  const tab = resolved?.tab ?? 'contract';
  
  return (
    <DashboardLayout>
        <TradeBoard initialTab={Array.isArray(tab) ? tab[0] : tab} />
    </DashboardLayout>
  )
}
