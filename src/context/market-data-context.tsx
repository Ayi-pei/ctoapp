
"use client";

import { useMarketData } from "@/hooks/use-market-data";
import React, { createContext, useContext, ReactNode } from 'react';

// Define the shape of the context data
type MarketContextType = ReturnType<typeof useMarketData>;

// Create the context with an undefined initial value
const MarketContext = createContext<MarketContextType | undefined>(undefined);

// Create a provider component
export function MarketDataProvider({ children }: { children: ReactNode }) {
    const marketData = useMarketData();
    return (
        <MarketContext.Provider value={marketData}>
            {children}
        </MarketContext.Provider>
    );
}

// Create a custom hook for consuming the context
export function useMarket() {
    const context = useContext(MarketContext);
    if (context === undefined) {
        throw new Error('useMarket must be used within a MarketDataProvider');
    }
    return context;
}
