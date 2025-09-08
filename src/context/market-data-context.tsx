

"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { MarketSummary, OHLC, availablePairs as allAvailablePairs } from '@/types';
import { supabase, isSupabaseEnabled } from '@/lib/supabaseClient';
import { RealtimePostgresChangesPayload } from '@supabase/supabase-js';

const CRYPTO_PAIRS = allAvailablePairs.filter(p => !p.includes('-PERP') && !['XAU/USD', 'EUR/USD', 'GBP/USD'].includes(p));
const FOREX_COMMODITY_PAIRS = ['XAU/USD', 'EUR/USD', 'GBP/USD'];
const OPTIONS_SYMBOLS = ['IBM', 'AAPL', 'TSLA', 'MSFT'];

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

const MarketContext = createContext<MarketContextType | undefined>(undefined);

// --- Provider ---
export function MarketDataProvider({ children }: { children: ReactNode }) {
  const [tradingPair, setTradingPair] = useState(CRYPTO_PAIRS[0]);
  const [summaryData, setSummaryData] = useState<MarketSummary[]>([]);
  const [klineData, setKlineData] = useState<Record<string, OHLC[]>>({});

  const getLatestPrice = useCallback((pair: string) => {
    return summaryData.find(s => s.pair === pair)?.price || 0;
  }, [summaryData]);
  
  // --- Initial Data Population from Supabase ---
  useEffect(() => {
    const loadInitialData = async () => {
        if (!isSupabaseEnabled) {
            console.warn("Supabase is not enabled. Cannot load market data.");
            return;
        }

        // Fetch initial summary data
        const { data: summary, error: summaryError } = await supabase
            .from('market_summary_data')
            .select('*');
        
        if (summaryError) {
             console.error("Error fetching initial summary data:", summaryError);
        } else if (summary) {
            setSummaryData(summary);
        }
        
        // Fetch initial k-line data for the last 4 hours
        const fourHoursAgo = new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString();
        const { data: kline, error: klineError } = await supabase
            .from('market_kline_data')
            .select('*')
            .gte('time', fourHoursAgo);

        if (klineError) {
            console.error("Error fetching initial k-line data:", klineError);
        } else if (kline) {
             const groupedData: Record<string, OHLC[]> = {};
            kline.forEach((row: { trading_pair: string; time: string; open: number; high: number; low: number; close: number; }) => {
                if (!groupedData[row.trading_pair]) groupedData[row.trading_pair] = [];
                groupedData[row.trading_pair].push({
                    time: new Date(row.time).getTime(),
                    open: row.open,
                    high: row.high,
                    low: row.low,
                    close: row.close,
                });
            });
            Object.values(groupedData).forEach(arr => arr.sort((a, b) => a.time - b.time));
            setKlineData(groupedData);
        }
    };
    loadInitialData();
  }, []);

  // --- Real-time Data Subscription ---
  useEffect(() => {
    if (!isSupabaseEnabled) return;

    const summaryChannel = supabase
        .channel('market-summary-updates')
        .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'market_summary_data' },
            (payload: RealtimePostgresChangesPayload<MarketSummary>) => {

                if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
                    const updatedRecord = payload.new as MarketSummary;
                    if (updatedRecord.pair) {
                        setSummaryData(prev => {
                            const index = prev.findIndex(s => s.pair === updatedRecord.pair);
                            if (index > -1) {
                                const newSummary = [...prev];
                                newSummary[index] = updatedRecord;
                                return newSummary;
                            }
                            return [...prev, updatedRecord];
                        });
                    }
                } else if (payload.eventType === 'DELETE') {
                    const oldRecord = payload.old as Partial<MarketSummary>;
                    if (oldRecord && oldRecord.pair) {
                        setSummaryData(prev => prev.filter(item => item.pair !== oldRecord.pair));
                    }
                }
            }
        ).subscribe();

    const klineChannel = supabase
      .channel('market-kline-updates')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'market_kline_data' },
        (payload: RealtimePostgresChangesPayload<OHLC & { trading_pair: string }>) => {
          const newKlinePoint = payload.new as (OHLC & { trading_pair: string });
          if (newKlinePoint && newKlinePoint.trading_pair) {
              setKlineData(prev => {
                  const updatedPairData = [...(prev[newKlinePoint.trading_pair] || []), {
                      ...newKlinePoint,
                      time: new Date(newKlinePoint.time).getTime()
                  }];
                  // Keep the chart from getting too crowded
                  if (updatedPairData.length > 3000) { 
                      updatedPairData.shift();
                  }
                  return { ...prev, [newKlinePoint.trading_pair]: updatedPairData };
              });
          }
        }
      ).subscribe();
      
    return () => {
      supabase.removeChannel(summaryChannel);
      supabase.removeChannel(klineChannel);
    };

  }, []);

  const contextValue: MarketContextType = {
    tradingPair,
    changeTradingPair: setTradingPair,
    availablePairs: allAvailablePairs,
    summaryData,
    cryptoSummaryData: summaryData.filter(s => CRYPTO_PAIRS.includes(s.pair)),
    forexAndOptionsSummaryData: summaryData.filter(s => [...FOREX_COMMODITY_PAIRS, ...OPTIONS_SYMBOLS].includes(s.pair)),
    klineData,
    getLatestPrice,
  };

  return <MarketContext.Provider value={contextValue}>{children}</MarketContext.Provider>;
}

export function useMarket() {
  const context = useContext(MarketContext);
  if (!context) throw new Error('useMarket must be used within a MarketDataProvider');
  return context;
}
