
"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { MarketSummary, OHLC, availablePairs as allAvailablePairs } from '@/types';
import axios from 'axios';
import { useSystemSettings } from './system-settings-context';
import { supabase, isSupabaseEnabled } from '@/lib/supabaseClient';


const CRYPTO_PAIRS = allAvailablePairs.filter(p => !p.includes('-PERP') && !['XAU/USD', 'EUR/USD', 'GBP/USD'].includes(p));
const FOREX_COMMODITY_PAIRS = allAvailablePairs.filter(p => ['XAU/USD', 'EUR/USD', 'GBP/USD'].includes(p));


const apiIdMap: Record<string, { coingecko?: string; }> = {
  'BTC/USDT': { coingecko: 'bitcoin' },
  'ETH/USDT': { coingecko: 'ethereum' },
  'SOL/USDT': { coingecko: 'solana' },
  'XRP/USDT': { coingecko: 'ripple' },
  'LTC/USDT': { coingecko: 'litecoin' },
  'BNB/USDT': { coingecko: 'binancecoin' },
  'MATIC/USDT': { coingecko: 'matic-network' },
  'DOGE/USDT': { coingecko: 'dogecoin' },
  'ADA/USDT': { coingecko: 'cardano' },
  'SHIB/USDT': { coingecko: 'shiba-inu' },
  'AVAX/USDT': { coingecko: 'avalanche-2' },
  'LINK/USDT': { coingecko: 'chainlink' },
  'DOT/USDT': { coingecko: 'polkadot' },
  'UNI/USDT': { coingecko: 'uniswap' },
  'TRX/USDT': { coingecko: 'tron' },
  'XLM/USDT': { coingecko: 'stellar' },
  'VET/USDT': { coingecko: 'vechain' },
  'EOS/USDT': { coingecko: 'eos' },
  'FIL/USDT': { coingecko: 'filecoin' },
  'ICP/USDT': { coingecko: 'internet-computer' },
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

// --- Data Fetching ---
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


// --- Constants ---
const TOTAL_SECONDS = 4 * 60 * 60; // 4 hours
const DATA_POINTS_TO_KEEP = TOTAL_SECONDS;
const BATCH_SIZE = 500;
const INITIAL_BTC_PRICE = parseFloat((Math.random() * (130000 - 110000) + 110000).toFixed(2));
const INITIAL_ETH_PRICE = 3800;
const initialTradingPair = CRYPTO_PAIRS[0];
// --- End Constants ---

// --- Batch Generator ---
const generateKlineBatch = (startTimestamp: number, count: number, lastPrice: number) => {
  const batch: Omit<OHLC, 'trading_pair'>[] = [];
  let price = lastPrice;

  for (let i = 0; i < count; i++) {
    const time = startTimestamp + i * 1000;
    const open = price;
    const changePercent = (Math.random() - 0.5) * 0.0002;
    const close = open * (1 + changePercent);
    const high = Math.max(open, close) * (1 + Math.random() * 0.0001);
    const low = Math.min(open, close) * (1 - Math.random() * 0.0001);
    batch.push({ time, open, high, low, close });
    price = close;
  }

  return { batch, lastPrice: price };
};

const initialSummaryData: MarketSummary[] = [{
  pair: initialTradingPair,
  price: INITIAL_BTC_PRICE,
  change: 1.5,
  volume: 50000,
  high: INITIAL_BTC_PRICE * 1.02,
  low: INITIAL_BTC_PRICE * 0.98,
  icon: 'https://assets.coingecko.com/coins/images/1/large/bitcoin.png'
}];

// --- Provider ---
export function MarketDataProvider({ children }: { children: ReactNode }) {
  const [tradingPair, setTradingPair] = useState(initialTradingPair);
  const [baseApiData, setBaseApiData] = useState<Record<string, MarketSummary>>({});
  const [summaryData, setSummaryData] = useState<MarketSummary[]>(initialSummaryData);
  const [klineData, setKlineData] = useState<Record<string, OHLC[]>>({});

  const getLatestPrice = useCallback((pair: string) => {
    return summaryData.find(s => s.pair === pair)?.price || 0;
  }, [summaryData]);

  // --- Low-frequency API fetch ---
  useEffect(() => {
    const fetchRealData = async () => {
        const cryptoData = await fetchTatumMarketData();
        if (Object.keys(cryptoData).length > 0) {
            setBaseApiData(prev => ({ ...prev, ...cryptoData }));
        }
    };

    const fetchForexAndCommodityData = async () => {
        const forexData = await fetchAlphaVantageData(FOREX_COMMODITY_PAIRS);
         if (Object.keys(forexData).length > 0) {
            setBaseApiData(prev => ({ ...prev, ...forexData }));
        }
    };

    // Initial fetch
    fetchRealData(); 
    fetchForexAndCommodityData();

    // Set up intervals
    const cryptoInterval = setInterval(fetchRealData, 60000); // 1 minute
    const forexInterval = setInterval(fetchForexAndCommodityData, 60 * 60 * 1000); // 1 hour

    return () => {
        clearInterval(cryptoInterval);
        clearInterval(forexInterval);
    };
  }, []);

  // --- Initial Kline Data Generation & DB Sync ---
  useEffect(() => {
    let isMounted = true;
    
    const generateAndStoreData = async () => {
      console.warn("Database is empty or fetch failed. Generating initial simulation data for crypto pairs...");
      for (const pair of CRYPTO_PAIRS) {
          const getBasePrice = () => {
              if (baseApiData[pair]?.price) return baseApiData[pair].price;
              if (pair === 'BTC/USDT') return INITIAL_BTC_PRICE;
              if (pair === 'ETH/USDT') return INITIAL_ETH_PRICE;
              return Math.random() * 5000 + 1;
          }
          let lastPrice = getBasePrice();
          let generatedCount = 0;

          const loadBatchForPair = async () => {
              if (!isMounted || generatedCount >= TOTAL_SECONDS) return;

              const startTimestamp = Date.now() - (TOTAL_SECONDS - generatedCount) * 1000;
              const count = Math.min(BATCH_SIZE, TOTAL_SECONDS - generatedCount);
              const { batch, lastPrice: newPrice } = generateKlineBatch(startTimestamp, count, lastPrice);

              if (isSupabaseEnabled) {
                  const dbBatch = batch.map(d => ({ 
                      trading_pair: pair, 
                      time: d.time,
                      open: d.open, 
                      high: d.high, 
                      low: d.low, 
                      close: d.close 
                  }));
                  await supabase.from('market_kline_data').insert(dbBatch);
              }
              
              lastPrice = newPrice;
              generatedCount += count;
              
              setKlineData(prev => ({ ...prev, [pair]: [...(prev[pair] || []), ...batch.map(d => ({...d, trading_pair: pair}))].slice(-DATA_POINTS_TO_KEEP) }));

              if (generatedCount < TOTAL_SECONDS) {
                setTimeout(loadBatchForPair, 50);
              }
          }
          await loadBatchForPair();
      }
    }

    const loadInitialData = async () => {
      if (!isSupabaseEnabled) {
          console.warn("Supabase not enabled, generating transient simulation data.");
          await generateAndStoreData();
          return;
      }

      const fourHoursAgo = Date.now() - TOTAL_SECONDS * 1000;
      const { data: dbData, error } = await supabase
          .from('market_kline_data')
          .select('*')
          .gte('time', fourHoursAgo);

      if (error) {
          console.error("Error fetching kline from supabase, falling back to generation.", error);
          await generateAndStoreData();
      } else if (dbData && dbData.length > 0) {
          console.log("Loaded initial k-line data from Supabase.");
          const groupedData: Record<string, OHLC[]> = {};
          dbData.forEach(row => {
              if (!groupedData[row.trading_pair]) {
                  groupedData[row.trading_pair] = [];
              }
              groupedData[row.trading_pair].push({ 
                  time: row.time,
                  open: row.open, 
                  high: row.high, 
                  low: row.low, 
                  close: row.close 
              });
          });
          Object.keys(groupedData).forEach(pair => {
              groupedData[pair].sort((a, b) => a.time - b.time);
          });
          setKlineData(groupedData);
      } else {
          await generateAndStoreData();
      }
    };

    if (baseApiData && Object.keys(baseApiData).length > 0) {
       loadInitialData();
    }
    

    return () => { isMounted = false; }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [baseApiData]);


  // Placeholder for real-time subscription logic
  useEffect(() => {
    // TODO: Implement Supabase Realtime subscription here
    // This subscription will listen for new data broadcasted from the backend
    // and call setSummaryData and setKlineData to update the state.
    //
    // Example:
    // const channel = supabase.channel('market-data');
    // channel
    //   .on('broadcast', { event: 'new-tick' }, ({ payload }) => {
    //     // payload might contain { summary: newSummaryData, kline: newKlinePoint }
    //     setSummaryData(payload.summary);
    //     setKlineData(prev => ({
    //         ...prev,
    //         [payload.kline.trading_pair]: [...prev[payload.kline.trading_pair], payload.kline].slice(-DATA_POINTS_TO_KEEP)
    //     }));
    //   })
    //   .subscribe();
    //
    // return () => {
    //   supabase.removeChannel(channel);
    // };
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
