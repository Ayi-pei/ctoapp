
"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { MarketSummary, OHLC, availablePairs as allAvailablePairs } from '@/types';
import axios from 'axios';
import { useSystemSettings } from './system-settings-context';

const CRYPTO_PAIRS = allAvailablePairs.filter(p => !p.includes('-PERP') && !['XAU/USD', 'EUR/USD', 'GBP/USD'].includes(p));

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
}

// Updated to use GET and pass instruments in params
const fetchCoinDeskData = async (): Promise<Record<string, MarketSummary>> => {
     try {
        const response = await axios.get('/api/coindesk', {
            params: {
                instruments: CRYPTO_PAIRS.join(','),
            }
        });
        return response.data;
    } catch (error) {
        console.warn("CoinDesk API fetch failed.", error);
        return {};
    }
}
// --- End Data Fetching ---

// --- Optimization Constants ---
const TOTAL_SECONDS = 4 * 60 * 60; // 4 hours
const DATA_POINTS_TO_KEEP = TOTAL_SECONDS; // Keep 4 hours of 1-second data points
const BATCH_SIZE = 500; // Generate 500 points per batch
const INITIAL_BTC_PRICE = 68000;
const initialTradingPair = CRYPTO_PAIRS[0];
// --- End Optimization Constants ---

// --- Batch Data Generation ---
const generateKlineBatch = (startTimestamp: number, count: number, lastPrice: number): { batch: OHLC[], lastPrice: number } => {
    const batch: OHLC[] = [];
    let price = lastPrice;
    
    for (let i = 0; i < count; i++) {
        const time = startTimestamp + i * 1000;
        const open = price;
        const changePercent = (Math.random() - 0.5) * 0.0002; // Reduced volatility for a smoother line
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
// --- End Initial Data Generation ---


export function MarketDataProvider({ children }: { children: ReactNode }) {
    const { systemSettings } = useSystemSettings();
    const [tradingPair, setTradingPair] = useState(initialTradingPair);
    
    const [baseApiData, setBaseApiData] = useState<Record<string, MarketSummary>>({});
    
    const [summaryData, setSummaryData] = useState<MarketSummary[]>(initialSummaryData);
    const [klineData, setKlineData] = useState<Record<string, OHLC[]>>({});
    const [interventionState, setInterventionState] = useState<Record<string, { lastPrice: number }>>({});

    const getLatestPrice = useCallback((pair: string): number => {
        return summaryData.find(s => s.pair === pair)?.price || 0;
    }, [summaryData]);
    
    // Low-frequency fetch for real data from ALL external APIs. This ONLY updates the `baseApiData` buffer.
    useEffect(() => {
        let currentProvider: 'coingecko' | 'coindesk' = 'coingecko';

        const fetchRealData = async () => {
            console.log(`Fetching crypto data from: ${currentProvider}`);
            const cryptoPromise = currentProvider === 'coingecko' ? fetchCoinGeckoData() : fetchCoinDeskData();
            const cryptoData = await cryptoPromise;

            if (Object.keys(cryptoData).length > 0) {
                setBaseApiData(prevData => ({ ...prevData, ...cryptoData }));
            }
            // Rotate provider for the next call
            currentProvider = currentProvider === 'coingecko' ? 'coindesk' : 'coingecko';
        };

        fetchRealData(); // Fetch immediately on load
        const interval = setInterval(fetchRealData, 60000); // Then fetch every 60 seconds

        return () => {
            clearInterval(interval);
        };
    }, []); 
    
    // Initial data generation with asynchronous batching
    useEffect(() => {
        let isMounted = true;
        
        const loadInitialData = () => {
            let accumulatedData: Record<string, OHLC[]> = {};
            
            CRYPTO_PAIRS.forEach(pair => {
                const basePrice = baseApiData[pair]?.price || (pair === 'BTC/USDT' ? INITIAL_BTC_PRICE : Math.random() * 5000);
                let lastPrice = basePrice;
                let generatedCount = 0;
                
                function loadBatchForPair() {
                    if (!isMounted || generatedCount >= TOTAL_SECONDS) return;
                    
                    const startTimestamp = Date.now() - (TOTAL_SECONDS - generatedCount) * 1000;
                    const count = Math.min(BATCH_SIZE, TOTAL_SECONDS - generatedCount);
                    
                    const { batch, lastPrice: newPrice } = generateKlineBatch(startTimestamp, count, lastPrice);
                    
                    if (!accumulatedData[pair]) accumulatedData[pair] = [];
                    accumulatedData[pair].push(...batch);
                    
                    lastPrice = newPrice;
                    generatedCount += count;
                    
                    setKlineData(prev => ({...prev, [pair]: [...(prev[pair] || []), ...batch].slice(-DATA_POINTS_TO_KEEP)}));

                    if (generatedCount < TOTAL_SECONDS) {
                        setTimeout(loadBatchForPair, 50); // Give browser time to breathe
                    }
                }
                loadBatchForPair();
            });
        }
        
        loadInitialData();
        
        return () => { isMounted = false; }
    }, [baseApiData]);


    // High-frequency simulation logic.
    useEffect(() => {
        const simulationInterval = setInterval(() => {
            const now = new Date();
            const hours = now.getHours();
            const minutes = now.getMinutes();
            const currentTime = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
            
            const sourceForSim = Object.keys(baseApiData).length > 0
                ? Object.values(baseApiData)
                : summaryData;

            const newSimulatedSummaries = sourceForSim.map(summary => {
                let newPrice = summary.price;
                const intervention = systemSettings.marketInterventions.find(i => 
                    i.tradingPair === summary.pair && 
                    i.startTime <= currentTime && 
                    i.endTime >= currentTime
                );
                
                if (intervention) {
                    const { minPrice, maxPrice, trend } = intervention;
                    const priceRange = maxPrice - minPrice;
                    let lastInterventionPrice = interventionState[summary.pair]?.lastPrice;
                    
                    if (!lastInterventionPrice || lastInterventionPrice < minPrice || lastInterventionPrice > maxPrice) {
                        lastInterventionPrice = (minPrice + maxPrice) / 2;
                    }
                    
                    if (trend === 'up') {
                        newPrice = lastInterventionPrice + priceRange * 0.01;
                         if (newPrice > maxPrice) newPrice = minPrice;
                    } else if (trend === 'down') {
                        newPrice = lastInterventionPrice - priceRange * 0.01;
                        if (newPrice < minPrice) newPrice = maxPrice;
                    } else {
                        newPrice = lastInterventionPrice + (Math.random() - 0.5) * (priceRange * 0.05);
                    }

                    newPrice = Math.max(minPrice, Math.min(maxPrice, newPrice));
                    setInterventionState(prev => ({...prev, [summary.pair]: { lastPrice: newPrice }}));

                } else {
                    const volatility = 0.0001;
                    newPrice *= (1 + (Math.random() - 0.5) * volatility);
                }

                return { ...summary, price: newPrice };
            });

            setSummaryData(newSimulatedSummaries);

            setKlineData(prevKline => {
                const newKline = { ...prevKline };
                newSimulatedSummaries.forEach(summary => {
                    const pairData = newKline[summary.pair] || [];
                    const lastDataPoint = pairData.length > 0 ? pairData[pairData.length - 1] : null;
                    const currentPrice = summary.price;
                    const nowTime = now.getTime();

                    const newPoint: OHLC = {
                        time: nowTime,
                        open: lastDataPoint?.close || currentPrice,
                        high: currentPrice,
                        low: currentPrice,
                        close: currentPrice,
                    };
                    newKline[summary.pair] = [...pairData, newPoint].slice(-DATA_POINTS_TO_KEEP); 
                });
                return newKline;
            });

        }, 1000);

        return () => clearInterval(simulationInterval);
    }, [baseApiData, systemSettings.marketInterventions, summaryData, interventionState]);

    const contextValue: MarketContextType = {
        tradingPair,
        changeTradingPair: setTradingPair,
        availablePairs: CRYPTO_PAIRS,
        summaryData,
        cryptoSummaryData: summaryData.filter(s => CRYPTO_PAIRS.includes(s.pair)),
        klineData,
        getLatestPrice,
    };

    return (
        <MarketContext.Provider value={contextValue}>
            {children}
        </MarketContext.Provider>
    );
}

export function useMarket() {
    const context = useContext(MarketContext);
    if (context === undefined) {
        throw new Error('useMarket must be used within a MarketDataProvider');
    }
    return context;
}
