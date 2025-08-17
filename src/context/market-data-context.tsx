
"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { availablePairs, MarketSummary, KlineDataPoint, OHLC } from '@/types';
import useTrades from '@/hooks/useTrades';
import { useSettings } from './settings-context';
import { useAdminSettings } from './admin-settings-context';

const CRYPTO_PAIRS = ['BTC/USDT', 'ETH/USDT', 'SOL/USDT', 'XRP/USDT', 'LTC/USDT', 'BNB/USDT', 'MATIC/USDT', 'DOGE/USDT', 'ADA/USDT', 'SHIB/USDT', 'AVAX/USDT', 'LINK/USDT', 'DOT/USDT', 'UNI/USDT', 'TRX/USDT', 'XLM/USDT', 'VET/USDT', 'EOS/USDT', 'FIL/USDT', 'ICP/USDT'];
const GOLD_PAIRS = ['XAU/USD'];
const FOREX_PAIRS = ['EUR/USD', 'GBP/USD'];

// Helper function to generate a random number within a range
const randomInRange = (min: number, max: number) => Math.random() * (max - min) + min;

// Helper to format time for the chart
const formatTime = (date: Date) => date.toLocaleTimeString('en-GB');

const getBasePrice = (pair: string) => {
    switch (pair) {
        case 'BTC/USDT': return 68000;
        case 'ETH/USDT': return 3800;
        case 'SOL/USDT': return 165;
        case 'XRP/USDT': return 0.5;
        case 'LTC/USDT': return 85;
        case 'BNB/USDT': return 600;
        case 'MATIC/USDT': return 0.7;
        case 'DOGE/USDT': return 0.15;
        case 'ADA/USDT': return 0.45;
        case 'SHIB/USDT': return 0.000025;
        case 'AVAX/USDT': return 35;
        case 'LINK/USDT': return 18;
        case 'DOT/USDT': return 7;
        case 'UNI/USDT': return 10;
        case 'TRX/USDT': return 0.12;
        case 'XLM/USDT': return 0.11;
        case 'VET/USDT': return 0.035;
        case 'EOS/USDT': return 0.8;
        case 'FIL/USDT': return 6;
        case 'ICP/USDT': return 12;
        case 'XAU/USD': return 2330;
        case 'EUR/USD': return 1.07;
        case 'GBP/USD': return 1.25;
        default: return 100;
    }
}


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
    const { settings: adminSettings } = useAdminSettings();
    const tradesMap = useTrades();
    const [tradingPair, setTradingPair] = useState(availablePairs[0]);
    const [klineData, setKlineData] = useState<Record<string, OHLC[]>>({});
    const [summaryData, setSummaryData] = useState<MarketSummary[]>([]);
    
    const changeTradingPair = (pair: string) => {
        if (availablePairs.includes(pair)) {
            setTradingPair(pair);
        }
    };

    const getLatestPrice = useCallback((pair: string): number => {
        const streamName = `${pair.replace('/', '').toLowerCase()}@aggTrade`;
        const lastKline = klineData[pair]?.[klineData[pair].length - 1];
        return lastKline?.close || tradesMap[streamName]?.price || getBasePrice(pair);
    }, [tradesMap, klineData]);


    useEffect(() => {
        // Initialize kline data and summary data
        const initialKlineData: Record<string, OHLC[]> = {};
        const initialSummaryData: MarketSummary[] = [];

        for (const pair of availablePairs) {
            const basePrice = getBasePrice(pair);
            initialKlineData[pair] = Array.from({ length: 60 }, (_, i) => {
                const price = basePrice * randomInRange(0.99, 1.01);
                return {
                    time: Date.now() - (59 - i) * 1000,
                    open: price,
                    high: price,
                    low: price,
                    close: price,
                };
            });
            initialSummaryData.push({
                pair,
                price: basePrice,
                change: randomInRange(-5, 5),
                volume: randomInRange(1000000, 50000000),
                high: basePrice * 1.05,
                low: basePrice * 0.95,
            });
        }
        setKlineData(initialKlineData);
        setSummaryData(initialSummaryData);
    }, []);


    useEffect(() => {
        const interval = setInterval(() => {
            const now = new Date();
            const currentMinutes = now.getHours() * 60 + now.getMinutes();

            setKlineData(prevKlineData => {
                const newKlineData = { ...prevKlineData };
                
                for (const pair of availablePairs) {
                    const pairSettings = settings[pair] || { trend: 'normal', volatility: 0.05, isTradingHalted: false, marketOverrides: [] };
                    if (pairSettings.isTradingHalted) continue;

                    let finalNewPrice;
                    
                    // --- START OF ADMIN OVERRIDE LOGIC ---
                    if (adminSettings.overrideActive) {
                        finalNewPrice = adminSettings.overridePrice ?? getBasePrice(pair);
                    } else {
                        // Check for per-pair market override first
                        let activeOverride = null;
                        for (const override of pairSettings.marketOverrides) {
                            const [startH, startM] = override.startTime.split(':').map(Number);
                            const [endH, endM] = override.endTime.split(':').map(Number);
                            const startMinutes = startH * 60 + startM;
                            const endMinutes = endH * 60 + endM;

                            if (currentMinutes >= startMinutes && currentMinutes <= endMinutes) {
                                activeOverride = override;
                                break;
                            }
                        }

                        if (activeOverride) {
                            finalNewPrice = randomInRange(activeOverride.minPrice, activeOverride.maxPrice);
                        } else {
                            // Use real data if available, otherwise simulate
                            const streamName = `${pair.replace('/', '').toLowerCase()}@aggTrade`;
                            const latestTrade = tradesMap[streamName];
                            
                            if (latestTrade) {
                                finalNewPrice = latestTrade.price;
                            } else {
                                // Fallback to simulation if no real data
                                const lastPrice = newKlineData[pair]?.[newKlineData[pair].length - 1]?.close || getBasePrice(pair);
                                let priceMultiplier = 1 + (Math.random() - 0.5) * pairSettings.volatility;
                                if (pairSettings.trend === 'up') priceMultiplier = 1 + (Math.random() * pairSettings.volatility);
                                if (pairSettings.trend === 'down') priceMultiplier = 1 - (Math.random() * pairSettings.volatility);
                                finalNewPrice = lastPrice * priceMultiplier;
                            }
                        }
                    }
                     // --- END OF ADMIN OVERRIDE LOGIC ---

                    const existingData = newKlineData[pair] || [];
                    const lastDataPoint = existingData[existingData.length - 1] || { open: finalNewPrice, high: finalNewPrice, low: finalNewPrice, close: finalNewPrice, time: Date.now() - 60000 };
                    
                    const timeWindow = 60 * 1000; // 1 minute
                    
                    let newOHLCPoint: OHLC;

                    if(now.getTime() - lastDataPoint.time > timeWindow) {
                        // Start a new candle
                        newOHLCPoint = { time: now.getTime(), open: finalNewPrice, high: finalNewPrice, low: finalNewPrice, close: finalNewPrice };
                        newKlineData[pair] = [...existingData.slice(1), newOHLCPoint];
                    } else {
                        // Update the current candle
                        newOHLCPoint = {
                            ...lastDataPoint,
                            high: Math.max(lastDataPoint.high, finalNewPrice),
                            low: Math.min(lastDataPoint.low, finalNewPrice),
                            close: finalNewPrice
                        }
                         newKlineData[pair] = [...existingData.slice(0, -1), newOHLCPoint];
                    }
                }
                return newKlineData;
            });

            setSummaryData(prevSummary => {
                return prevSummary.map(summaryItem => {
                    const latestPrice = getLatestPrice(summaryItem.pair);
                    return {
                        ...summaryItem,
                        price: latestPrice,
                        high: Math.max(summaryItem.high, latestPrice),
                        low: Math.min(summaryItem.low, latestPrice),
                    };
                });
            });

        }, 5000); // Update every 5 seconds

        return () => clearInterval(interval);
    }, [tradesMap, settings, adminSettings]);


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
