"use client";


// Disable SSR for this page to avoid context issues
export const dynamic = 'force-dynamic';
import React, { Suspense } from "react";
import DashboardLayout from "@/components/dashboard-layout";
import TradePageContent from "./trade-page-content";

// Client component cannot be async, so we'll handle searchParams in TradePageContent
export default function TradePage() {
  return (
    <DashboardLayout>
      <Suspense fallback={<div>Loading...</div>}>
        <TradePageContent />
      </Suspense>
    </DashboardLayout>
  );
}
