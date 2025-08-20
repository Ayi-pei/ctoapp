
"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { availablePairs as allAvailablePairs, MarketSummary, OHLC } from '@/types';
import axios from 'axios';
import { useSystemSettings } from './system-settings-context';

// We are focusing only on crypto pairs now.
const CRYPTO_PAIRS = allAvailablePairs;

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

const fetchCoinDeskData = async (): Promise<Record<string, MarketSummary>> => {
     try {
        const response = await axios.get('/api/coindesk');
        return response.data;
    } catch (error) {
        console.warn("CoinDesk API fetch failed.", error);
        return {};
    }
}
// --- End Data Fetching ---

export function MarketDataProvider({ children }: { children: ReactNode }) {
    const { systemSettings } = useSystemSettings();
    const [tradingPair, setTradingPair] = useState(CRYPTO_PAIRS[0]);
    
    // This is the "buffer" for real data fetched from APIs. It's the source of truth for the simulator.
    const [baseApiData, setBaseApiData] = useState<Record<string, MarketSummary>>({});
    
    // These states are DERIVED from the simulation and are used to render the UI.
    const [summaryData, setSummaryData] = useState<MarketSummary[]>([]);
    const [klineData, setKlineData] = useState<Record<string, OHLC[]>>({});

    const [cryptoProvider, setCryptoProvider] = useState<'coingecko' | 'coindesk'>('coingecko');

    const getLatestPrice = useCallback((pair: string): number => {
        return summaryData.find(s => s.pair === pair)?.price || 0;
    }, [summaryData]);
    
    // Low-frequency fetch for real data from ALL external APIs.
    // This useEffect ONLY updates the `baseApiData` buffer.
    useEffect(() => {
        const fetchRealData = async () => {
            console.log(`Fetching crypto data from: ${cryptoProvider}`);
            
            const cryptoPromise = cryptoProvider === 'coingecko' ? fetchCoinGeckoData() : fetchCoinDeskData();
            const cryptoData = await cryptoPromise;

            if(Object.keys(cryptoData).length > 0) {
                 setBaseApiData(prevData => ({ ...prevData, ...cryptoData }));
            }

            // Rotate provider for the next fetch cycle
            setCryptoProvider(prev => prev === 'coingecko' ? 'coindesk' : 'coingecko');
        };

        fetchRealData(); // Initial fetch
        const interval = setInterval(fetchRealData, 60000); // Fetch every 60 seconds

        return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [cryptoProvider]); 

    // High-frequency simulation logic. Reads from `baseApiData` and updates UI-facing states.
    useEffect(() => {
        const simulationInterval = setInterval(() => {
            if (Object.keys(baseApiData).length === 0) return;

            const now = new Date();
            const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
            
            // Determine the source for the simulation: either the current `summaryData` or the `baseApiData` if empty
            const sourceForSim = summaryData.length > 0 ? summaryData : Object.values(baseApiData);

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
                    if (trend === 'up') {
                        newPrice = minPrice + ((newPrice - minPrice + priceRange * 0.05) % priceRange);
                    } else if (trend === 'down') {
                        newPrice = maxPrice - ((maxPrice - newPrice + priceRange * 0.05) % priceRange);
                    } else {
                        newPrice += (Math.random() - 0.5) * (priceRange * 0.1);
                        newPrice = Math.max(minPrice, Math.min(maxPrice, newPrice));
                    }
                } else {
                    const volatility = 0.0005; // Standard small volatility
                    newPrice *= (1 + (Math.random() - 0.5) * volatility);
                }

                return { ...summary, price: newPrice };
            });

            // Update the UI-facing summary data with the new simulated prices
            setSummaryData(newSimulatedSummaries);

            // Update the UI-facing kline data based on the new simulated prices
            setKlineData(prevKline => {
                const newKline = { ...prevKline };
                newSimulatedSummaries.forEach(summary => {
                    const pairData = newKline[summary.pair] || [];
                    const lastDataPoint = pairData.length > 0 ? pairData[pairData.length - 1] : null;
                    const currentPrice = summary.price;

                    const nowTime = now.getTime();
                    // Check if we are in a new 1-minute window
                    if (lastDataPoint && nowTime - lastDataPoint.time < 60000) {
                        // Update the last point in the same window
                        lastDataPoint.close = currentPrice;
                        lastDataPoint.high = Math.max(lastDataPoint.high, currentPrice);
                        lastDataPoint.low = Math.min(lastDataPoint.low, currentPrice);
                    } else {
                        // Add a new point for the new window
                        const newPoint: OHLC = {
                            time: nowTime,
                            open: lastDataPoint?.close || currentPrice,
                            high: currentPrice,
                            low: currentPrice,
                            close: currentPrice,
                        };
                        newKline[summary.pair] = [...pairData, newPoint].slice(-200); // Keep max 200 points
                    }
                });
                return newKline;
            });

        }, 2000); // Simulate every 2 seconds

        return () => clearInterval(simulationInterval);
    }, [baseApiData, summaryData, systemSettings.marketInterventions]);

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
