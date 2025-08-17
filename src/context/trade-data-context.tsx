

"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import useTrades from '@/hooks/useTrades';
import { OHLC, TradeRaw } from '@/types';

interface TradeDataContextType {
    displayedTrades: Record<string, TradeRaw[]>;
    klineData: Record<string, OHLC[]>;
    getLatestPrice: (tradingPair: string) => number | undefined;
}

const TradeDataContext = createContext<TradeDataContextType | undefined>(undefined);

export function TradeDataProvider({ children }: { children: ReactNode }) {
    const tradesMap = useTrades();
    const [displayedTrades, setDisplayedTrades] = useState<Record<string, TradeRaw[]>>({});
    const [klineData, setKlineData] = useState<Record<string, OHLC[]>>({});

    // Update displayed trades from the live tradesMap
    useEffect(() => {
        setDisplayedTrades(tradesMap);
    }, [tradesMap]);

    // Update klineData based on the latest trades every 5 seconds
    useEffect(() => {
        const timer = setInterval(() => {
            setKlineData(prevKlineData => {
                const updatedKlineData = { ...prevKlineData };
                
                Object.entries(displayedTrades).forEach(([stream, trades]) => {
                    if (trades.length === 0) return;

                    const now = Date.now();
                    const oneMinuteAgo = now - 60000;

                    // Filter trades from the last minute to calculate the new candle
                    const recentTrades = trades.filter(t => t.timestamp >= oneMinuteAgo);
                    if (recentTrades.length === 0) return;

                    const open = recentTrades[0].price;
                    const close = recentTrades[recentTrades.length - 1].price;
                    const high = Math.max(...recentTrades.map(t => t.price));
                    const low = Math.min(...recentTrades.map(t => t.price));
                    
                    const newKlinePoint: OHLC = {
                        time: now,
                        open,
                        high,
                        low,
                        close,
                    };

                    const existingData = updatedKlineData[stream.replace('@aggTrade','')] || [];
                    
                    // Add new point and keep the array size fixed
                    const finalData = [...existingData, newKlinePoint];
                    if (finalData.length > 60) {
                        finalData.shift();
                    }
                    
                    updatedKlineData[stream.replace('@aggTrade','')] = finalData;
                });

                return updatedKlineData;
            });
        }, 5000); 
        return () => clearInterval(timer);
    }, [displayedTrades]);

    // Helper function to get the latest price for a given trading pair
    const getLatestPrice = (tradingPair: string): number | undefined => {
        const streamName = `${tradingPair.replace('/', '').toLowerCase()}`;
        const trades = displayedTrades[streamName];
        return trades?.[trades.length - 1]?.price;
    };

    const value = { displayedTrades, klineData, getLatestPrice };

    return (
        <TradeDataContext.Provider value={value}>
            {children}
        </TradeDataContext.Provider>
    );
}

export function useTradeData() {
    const context = useContext(TradeDataContext);
    if (context === undefined) {
        throw new Error('useTradeData must be used within a TradeDataProvider');
    }
    return context;
}
