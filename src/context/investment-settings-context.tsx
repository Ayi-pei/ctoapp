
"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';

const SETTINGS_STORAGE_KEY = 'tradeflow_investment_settings';

export type InvestmentTier = {
    hours: number;
    rate: number; // Hourly rate
};

export type InvestmentProduct = {
    id: string;
    name: string;
    price: number;
    dailyRate?: number;
    period?: number;
    maxPurchase: number;
    imgSrc: string;
    category: 'staking' | 'finance';
    productType?: 'daily' | 'hourly';
    activeStartTime?: string; 
    activeEndTime?: string; 
    hourlyTiers?: InvestmentTier[];
    // New fields for staking requirements
    stakingAsset?: string; // e.g., 'USDT', 'BTC'
    stakingAmount?: number;
};


// Default products if nothing is in storage
const defaultInvestmentProducts: InvestmentProduct[] = [
    { 
        id: 'prod-futoubao', 
        name: "富投宝", 
        price: 1, // Min investment amount
        maxPurchase: 999, 
        imgSrc: "/images/futoubao.png",
        category: 'finance',
        productType: 'hourly',
        activeStartTime: '18:00',
        activeEndTime: '06:00',
        hourlyTiers: [
            { hours: 2, rate: 0.015 }, // 1.5%
            { hours: 4, rate: 0.020 }, // 2.0%
            { hours: 6, rate: 0.025 }, // 2.5%
        ]
    },
    { id: 'prod-1', name: "ASIC 矿机", price: 98, dailyRate: 0.03, period: 25, maxPurchase: 1, imgSrc: "/images/0kio.png", category: 'staking', productType: 'daily', stakingAsset: 'USDT', stakingAmount: 50 },
    { id: 'prod-2', name: "阿瓦隆矿机 (Avalon) A13", price: 103, dailyRate: 0.025, period: 30, maxPurchase: 1, imgSrc: "/images/0kio01.png", category: 'staking', productType: 'daily' },
    { id: 'prod-3', name: "MicroBT Whatsminer M60S", price: 1, dailyRate: 0.80, period: 365, maxPurchase: 1, imgSrc: "/images/0kio02.png", category: 'staking', productType: 'daily' },
    { id: 'prod-4', name: "Canaan Avalon A1566", price: 288, dailyRate: 0.027, period: 60, maxPurchase: 1, imgSrc: "/images/0kio03.png", category: 'staking', productType: 'daily' },
    { id: 'prod-5', name: "Bitmain Antminer S21 Pro", price: 268, dailyRate: 0.019, period: 365, maxPurchase: 1, imgSrc: "/images/0kio04.png", category: 'staking', productType: 'daily' },
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
                const parsed = JSON.parse(storedSettings);
                // Merge stored settings with defaults to ensure all keys are present,
                // but prioritize the imgSrc from the default settings to prevent incorrect paths.
                const finalProducts = defaultInvestmentProducts.map(defaultProd => {
                    const storedProd = parsed.find((p: InvestmentProduct) => p.id === defaultProd.id);
                    if (storedProd) {
                        // If found in storage, merge it, but force the default imgSrc
                        return { ...defaultProd, ...storedProd, imgSrc: defaultProd.imgSrc };
                    }
                    return defaultProd; // Otherwise, use the default product
                });

                // Add any purely custom products from storage that aren't in the default list
                parsed.forEach((storedProd: InvestmentProduct) => {
                    if (!finalProducts.some(fp => fp.id === storedProd.id)) {
                        finalProducts.push(storedProd);
                    }
                });

                setInvestmentProducts(finalProducts);
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
            imgSrc: "https://placehold.co/80x80.png",
            productType: 'daily',
            category: 'staking', // Default to staking, admin can change it
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
