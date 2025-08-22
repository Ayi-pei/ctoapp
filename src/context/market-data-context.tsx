
"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { MarketSummary, OHLC, availablePairs as allAvailablePairs } from '@/types';
import axios from 'axios';
import { supabase, isSupabaseEnabled } from '@/lib/supabaseClient';


const CRYPTO_PAIRS = allAvailablePairs.filter(p => !p.includes('-PERP') && !['XAU/USD', 'EUR/USD', 'GBP/USD'].includes(p));
const FOREX_COMMODITY_PAIRS = allAvailablePairs.filter(p => ['XAU/USD', 'EUR/USD', 'GBP/USD'].includes(p));


const fetchTatumMarketData = async (): Promise<Record<string, MarketSummary>> => {
  const assetIds = CRYPTO_PAIRS.map(p => p.split('/')[0]);
  try {
      const response = await axios.post('/api/tatum/market-data', { assetIds });
      const tatumData = response.data;
      const formattedData: Record<string, MarketSummary> = {};
      Object.keys(tatumData).forEach(key => {
          const asset = tatumData[key];
          const pair = `${asset.symbol}/USDT`;
          formattedData[pair] = {
              pair,
              price: parseFloat(asset.priceUsd) || 0,
              change: parseFloat(asset.changePercent24Hr) || 0,
              volume: parseFloat(asset.volumeUsd24Hr) || 0,
              high: parseFloat(asset.high) || 0,
              low: parseFloat(asset.low) || 0,
              icon: `https://static.coinpaprika.com/coin/${asset.id}/logo.png`,
          };
      });
      return formattedData;
  } catch (error) {
      console.warn("Tatum API fetch failed.", error);
      return {};
  }
};


const fetchAlphaVantageData = async (pairs: string[]): Promise<Record<string, MarketSummary>> => {
    const results: Record<string, MarketSummary> = {};
    for (const pair of pairs) {
        try {
            const [from, to] = pair.split('/');
            const response = await axios.get('/api/quote/' + (from === 'XAU' ? 'GC=F' : `${from}${to}=X`));
            const data = response.data;
            
            if (data) {
                results[pair] = {
                    pair: pair,
                    price: data.regularMarketPrice,
                    change: data.regularMarketChangePercent,
                    volume: data.regularMarketVolume,
                    high: data.regularMarketDayHigh,
                    low: data.regularMarketDayLow,
                    icon: `https://placehold.co/32x32.png` // Placeholder icon
                };
            }
        } catch (error) {
            console.warn(`Alpha Vantage API fetch for ${pair} failed.`, error);
        }
    }
    return results;
};


interface MarketContextType {
  tradingPair: string;
  changeTradingPair: (pair: string) => void;
  availablePairs: string[];
  summaryData: MarketSummary[];
  cryptoSummaryData: MarketSummary[];
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

  // --- Low-frequency API fetch to get base data ---
  useEffect(() => {
    const fetchAllBaseData = async () => {
        const cryptoData = await fetchTatumMarketData();
        const forexData = await fetchAlphaVantageData(FOREX_COMMODITY_PAIRS);
        const combinedData = {...cryptoData, ...forexData};
        
        if (Object.keys(combinedData).length > 0) {
            const summaryArray = Object.values(combinedData);
            setSummaryData(summaryArray);
            if (isSupabaseEnabled) {
                const dataToUpsert = summaryArray.map(s => ({...s, updated_at: new Date()}));
                supabase.from('market_summary_data').upsert(dataToUpsert, { onConflict: 'pair' }).then(({ error }) => {
                    if (error) console.error("Supabase summary upsert error:", error);
                });
            }
        }
    };
    
    // Initial fetch, then refetch on an interval.
    fetchAllBaseData();
    const interval = setInterval(fetchAllBaseData, 60 * 1000); // Refetch every 1 minute
    return () => clearInterval(interval);
  }, []);

  
  // --- Initial K-Line Data Population ---
  useEffect(() => {
    // This effect now only focuses on fetching historical data for the chart.
    // It no longer generates data on the client side.
    const loadInitialKlineData = async () => {
        if (!isSupabaseEnabled) {
            console.warn("Supabase is not enabled. Cannot load historical K-line data.");
            // In a real backend-driven architecture, we might fetch from a different API here
            // or show a message to the user. For now, the chart will be empty.
            return;
        }

        const fourHoursAgo = Date.now() - (4 * 60 * 60 * 1000);
        const { data, error } = await supabase
            .from('market_kline_data')
            .select('*')
            .gte('time', fourHoursAgo);

        if (error) {
            console.error("Error fetching initial k-line data from Supabase:", error);
            // Here, the frontend would traditionally call a backend endpoint to trigger
            // the data generation process.
            // e.g., await axios.post('/api/market-data/initialize');
        } else if (data) {
             const groupedData: Record<string, OHLC[]> = {};
            data.forEach(row => {
                if (!groupedData[row.trading_pair]) groupedData[row.trading_pair] = [];
                groupedData[row.trading_pair].push({
                    time: row.time,
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

    loadInitialKlineData();

  }, []); // Runs once on component mount

  
  // --- Real-time Data Subscription ---
  useEffect(() => {
    // In the new architecture, this is where we subscribe to real-time updates from the backend.
    // The backend is now responsible for all simulation, intervention, and broadcasting.
    
    if (!isSupabaseEnabled) return;

    // Example subscription to a 'market_updates' channel (this channel would be used by the backend service)
    const channel = supabase.channel('market-updates');

    channel
      .on('broadcast', { event: 'price-update' }, ({ payload }) => {
          // Payload = { summary: MarketSummary[], kline: OHLC }
          if (payload.summary) {
              setSummaryData(payload.summary);
          }
          if (payload.kline) {
              const { trading_pair } = payload.kline;
              setKlineData(prev => {
                  const updatedPairData = [...(prev[trading_pair] || []), payload.kline];
                  // Keep the data window to a reasonable size to avoid memory issues
                  if (updatedPairData.length > 20000) { // Approx 5.5 hours of 1-sec data
                      updatedPairData.shift();
                  }
                  return { ...prev, [trading_pair]: updatedPairData };
              });
          }
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('Successfully subscribed to real-time market updates!');
        }
      });
      
    // Cleanup on unmount
    return () => {
      supabase.removeChannel(channel);
    };

  }, []);


  const contextValue: MarketContextType = {
    tradingPair,
    changeTradingPair: setTradingPair,
    availablePairs: allAvailablePairs,
    summaryData,
    cryptoSummaryData: summaryData.filter(s => CRYPTO_PAIRS.includes(s.pair)),
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
