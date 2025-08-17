
"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import useTrades from '@/hooks/useTrades';
import { OHLC, TradeRaw } from '@/types';

interface TradeDataContextType {
    displayedTrades: Record<string, TradeRaw>;
    klineData: Record<string, OHLC[]>;
    getLatestPrice: (tradingPair: string) => number | undefined;
}

const TradeDataContext = createContext<TradeDataContextType | undefined>(undefined);

export function TradeDataProvider({ children }: { children: ReactNode }) {
    const tradesMap = useTrades();
    const [displayedTrades, setDisplayedTrades] = useState<Record<string, TradeRaw>>({});
    const [klineData, setKlineData] = useState<Record<string, OHLC[]>>({});

    // 每 5 秒从 tradesMap 刷新一次 displayedTrades
    useEffect(() => {
        const timer = setInterval(() => {
            setDisplayedTrades(tradesMap);
        }, 5000);
        return () => clearInterval(timer);
    }, [tradesMap]);

    // 每 5 秒根据 displayedTrades 更新 klineData
    useEffect(() => {
        if (Object.keys(displayedTrades).length === 0) return;

        const timer = setInterval(() => {
            setKlineData(prev => {
                const updatedKlineData = { ...prev };
                Object.entries(displayedTrades).forEach(([stream, trade]) => {
                    const currentTime = Date.now();
                    const newKlinePoint: OHLC = {
                        open: trade.price,
                        high: trade.price,
                        low: trade.price,
                        close: trade.price,
                        time: currentTime,
                    };
                    const existingData = updatedKlineData[stream] || [];
                    updatedKlineData[stream] = [...existingData.slice(-49), newKlinePoint];
                });
                return updatedKlineData;
            });
        }, 5000); 
        return () => clearInterval(timer);
    }, [displayedTrades]);

    // Helper function to get the latest price for a given trading pair
    const getLatestPrice = (tradingPair: string): number | undefined => {
        const streamName = `${tradingPair.replace('/', '').toLowerCase()}@aggtrade`;
        const trade = displayedTrades[streamName];
        return trade?.price;
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
