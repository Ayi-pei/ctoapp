"use client";

import React, { Suspense } from 'react';
import DashboardLayout from "@/components/dashboard-layout";
import TradePageContent from './trade-page-content';

export default function TradePage() {
  return (
    <DashboardLayout>
      <Suspense fallback={<div>Loading...</div>}>
        <TradePageContent />
      </Suspense>
    </DashboardLayout>
  );
}
