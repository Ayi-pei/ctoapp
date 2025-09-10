"use client";

import React from 'react';
import TradeBoard from '@/components/TradeBoard';
import { useSearchParams } from 'next/navigation';

export default function TradePageContent() {
  const searchParams = useSearchParams();
  const tab = searchParams.get('tab') ?? 'contract';

  return <TradeBoard initialTab={tab} />;
}
