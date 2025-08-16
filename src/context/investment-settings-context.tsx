
"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';

const SETTINGS_STORAGE_KEY = 'tradeflow_investment_settings';

export type InvestmentProduct = {
    id: string;
    name: string;
    price: number;
    dailyRate: number;
    period: number;
    maxPurchase: number;
    imgSrc: string;
};

// Default products if nothing is in storage
const defaultInvestmentProducts: InvestmentProduct[] = [
    { id: 'prod-1', name: "ASIC 矿机", price: 98, dailyRate: 0.03, period: 25, maxPurchase: 1, imgSrc: "/images/asic-miner.png" },
    { id: 'prod-2', name: "阿瓦隆矿机 (Avalon) A13", price: 103, dailyRate: 0.025, period: 30, maxPurchase: 1, imgSrc: "/images/avalon-miner.png" },
    { id: 'prod-3', name: "MicroBT Whatsminer M60S", price: 1, dailyRate: 0.80, period: 365, maxPurchase: 1, imgSrc: "/images/microbt-miner.png" },
    { id: 'prod-4', name: "Canaan Avalon A1566", price: 288, dailyRate: 0.027, period: 60, maxPurchase: 1, imgSrc: "/images/canaan-miner.png" },
    { id: 'prod-5', name: "Bitmain Antminer S21 Pro", price: 268, dailyRate: 0.019, period: 365, maxPurchase: 1, imgSrc: "/images/bitmain-miner.png" },
];


interface InvestmentSettingsContextType {
    investmentProducts: InvestmentProduct[];
    addProduct: () => void;
    removeProduct: (id: string) => void;
    updateProduct: (id: string, updates: Partial<InvestmentProduct>) => void;
}

const InvestmentSettingsContext = createContext<InvestmentSettingsContextType | undefined>(undefined);

export function InvestmentSettingsProvider({ children }: { children: ReactNode }) {
    const [investmentProducts, setInvestmentProducts] = useState<InvestmentProduct[]>([]);
    const [isLoaded, setIsLoaded] = useState(false);

    // Load from localStorage
    useEffect(() => {
        try {
            const storedSettings = localStorage.getItem(SETTINGS_STORAGE_KEY);
            if (storedSettings) {
                setInvestmentProducts(JSON.parse(storedSettings));
            } else {
                setInvestmentProducts(defaultInvestmentProducts);
            }
        } catch (error) {
            console.error("Failed to load investment settings from localStorage", error);
            setInvestmentProducts(defaultInvestmentProducts);
        }
        setIsLoaded(true);
    }, []);

    // Save to localStorage
    useEffect(() => {
        if (isLoaded) {
            try {
                localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(investmentProducts));
            } catch (error) {
                console.error("Failed to save investment settings to localStorage", error);
            }
        }
    }, [investmentProducts, isLoaded]);
    

    const addProduct = useCallback(() => {
        const newProduct: InvestmentProduct = {
            id: `prod-${Date.now()}`,
            name: '新产品',
            price: 100,
            dailyRate: 0.01,
            period: 30,
            maxPurchase: 1,
            imgSrc: '/images/placeholder-miner.png'
        };
        setInvestmentProducts(prev => [...prev, newProduct]);
    }, []);
    
    const removeProduct = useCallback((id: string) => {
        setInvestmentProducts(prev => prev.filter(p => p.id !== id));
    }, []);

    const updateProduct = useCallback((id: string, updates: Partial<InvestmentProduct>) => {
        setInvestmentProducts(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p));
    }, []);

    return (
        <InvestmentSettingsContext.Provider value={{ investmentProducts, addProduct, removeProduct, updateProduct }}>
            {children}
        </InvestmentSettingsContext.Provider>
    );
}

export function useInvestmentSettings() {
    const context = useContext(InvestmentSettingsContext);
    if (context === undefined) {
        throw new Error('useInvestmentSettings must be used within an InvestmentSettingsProvider');
    }
    return context;
}
