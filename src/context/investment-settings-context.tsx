
"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { supabase, isSupabaseEnabled } from '@/lib/supabaseClient';

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
    stakingAsset?: string;
    stakingAmount?: number;
};

// Default products if nothing is in storage. These will be used to seed the DB.
const defaultInvestmentProducts: Omit<InvestmentProduct, 'id'>[] = [
    { 
        name: "富投宝", 
        price: 1,
        maxPurchase: 999, 
        imgSrc: "/images/futoubao.png",
        category: 'finance',
        productType: 'hourly',
        activeStartTime: '18:00',
        activeEndTime: '06:00',
        hourlyTiers: [
            { hours: 2, rate: 0.015 },
            { hours: 4, rate: 0.020 },
            { hours: 6, rate: 0.025 },
        ]
    },
    { name: "ASIC 矿机", price: 98, dailyRate: 0.03, period: 25, maxPurchase: 1, imgSrc: "/images/0kio.png", category: 'staking', productType: 'daily', stakingAsset: 'USDT', stakingAmount: 50 },
    { name: "阿瓦隆矿机 (Avalon) A13", price: 103, dailyRate: 0.025, period: 30, maxPurchase: 1, imgSrc: "/images/0kio01.png", category: 'staking', productType: 'daily' },
    { name: "MicroBT Whatsminer M60S", price: 1, dailyRate: 0.80, period: 365, maxPurchase: 1, imgSrc: "/images/0kio02.png", category: 'staking', productType: 'daily' },
    { name: "Canaan Avalon A1566", price: 288, dailyRate: 0.027, period: 60, maxPurchase: 1, imgSrc: "/images/0kio03.png", category: 'staking', productType: 'daily' },
    { name: "Bitmain Antminer S21 Pro", price: 268, dailyRate: 0.019, period: 365, maxPurchase: 1, imgSrc: "/images/0kio04.png", category: 'staking', productType: 'daily' },
];


interface InvestmentSettingsContextType {
    investmentProducts: InvestmentProduct[];
    addProduct: (category: 'staking' | 'finance') => Promise<void>;
    removeProduct: (id: string) => Promise<void>;
    updateProduct: (id: string, updates: Partial<InvestmentProduct>) => Promise<void>;
}

const InvestmentSettingsContext = createContext<InvestmentSettingsContextType | undefined>(undefined);

export function InvestmentSettingsProvider({ children }: { children: ReactNode }) {
    const [investmentProducts, setInvestmentProducts] = useState<InvestmentProduct[]>([]);

    const fetchProducts = useCallback(async () => {
        if (!isSupabaseEnabled) {
            console.warn("Supabase not enabled, cannot fetch investment products.");
            return;
        }
        let { data, error } = await supabase.from('investment_products').select('*');
        
        if (error) {
            console.error("Failed to load investment settings from Supabase", error);
            return;
        }

        if (!data || data.length === 0) {
            // Seed the database with default products if it's empty
            const { data: seededData, error: seedError } = await supabase.from('investment_products').insert(defaultInvestmentProducts).select();
             if (seedError) {
                console.error("Failed to seed investment products:", seedError);
            } else {
                setInvestmentProducts(seededData as InvestmentProduct[]);
            }
        } else {
            setInvestmentProducts(data as InvestmentProduct[]);
        }
    }, []);

    useEffect(() => {
        fetchProducts();
    }, [fetchProducts]);
    

    const addProduct = async (category: 'staking' | 'finance') => {
        const newProductData: Partial<InvestmentProduct> = {
            name: '新产品',
            price: 100,
            maxPurchase: 1,
            imgSrc: "https://placehold.co/80x80.png",
            productType: category === 'staking' ? 'daily' : 'hourly',
            category: category,
        };
        if (category === 'staking') {
            newProductData.dailyRate = 0.01;
            newProductData.period = 30;
        } else {
            newProductData.hourlyTiers = [{ hours: 1, rate: 0.01 }];
        }
        
        const { data, error } = await supabase.from('investment_products').insert(newProductData).select().single();
        if (error) {
            console.error("Error adding product:", error);
        } else if (data) {
           await fetchProducts();
        }
    };
    
    const removeProduct = async (id: string) => {
        const { error } = await supabase.from('investment_products').delete().eq('id', id);
        if (error) {
             console.error("Error removing product:", error);
        } else {
            await fetchProducts();
        }
    };

    const updateProduct = async (id: string, updates: Partial<InvestmentProduct>) => {
        const { error } = await supabase.from('investment_products').update(updates).eq('id', id);
        if (error) {
            console.error("Error updating product:", error);
        } else {
            await fetchProducts();
        }
    };

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
