
"use client";

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/auth-context';
import { useRouter } from 'next/navigation';
import { Sidebar } from './sidebar';
import { BottomNav } from './bottom-nav';
import { TradeHeader } from './trade-header';
import { useMarketData as useMarketDataHook } from '@/hooks/use-market-data';

type DashboardLayoutProps = {
  children: React.ReactNode;
  useMarketData?: () => ReturnType<typeof useMarketDataHook>
};

const DashboardLayout = ({ children, useMarketData: useMarketDataProp }: DashboardLayoutProps) => {
  const { isAuthenticated, logout } = useAuth();
  const { tradingPair, changeTradingPair, availablePairs } = useMarketDataProp ? useMarketDataProp() : useMarketDataHook();
  const router = useRouter();

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, router]);


  if (!isAuthenticated) {
    return null; // Or a loading spinner
  }

  return (
    <div className="flex flex-col h-screen bg-background">
      <TradeHeader 
        tradingPair={tradingPair}
        availablePairs={availablePairs}
        onTradingPairChange={changeTradingPair}
        onLogout={logout}
      />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-y-auto pb-16 md:pb-0">
          {children}
        </main>
      </div>
       <BottomNav />
    </div>
  );
};

export default DashboardLayout;
