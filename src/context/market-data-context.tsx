
"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { availablePairs, MarketSummary, OHLC } from '@/types';
import axios from 'axios';
import { useSystemSettings } from './system-settings-context';

const CRYPTO_PAIRS = availablePairs;

const apiIdMap: Record<string, { coingecko?: string; iconId?: string; }> = {
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
    const [tradingPair, setTradingPair] = useState(availablePairs[0]);
    const [klineData, setKlineData] = useState<Record<string, OHLC[]>>({});
    const [summaryData, setSummaryData] = useState<MarketSummary[]>([]);
    
    // This is the "buffer" for real data fetched from APIs
    const [baseApiData, setBaseApiData] = useState<Record<string, MarketSummary>>({});
    const [cryptoProvider, setCryptoProvider] = useState<'coingecko' | 'coindesk'>('coingecko');

    const getLatestPrice = useCallback((pair: string): number => {
        return summaryData.find(s => s.pair === pair)?.price || 0;
    }, [summaryData]);
    
    // Low-frequency fetch for real data from ALL external APIs
    useEffect(() => {
        const fetchAllRealData = async () => {
            console.log(`Fetching crypto data from: ${cryptoProvider}`);
            
            const cryptoPromise = cryptoProvider === 'coingecko' ? fetchCoinGeckoData() : fetchCoinDeskData();

            const cryptoData = await cryptoPromise;

            // Safely merge data, giving new data precedence
            const allData = { ...baseApiData, ...cryptoData };

            if(Object.keys(allData).length > 0) {
                 setBaseApiData(allData);
            }

            // Alternate the crypto provider for the next fetch
            setCryptoProvider(prev => prev === 'coingecko' ? 'coindesk' : 'coingecko');
        };

        fetchAllRealData(); 
        const interval = setInterval(fetchAllRealData, 30000); // Fetch every 30 seconds

        return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [cryptoProvider]); 

    // High-frequency simulation logic for smooth UI updates for ALL assets
    useEffect(() => {
        const simulationInterval = setInterval(() => {
            if (Object.keys(baseApiData).length === 0) return;

            const now = new Date();
            const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
            
            const newSummaries = Object.values(baseApiData).map(summary => {
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
                    const volatility = 0.0005;
                    newPrice *= (1 + (Math.random() - 0.5) * volatility);
                }

                return { ...summary, price: newPrice };
            });

            setSummaryData(newSummaries);

            setKlineData(prevKline => {
                const newKline = { ...prevKline };
                newSummaries.forEach(summary => {
                    const pairData = newKline[summary.pair] || [];
                    const lastDataPoint = pairData[pairData.length - 1];

                    const latestOhlc: OHLC = {
                        time: now.getTime(),
                        open: summary.price, high: summary.price,
                        low: summary.price, close: summary.price,
                    };
                    
                    if (lastDataPoint && (now.getTime() - lastDataPoint.time) < 60000) {
                        lastDataPoint.close = summary.price;
                        lastDataPoint.high = Math.max(lastDataPoint.high, summary.price);
                        lastDataPoint.low = Math.min(lastDataPoint.low, summary.price);
                    } else {
                        newKline[summary.pair] = [...pairData, latestOhlc].slice(-200);
                    }
                });
                return newKline;
            });

        }, 2000);

        return () => clearInterval(simulationInterval);
    }, [baseApiData, systemSettings.marketInterventions]);

    const contextValue: MarketContextType = {
        tradingPair,
        changeTradingPair: setTradingPair,
        availablePairs,
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
