
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
const fetchCoinGeckoData = async (): Promise<Record<string, MarketSummary>> => {
  const coingeckoIds = CRYPTO_PAIRS.map(pair => apiIdMap[pair]?.coingecko).filter(Boolean) as string[];
  try {
    const response = await axios.post('/api/coingecko', { assetIds: coingeckoIds });
    return response.data;
  } catch (error) {
    console.warn("CoinGecko API fetch failed.", error);
    return {};
  }
};

const fetchCoinDeskData = async (): Promise<Record<string, MarketSummary>> => {
  try {
    const response = await axios.get('/api/coindesk', { params: { instruments: CRYPTO_PAIRS.join(',') } });
    return response.data;
  } catch (error) {
    console.warn("CoinDesk API fetch failed.", error);
    return {};
  }
};

const fetchAlphaVantageData = async (pairs: string[]): Promise<Record<string, MarketSummary>> => {
    const results: Record<string, MarketSummary> = {};
    for (const pair of pairs) {
        try {
            const [from, to] = pair.split('/');
            // For XAU, the API requires a physical currency like USD as the 'to' currency.
            // This is a simplification and might need adjustment for other commodities.
            const fromCurrency = from === 'XAU' ? 'GOLD' : from;
            const toCurrency = to === 'XAU' ? 'USD' : to;

            const response = await axios.get('https://www.alphavantage.co/query', {
                params: {
                    function: 'CURRENCY_EXCHANGE_RATE',
                    from_currency: fromCurrency,
                    to_currency: toCurrency,
                    apikey: process.env.NEXT_PUBLIC_ALPHA_VANTAGE_API_KEY
                }
            });
            const data = response.data['Realtime Currency Exchange Rate'];
            if (data) {
                results[pair] = {
                    pair: pair,
                    price: parseFloat(data['5. Exchange Rate']),
                    change: 0, // Alpha Vantage free tier doesn't provide change %
                    volume: 0,
                    high: 0,
                    low: 0,
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
const INITIAL_BTC_PRICE = 70000;
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
  const { systemSettings } = useSystemSettings();
  const [tradingPair, setTradingPair] = useState(initialTradingPair);

  const [baseApiData, setBaseApiData] = useState<Record<string, MarketSummary>>({});
  const [summaryData, setSummaryData] = useState<MarketSummary[]>(initialSummaryData);
  const [klineData, setKlineData] = useState<Record<string, OHLC[]>>({});
  const [interventionState, setInterventionState] = useState<Record<string, { lastPrice: number }>>({});
  const [isInitialLoadComplete, setIsInitialLoadComplete] = useState(false);

  const getLatestPrice = useCallback((pair: string) => {
    return summaryData.find(s => s.pair === pair)?.price || 0;
  }, [summaryData]);

  // --- Low-frequency API fetch ---
  useEffect(() => {
    let cryptoProvider: 'coingecko' | 'coindesk' = 'coingecko';

    const fetchRealData = async () => {
        // Fetch crypto data (every 1 min)
        const cryptoData = cryptoProvider === 'coingecko' ? await fetchCoinGeckoData() : await fetchCoinDeskData();
        if (Object.keys(cryptoData).length > 0) {
            setBaseApiData(prev => ({ ...prev, ...cryptoData }));
        }
        cryptoProvider = cryptoProvider === 'coingecko' ? 'coindesk' : 'coingecko';
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
          setIsInitialLoadComplete(true);
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
      setIsInitialLoadComplete(true);
    };

    if (baseApiData && Object.keys(baseApiData).length > 0) {
       loadInitialData();
    }
    

    return () => { isMounted = false; }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [baseApiData]);


  // --- High-frequency simulation ---
  useEffect(() => {
    if (!isInitialLoadComplete) return;

    const simulationInterval = setInterval(() => {
      const now = new Date();
      const currentTime = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;
      
      setSummaryData(prevSummary => {
          // Use baseApiData as the source of truth for which pairs to simulate
          const pairsToSimulate = Object.keys(baseApiData);
          if (pairsToSimulate.length === 0) return prevSummary;
          
          return pairsToSimulate.map(pair => {
            const currentSummary = prevSummary.find(s => s.pair === pair) || baseApiData[pair];
            let newPrice = currentSummary.price;
            const intervention = systemSettings.marketInterventions.find(i => i.tradingPair === pair && i.startTime <= currentTime && i.endTime >= currentTime);
            
            if (intervention) {
                const { minPrice, maxPrice, trend } = intervention;
                setInterventionState(prevIntervention => {
                    let lastInterventionPrice = prevIntervention[pair]?.lastPrice;
                    if (!lastInterventionPrice || lastInterventionPrice < minPrice || lastInterventionPrice > maxPrice) {
                        lastInterventionPrice = (minPrice + maxPrice) / 2;
                    }
                    if (trend === 'up') { newPrice = lastInterventionPrice + (maxPrice - minPrice) * 0.01; if (newPrice > maxPrice) newPrice = minPrice; }
                    else if (trend === 'down') { newPrice = lastInterventionPrice - (maxPrice - minPrice) * 0.01; if (newPrice < minPrice) newPrice = maxPrice; }
                    else { newPrice = lastInterventionPrice + (Math.random() - 0.5) * ((maxPrice - minPrice) * 0.05); }
                    newPrice = Math.max(minPrice, Math.min(maxPrice, newPrice));
                    return { ...prevIntervention, [pair]: { lastPrice: newPrice } };
                });
            } else {
              newPrice *= (1 + (Math.random() - 0.5) * 0.0001);
            }
            return { ...currentSummary, price: newPrice };
          })
      });

      setKlineData(prevKline => {
        const newKline = { ...prevKline };
        const nowTime = now.getTime();
        Object.keys(prevKline).forEach(pair => {
            const pairData = newKline[pair] || [];
            const lastDataPoint = pairData.length > 0 ? pairData[pairData.length - 1] : null;
            const currentPrice = getLatestPrice(pair);
            if (currentPrice > 0) {
              const newPoint: OHLC = { time: nowTime, open: lastDataPoint?.close || currentPrice, high: currentPrice, low: currentPrice, close: currentPrice, trading_pair: pair };
              newKline[pair] = [...pairData, newPoint].slice(-DATA_POINTS_TO_KEEP);
            }
        });
        return newKline;
      });

    }, 1000);

    return () => clearInterval(simulationInterval);
  }, [baseApiData, systemSettings.marketInterventions, getLatestPrice, isInitialLoadComplete]);

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
