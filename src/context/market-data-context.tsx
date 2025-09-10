"use client";

import React, { ReactNode } from 'react';
import { MarketSummary, OHLC, availablePairs as allAvailablePairs } from '@/types';
import { EnhancedMarketDataProvider, useEnhancedMarket } from './enhanced-market-data-context';

// Backward-compatible context shape expected by existing components
interface MarketContextType {
  tradingPair: string;
  changeTradingPair: (pair: string) => void;
  availablePairs: string[];
  summaryData: MarketSummary[];
  cryptoSummaryData: MarketSummary[];
  forexAndOptionsSummaryData: MarketSummary[];
  klineData: Record<string, OHLC[]>;
  getLatestPrice: (pair: string) => number;
}

// Compatibility Provider: reuse the enhanced provider under the old name
export function MarketDataProvider({ children }: { children: ReactNode }) {
  return <EnhancedMarketDataProvider>{children}</EnhancedMarketDataProvider>;
}

// Compatibility Hook: adapt enhanced market data to the legacy shape
export function useMarket(): MarketContextType {
  const enhanced = useEnhancedMarket();

  const FOREX_COMMODITY_PAIRS = ['XAU/USD', 'EUR/USD', 'GBP/USD'];
  const OPTIONS_SYMBOLS = ['IBM', 'AAPL', 'TSLA', 'MSFT'];
  const forexAndOptionsSymbols = new Set<string>([...FOREX_COMMODITY_PAIRS, ...OPTIONS_SYMBOLS]);

  const forexAndOptionsSummaryData = enhanced.summaryData.filter((s: any) => forexAndOptionsSymbols.has(s.pair));
  const cryptoSummaryData = enhanced.summaryData.filter((s: any) => !forexAndOptionsSymbols.has(s.pair));

  return {
    tradingPair: enhanced.tradingPair,
    changeTradingPair: enhanced.changeTradingPair,
    availablePairs: allAvailablePairs,
    summaryData: enhanced.summaryData,
    cryptoSummaryData,
    forexAndOptionsSummaryData,
    klineData: enhanced.klineData,
    getLatestPrice: enhanced.getLatestPrice,
  };
}
