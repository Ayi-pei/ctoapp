"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { MarketSummary, OHLC, availablePairs as allAvailablePairs } from '@/types';
import axios from 'axios';
import { useEnhancedSystemSettings } from './enhanced-system-settings-context';
import { supabase, isSupabaseEnabled } from '@/lib/supabaseClient';

const CRYPTO_PAIRS = allAvailablePairs.filter(p => !p.includes('-PERP') && !['XAU/USD', 'EUR/USD', 'GBP/USD'].includes(p));
const FOREX_COMMODITY_PAIRS = allAvailablePairs.filter(p => ['XAU/USD', 'EUR/USD', 'GBP/USD'].includes(p));

// --- Enhanced Constants ---
const TOTAL_SECONDS = 4 * 60 * 60; // 4 hours
const DATA_POINTS_TO_KEEP = TOTAL_SECONDS;
const BATCH_SIZE = 500;

// 生成11万-13万之间的随机价格，保留两位小数
const generateRandomPrice = (min: number, max: number): number => {
  return Math.round((Math.random() * (max - min) + min) * 100) / 100;
};

const INITIAL_BTC_PRICE = generateRandomPrice(110000, 130000);
const INITIAL_ETH_PRICE = generateRandomPrice(5500, 7500);
const initialTradingPair = CRYPTO_PAIRS[0];

// 价格平滑过渡配置
const PRICE_TRANSITION_DURATION = 30000; // 30秒平滑过渡
const PRICE_TRANSITION_STEPS = 30; // 30步完成过渡

// --- Enhanced Interfaces ---
interface PriceTransition {
  fromPrice: number;
  toPrice: number;
  startTime: number;
  duration: number;
  isActive: boolean;
}

interface InterventionLog {
  id: string;
  interventionId: string;
  tradingPair: string;
  timestamp: number;
  originalPrice: number;
  adjustedPrice: number;
  reason: string;
  adminId?: string;
  priceDeviation: number;
}

interface EnhancedMarketIntervention {
  id: string;
  tradingPair: string;
  startTime: string;
  endTime: string;
  minPrice: number;
  maxPrice: number;
  trend: 'up' | 'down' | 'random';
  startDate?: string;
  endDate?: string;
  timezone?: string;
  recurring?: {
    type: 'daily' | 'weekly' | 'monthly';
    days?: number[];
  };
}

interface MarketContextType {
  tradingPair: string;
  changeTradingPair: (pair: string) => void;
  availablePairs: string[];
  summaryData: MarketSummary[];
  cryptoSummaryData: MarketSummary[];
  klineData: Record<string, OHLC[]>;
  getLatestPrice: (pair: string) => number;
  interventionLogs: InterventionLog[];
  priceTransitions: Record<string, PriceTransition>;
}

// --- Enhanced Time Logic ---
const isInterventionActive = (intervention: any, now: Date): boolean => {
  const currentTime = now.getHours() * 60 + now.getMinutes();
  const [startHour, startMin] = intervention.startTime.split(':').map(Number);
  const [endHour, endMin] = intervention.endTime.split(':').map(Number);
  
  const startMinutes = startHour * 60 + startMin;
  const endMinutes = endHour * 60 + endMin;
  
  // 处理跨日情况 (例如: 23:00 - 01:00)
  if (startMinutes > endMinutes) {
    return currentTime >= startMinutes || currentTime <= endMinutes;
  }
  
  // 正常情况 (例如: 09:00 - 17:00)
  return currentTime >= startMinutes && currentTime <= endMinutes;
};

// --- Price Smoothing Functions ---
const easeInOut = (t: number): number => {
  return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
};

const calculateSmoothPrice = (
  fromPrice: number,
  toPrice: number,
  startTime: number,
  duration: number,
  currentTime: number
): number => {
  const elapsed = currentTime - startTime;
  if (elapsed <= 0) return fromPrice;
  if (elapsed >= duration) return toPrice;
  
  const progress = elapsed / duration;
  const easedProgress = easeInOut(progress);
  
  return fromPrice + (toPrice - fromPrice) * easedProgress;
};

// --- API Mapping ---
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

// --- Data Fetching Functions ---
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
          change: 0,
          volume: 0,
          high: 0,
          low: 0,
          icon: `https://placehold.co/32x32.png`
        };
      }
    } catch (error) {
      console.warn(`Alpha Vantage API fetch for ${pair} failed.`, error);
    }
  }
  return results;
};

// --- Enhanced Batch Generator ---
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
    
    // 确保价格保留两位小数
    batch.push({ 
      time, 
      open: Math.round(open * 100) / 100, 
      high: Math.round(high * 100) / 100, 
      low: Math.round(low * 100) / 100, 
      close: Math.round(close * 100) / 100 
    });
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

const MarketContext = createContext<MarketContextType | undefined>(undefined);

// --- Enhanced Provider ---
export function EnhancedMarketDataProvider({ children }: { children: ReactNode }) {
  const { systemSettings } = useEnhancedSystemSettings();
  const [tradingPair, setTradingPair] = useState(initialTradingPair);

  const [baseApiData, setBaseApiData] = useState<Record<string, MarketSummary>>({});
  const [summaryData, setSummaryData] = useState<MarketSummary[]>(initialSummaryData);
  const [klineData, setKlineData] = useState<Record<string, OHLC[]>>({});
  const [interventionState, setInterventionState] = useState<Record<string, { lastPrice: number }>>({});
  const [priceTransitions, setPriceTransitions] = useState<Record<string, PriceTransition>>({});
  const [interventionLogs, setInterventionLogs] = useState<InterventionLog[]>([]);
  const [isInitialLoadComplete, setIsInitialLoadComplete] = useState(false);

  const getLatestPrice = useCallback((pair: string) => {
    return summaryData.find(s => s.pair === pair)?.price || 0;
  }, [summaryData]);

  // --- Enhanced Intervention Logging ---
  const logIntervention = useCallback((log: Omit<InterventionLog, 'id' | 'timestamp'>) => {
    const newLog: InterventionLog = {
      ...log,
      id: `intv_log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
    };
    
    setInterventionLogs(prev => [newLog, ...prev].slice(0, 1000)); // 保留最近1000条记录
    
    // 异常价格变动告警
    if (newLog.priceDeviation > 0.1) {
      console.warn('Large price intervention detected:', newLog);
    }
  }, []);

  // --- Price Transition Management ---
  const initiatePriceTransition = useCallback((
    pair: string,
    fromPrice: number,
    toPrice: number,
    duration: number = PRICE_TRANSITION_DURATION
  ) => {
    setPriceTransitions(prev => ({
      ...prev,
      [pair]: {
        fromPrice,
        toPrice,
        startTime: Date.now(),
        duration,
        isActive: true
      }
    }));

    // 自动清理过期的过渡状态
    setTimeout(() => {
      setPriceTransitions(prev => ({
        ...prev,
        [pair]: { ...prev[pair], isActive: false }
      }));
    }, duration);
  }, []);

  // --- Low-frequency API fetch ---
  useEffect(() => {
    let cryptoProvider: 'coingecko' | 'coindesk' = 'coingecko';

    const fetchRealData = async () => {
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

    fetchRealData();
    fetchForexAndCommodityData();

    const cryptoInterval = setInterval(fetchRealData, 60000);
    const forexInterval = setInterval(fetchForexAndCommodityData, 60 * 60 * 1000);

    return () => {
      clearInterval(cryptoInterval);
      clearInterval(forexInterval);
    };
  }, []);

  // --- Initial Data Generation ---
  useEffect(() => {
    let isMounted = true;
    
    const generateAndStoreData = async () => {
      console.warn("Generating enhanced simulation data with improved pricing...");
      for (const pair of CRYPTO_PAIRS) {
        const getBasePrice = () => {
          if (baseApiData[pair]?.price) return baseApiData[pair].price;
          if (pair === 'BTC/USDT') return INITIAL_BTC_PRICE;
          if (pair === 'ETH/USDT') return INITIAL_ETH_PRICE;
          return generateRandomPrice(1000, 10000);
        };
        
        let lastPrice = getBasePrice();
        let generatedCount = 0;

        const loadBatchForPair = async () => {
          try {
            if (!isMounted || generatedCount >= TOTAL_SECONDS) return;

            const startTimestamp = Date.now() - (TOTAL_SECONDS - generatedCount) * 1000;
            const count = Math.min(BATCH_SIZE, TOTAL_SECONDS - generatedCount);
            
            // 确保 generateKlineBatch 函数存在
            if (typeof generateKlineBatch !== 'function') {
              console.error('generateKlineBatch function not found');
              return;
            }
            
            const { batch, lastPrice: newPrice } = generateKlineBatch(startTimestamp, count, lastPrice);

            if (isSupabaseEnabled && batch && batch.length > 0) {
              try {
                const dbBatch = batch.map(d => ({ 
                  trading_pair: pair, 
                  time: d.time,
                  open: d.open, 
                  high: d.high, 
                  low: d.low, 
                  close: d.close 
                }));
                await supabase.from('market_kline_data').insert(dbBatch);
              } catch (dbError) {
                console.warn('Database insert failed:', dbError);
              }
            }
            
            lastPrice = newPrice;
            generatedCount += count;
            
            if (batch && batch.length > 0) {
              setKlineData(prev => ({ 
                ...prev, 
                [pair]: [...(prev[pair] || []), ...batch.map(d => ({...d, trading_pair: pair}))].slice(-DATA_POINTS_TO_KEEP) 
              }));
            }

            if (generatedCount < TOTAL_SECONDS && isMounted) {
              setTimeout(loadBatchForPair, 50);
            }
          } catch (error) {
            console.error('Error in loadBatchForPair:', error);
          }
        };
        await loadBatchForPair();
      }
    };

    const loadInitialData = async () => {
      if (!isSupabaseEnabled) {
        await generateAndStoreData();
        setIsInitialLoadComplete(true);
        return;
      }

      const fourHoursAgo = Date.now() - TOTAL_SECONDS * 1000;
      const { data: dbData, error } = await supabase
        .from('market_kline_data')
        .select('*')
        .gte('time', fourHoursAgo);

      if (error || !dbData || dbData.length === 0) {
        await generateAndStoreData();
      } else {
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
      }
      setIsInitialLoadComplete(true);
    };

    if (baseApiData && Object.keys(baseApiData).length > 0) {
      loadInitialData();
    }

    return () => { isMounted = false; };
  }, [baseApiData]);

  // --- Enhanced High-frequency simulation ---
  useEffect(() => {
    if (!isInitialLoadComplete) return;

    const simulationInterval = setInterval(() => {
      const now = new Date();
      const currentTime = Date.now();
      
      setSummaryData(prevSummary => {
        const pairsToSimulate = Object.keys(baseApiData);
        if (pairsToSimulate.length === 0) return prevSummary;
        
        return pairsToSimulate.map(pair => {
          const currentSummary = prevSummary.find(s => s.pair === pair) || baseApiData[pair];
          let newPrice = currentSummary.price;
          const originalPrice = newPrice;
          
          // 检查是否有活跃的干预
          const activeIntervention = systemSettings.marketInterventions.find(i => 
            i.tradingPair === pair && isInterventionActive(i, now)
          );
          
          if (activeIntervention) {
            const { minPrice, maxPrice, trend } = activeIntervention;
            
            setInterventionState(prevIntervention => {
              let lastInterventionPrice = prevIntervention[pair]?.lastPrice;
              if (!lastInterventionPrice || lastInterventionPrice < minPrice || lastInterventionPrice > maxPrice) {
                lastInterventionPrice = (minPrice + maxPrice) / 2;
              }
              
              // 根据趋势生成新价格
              if (trend === 'up') {
                newPrice = lastInterventionPrice + (maxPrice - minPrice) * 0.01;
                if (newPrice > maxPrice) newPrice = minPrice;
              } else if (trend === 'down') {
                newPrice = lastInterventionPrice - (maxPrice - minPrice) * 0.01;
                if (newPrice < minPrice) newPrice = maxPrice;
              } else {
                newPrice = lastInterventionPrice + (Math.random() - 0.5) * ((maxPrice - minPrice) * 0.05);
              }
              
              newPrice = Math.max(minPrice, Math.min(maxPrice, newPrice));
              newPrice = Math.round(newPrice * 100) / 100; // 保留两位小数
              
              // 记录干预日志
              const priceDeviation = Math.abs(newPrice - originalPrice) / originalPrice;
              logIntervention({
                interventionId: activeIntervention.id,
                tradingPair: pair,
                originalPrice,
                adjustedPrice: newPrice,
                reason: `Trend: ${trend}, Range: ${minPrice}-${maxPrice}`,
                priceDeviation
              });
              
              return { ...prevIntervention, [pair]: { lastPrice: newPrice } };
            });
          } else {
            // 检查是否有价格过渡
            const transition = priceTransitions[pair];
            if (transition && transition.isActive) {
              newPrice = calculateSmoothPrice(
                transition.fromPrice,
                transition.toPrice,
                transition.startTime,
                transition.duration,
                currentTime
              );
            } else {
              // 正常市场波动
              newPrice *= (1 + (Math.random() - 0.5) * 0.0001);
            }
            newPrice = Math.round(newPrice * 100) / 100; // 保留两位小数
          }
          
          return { ...currentSummary, price: newPrice };
        });
      });

      // 更新K线数据
      setKlineData(prevKline => {
        const newKline = { ...prevKline };
        const nowTime = now.getTime();
        Object.keys(prevKline).forEach(pair => {
          const pairData = newKline[pair] || [];
          const lastDataPoint = pairData.length > 0 ? pairData[pairData.length - 1] : null;
          const currentPrice = getLatestPrice(pair);
          if (currentPrice > 0) {
            const newPoint: OHLC = { 
              time: nowTime, 
              open: lastDataPoint?.close || currentPrice, 
              high: currentPrice, 
              low: currentPrice, 
              close: currentPrice, 
              trading_pair: pair 
            };
            newKline[pair] = [...pairData, newPoint].slice(-DATA_POINTS_TO_KEEP);
          }
        });
        return newKline;
      });

    }, 1000);

    return () => clearInterval(simulationInterval);
  }, [baseApiData, systemSettings.marketInterventions, getLatestPrice, isInitialLoadComplete, priceTransitions, logIntervention]);

  const contextValue: MarketContextType = {
    tradingPair,
    changeTradingPair: setTradingPair,
    availablePairs: allAvailablePairs,
    summaryData,
    cryptoSummaryData: summaryData.filter(s => CRYPTO_PAIRS.includes(s.pair)),
    klineData,
    getLatestPrice,
    interventionLogs,
    priceTransitions,
  };

  return <MarketContext.Provider value={contextValue}>{children}</MarketContext.Provider>;
}

export function useEnhancedMarket() {
  const context = useContext(MarketContext);
  if (!context) throw new Error('useEnhancedMarket must be used within an EnhancedMarketDataProvider');
  return context;
}