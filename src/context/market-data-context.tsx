
"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { availablePairs, MarketSummary, OHLC } from '@/types';
import { useSettings } from './settings-context';
import { useAdminSettings } from './admin-settings-context';
import axios from 'axios';

const CRYPTO_PAIRS = ['BTC/USDT', 'ETH/USDT', 'SOL/USDT', 'XRP/USDT', 'LTC/USDT', 'BNB/USDT', 'MATIC/USDT', 'DOGE/USDT', 'ADA/USDT', 'SHIB/USDT', 'AVAX/USDT', 'LINK/USDT', 'DOT/USDT', 'UNI/USDT', 'TRX/USDT', 'XLM/USDT', 'VET/USDT', 'EOS/USDT', 'FIL/USDT', 'ICP/USDT'];
const GOLD_PAIRS = ['XAU/USD'];
const FOREX_PAIRS = ['EUR/USD', 'GBP/USD'];

// Helper function to generate a random number within a range
const randomInRange = (min: number, max: number) => Math.random() * (max - min) + min;

// Map our app's trading pairs to CoinGecko API IDs
const coingeckoIdMap: Record<string, string> = {
    'BTC/USDT': 'bitcoin',
    'ETH/USDT': 'ethereum',
    'SOL/USDT': 'solana',
    'XRP/USDT': 'ripple',
    'LTC/USDT': 'litecoin',
    'BNB/USDT': 'binancecoin',
    'MATIC/USDT': 'matic-network',
    'DOGE/USDT': 'dogecoin',
    'ADA/USDT': 'cardano',
    'SHIB/USDT': 'shiba-inu',
    'AVAX/USDT': 'avalanche-2',
    'LINK/USDT': 'chainlink',
    'DOT/USDT': 'polkadot',
    'UNI/USDT': 'uniswap',
    'TRX/USDT': 'tron',
    'XLM/USDT': 'stellar',
    'VET/USDT': 'vechain',
    'EOS/USDT': 'eos',
    'FIL/USDT': 'filecoin',
    'ICP/USDT': 'internet-computer',
    // Non-crypto assets won't be fetched from coingecko for now
    'XAU/USD': 'gold', 
    'EUR/USD': 'eur',
    'GBP/USD': 'gbp',
};


interface MarketContextType {
    tradingPair: string;
    changeTradingPair: (pair: string) => void;
    availablePairs: string[];
    summaryData: MarketSummary[];
    cryptoSummaryData: MarketSummary[];
    goldSummaryData: MarketSummary[];
    forexSummaryData: MarketSummary[];
    klineData: Record<string, OHLC[]>;
    getLatestPrice: (pair: string) => number;
}


const MarketContext = createContext<MarketContextType | undefined>(undefined);


export function MarketDataProvider({ children }: { children: ReactNode }) {
    const { settings } = useSettings();
    const { overrides: adminOverrides } = useAdminSettings();
    const [tradingPair, setTradingPair] = useState(availablePairs[0]);
    const [klineData, setKlineData] = useState<Record<string, OHLC[]>>({});
    const [summaryData, setSummaryData] = useState<MarketSummary[]>([]);
    
    const changeTradingPair = (pair: string) => {
        if (availablePairs.includes(pair)) {
            setTradingPair(pair);
        }
    };
    
    const getLatestPrice = useCallback((pair: string): number => {
        const kline = klineData[pair];
        if (kline && kline.length > 0) {
            return kline[kline.length - 1].close;
        }

        const summary = summaryData.find(s => s.pair === pair);
        return summary?.price || 0;
    }, [summaryData, klineData]);


    const fetchMarketData = useCallback(async () => {
        const cryptoIds = CRYPTO_PAIRS.map(pair => coingeckoIdMap[pair]).filter(Boolean);
        if (cryptoIds.length === 0) return;

        try {
            const response = await axios.get('https://api.coingecko.com/api/v3/coins/markets', {
                params: {
                    vs_currency: 'usd',
                    ids: cryptoIds.join(','),
                    order: 'market_cap_desc',
                    per_page: cryptoIds.length,
                    page: 1,
                    sparkline: false,
                    price_change_percentage: '24h',
                },
                 headers: {
                    'x-cg-demo-api-key': process.env.NEXT_PUBLIC_COINGECKO_API_KEY
                }
            });

            const newSummaryData = CRYPTO_PAIRS.map(pair => {
                const id = coingeckoIdMap[pair];
                const data = response.data.find((d: any) => d.id === id);
                if (data) {
                    return {
                        pair: pair,
                        price: data.current_price,
                        change: data.price_change_percentage_24h,
                        volume: data.total_volume,
                        high: data.high_24h,
                        low: data.low_24h,
                        icon: data.image,
                    };
                }
                return null;
            }).filter(Boolean) as MarketSummary[];
            
            // For now, keep mock data for non-crypto assets
            const nonCryptoSummary = [...GOLD_PAIRS, ...FOREX_PAIRS].map(pair => {
                 const existing = summaryData.find(s => s.pair === pair);
                 return existing || { pair, price: 0, change: 0, volume: 0, high: 0, low: 0, icon: '' };
            });

            setSummaryData([...newSummaryData, ...nonCryptoSummary]);

        } catch (error) {
            console.error("Error fetching CoinGecko market data:", error);
        }
    }, [summaryData]);


     const fetchKlineData = useCallback(async (pair: string) => {
        const coingeckoId = coingeckoIdMap[pair];
        if (!coingeckoId || !CRYPTO_PAIRS.includes(pair)) {
            // For non-crypto or unmapped pairs, use simulation
            const lastPrice = getLatestPrice(pair) || randomInRange(1, 100);
            const newData: OHLC[] = Array.from({ length: 50 }).map(() => {
                const price = lastPrice * (1 + (Math.random() - 0.5) * 0.01);
                return { time: Date.now(), open: price, high: price, low: price, close: price };
            });
            setKlineData(prev => ({ ...prev, [pair]: newData }));
            return;
        };

        try {
            const response = await axios.get(`https://api.coingecko.com/api/v3/coins/${coingeckoId}/ohlc`, {
                params: {
                    vs_currency: 'usd',
                    days: '1',
                },
                 headers: {
                    'x-cg-demo-api-key': process.env.NEXT_PUBLIC_COINGECKO_API_KEY
                }
            });

            const newOhlcData: OHLC[] = response.data.map((d: number[]) => ({
                time: d[0],
                open: d[1],
                high: d[2],
                low: d[3],
                close: d[4],
            }));
            
            setKlineData(prev => ({ ...prev, [pair]: newOhlcData }));

        } catch (error) {
            console.error(`Error fetching k-line data for ${pair}:`, error);
        }
    }, [getLatestPrice]);

    useEffect(() => {
        fetchMarketData();
        const marketInterval = setInterval(fetchMarketData, 60000); // Fetch summary every 60s
        return () => clearInterval(marketInterval);
    }, []); // Run only once on mount
    
    useEffect(() => {
        fetchKlineData(tradingPair);
         // No need for interval here as we will refetch when tradingPair changes
    }, [tradingPair, fetchKlineData]);


    // This effect handles the admin overrides and simulations for non-crypto assets
    useEffect(() => {
        const interval = setInterval(() => {
            const now = new Date();
            const currentMinutes = now.getHours() * 60 + now.getMinutes();

            // Handle non-crypto simulations and admin overrides for all pairs
            setSummaryData(prevSummary => 
                prevSummary.map(item => {
                    // Check for global admin override first
                    const adminOverride = adminOverrides[item.pair];
                    if (adminOverride?.active && adminOverride.overridePrice !== undefined) {
                        return { ...item, price: adminOverride.overridePrice };
                    }
                    
                    // Check for scheduled market override
                    const pairSettings = settings[item.pair];
                    if (pairSettings?.marketOverrides) {
                         for (const override of pairSettings.marketOverrides) {
                            const [startH, startM] = override.startTime.split(':').map(Number);
                            const [endH, endM] = override.endTime.split(':').map(Number);
                            const startMinutes = startH * 60 + startM;
                            const endMinutes = endH * 60 + endM;

                            if (currentMinutes >= startMinutes && currentMinutes <= endMinutes) {
                                return { ...item, price: randomInRange(override.minPrice, override.maxPrice) };
                            }
                        }
                    }

                    // For non-crypto pairs that are not being fetched, simulate some movement
                    if (!CRYPTO_PAIRS.includes(item.pair)) {
                        const lastPrice = item.price || randomInRange(1, 2000);
                        const newPrice = lastPrice * (1 + (Math.random() - 0.5) * 0.01);
                        
                        setKlineData(prevKline => {
                            const pairKline = prevKline[item.pair] || [];
                            const newPoint = { time: Date.now(), open: lastPrice, high: Math.max(lastPrice, newPrice), low: Math.min(lastPrice, newPrice), close: newPrice };
                            const updatedKline = [...pairKline.slice(-49), newPoint];
                            return { ...prevKline, [item.pair]: updatedKline };
                        });
                        
                        return { ...item, price: newPrice };
                    }
                    
                    return item; // Return crypto data as is, it's updated by fetchMarketData
                })
            );

        }, 5000); // Run this simulation/override check every 5 seconds

        return () => clearInterval(interval);
    }, [settings, adminOverrides]);


    const cryptoSummaryData = summaryData.filter(s => CRYPTO_PAIRS.includes(s.pair));
    const goldSummaryData = summaryData.filter(s => GOLD_PAIRS.includes(s.pair));
    const forexSummaryData = summaryData.filter(s => FOREX_PAIRS.includes(s.pair));


    const contextValue: MarketContextType = {
        tradingPair,
        changeTradingPair,
        availablePairs,
        summaryData,
        cryptoSummaryData,
        goldSummaryData,
        forexSummaryData,
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
