
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
    hourlyTiers?: InvestmentTier[] | string; // Allow string for JSON
    stakingAsset?: string;
    stakingAmount?: number;
};

// Default products with corrected JSON handling for seeding.
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
        // Explicitly stringify the JSON for the insert operation
        hourlyTiers: JSON.stringify([
            { hours: 2, rate: 0.015 },
            { hours: 4, rate: 0.020 },
            { hours: 6, rate: 0.025 },
        ]),
        dailyRate: undefined,
        period: undefined,
        stakingAsset: undefined,
        stakingAmount: undefined,
    },
    { name: "ASIC 矿机", price: 98, dailyRate: 0.03, period: 25, maxPurchase: 1, imgSrc: "/images/0kio.png", category: 'staking', productType: 'daily', stakingAsset: 'USDT', stakingAmount: 50, hourlyTiers: null },
    { name: "阿瓦隆矿机 (Avalon) A13", price: 103, dailyRate: 0.025, period: 30, maxPurchase: 1, imgSrc: "/images/0kio01.png", category: 'staking', productType: 'daily', hourlyTiers: null },
    { name: "MicroBT Whatsminer M60S", price: 1, dailyRate: 0.80, period: 365, maxPurchase: 1, imgSrc: "/images/0kio02.png", category: 'staking', productType: 'daily', hourlyTiers: null },
    { name: "Canaan Avalon A1566", price: 288, dailyRate: 0.027, period: 60, maxPurchase: 1, imgSrc: "/images/0kio03.png", category: 'staking', productType: 'daily', hourlyTiers: null },
    { name: "Bitmain Antminer S21 Pro", price: 268, dailyRate: 0.019, period: 365, maxPurchase: 1, imgSrc: "/images/0kio04.png", category: 'staking', productType: 'daily', hourlyTiers: null },
];


interface InvestmentSettingsContextType {
    investmentProducts: InvestmentProduct[];
    addProduct: (category: 'staking' | 'finance') => Promise<void>;
    removeProduct: (id: string) => Promise<void>;
    updateProduct: (id: string, updates: Partial<InvestmentProduct>) => Promise<void>;
}

const InvestmentSettingsContext = createContext<InvestmentSettingsContextType | undefined>(undefined);

// Helper to parse hourlyTiers if it's a string
const parseProducts = (products: any[]): InvestmentProduct[] => {
    return products.map(p => ({
        ...p,
        hourlyTiers: typeof p.hourlyTiers === 'string' ? JSON.parse(p.hourlyTiers) : p.hourlyTiers,
    }));
};

export function InvestmentSettingsProvider({ children }: { children: ReactNode }) {
    const [investmentProducts, setInvestmentProducts] = useState<InvestmentProduct[]>([]);

    const fetchProducts = useCallback(async () => {
        if (!isSupabaseEnabled) {
            console.warn("Supabase not enabled, using default investment products.");
            const productsWithIds = defaultInvestmentProducts.map((product, index) => ({
                ...product,
                id: `default_${index}`
            }));
            setInvestmentProducts(parseProducts(productsWithIds));
            return;
        }

        try {
            const { data, error } = await supabase.from('investment_products').select('*');
            
            if (error) {
                console.error("Failed to load investment settings from Supabase", JSON.stringify(error, null, 2));
                const productsWithIds = defaultInvestmentProducts.map((product, index) => ({
                    ...product,
                    id: `fallback_${index}`
                }));
                setInvestmentProducts(parseProducts(productsWithIds));
                return;
            }

            if (!data || data.length === 0) {
                try {
                    const { data: seededData, error: seedError } = await supabase
                        .from('investment_products')
                        .insert(defaultInvestmentProducts as any) // Use 'as any' to bypass strict type check for JSON string
                        .select();
                    
                    if (seedError) {
                        console.error("Failed to seed investment products:", JSON.stringify(seedError, null, 2));
                        const productsWithIds = defaultInvestmentProducts.map((product, index) => ({
                            ...product,
                            id: `mock_${index}`
                        }));
                        setInvestmentProducts(parseProducts(productsWithIds));
                    } else {
                        setInvestmentProducts(parseProducts(seededData as InvestmentProduct[]));
                    }
                } catch (seedError) {
                    console.error("Error during seeding:", JSON.stringify(seedError, null, 2));
                    const productsWithIds = defaultInvestmentProducts.map((product, index) => ({
                        ...product,
                        id: `error_${index}`
                    }));
                    setInvestmentProducts(parseProducts(productsWithIds));
                }
            } else {
                setInvestmentProducts(parseProducts(data as InvestmentProduct[]));
            }
        } catch (error) {
            console.error("Unexpected error in fetchProducts:", JSON.stringify(error, null, 2));
            const productsWithIds = defaultInvestmentProducts.map((product, index) => ({
                ...product,
                id: `final_${index}`
            }));
            setInvestmentProducts(parseProducts(productsWithIds));
        }
    }, []);

    useEffect(() => {
        fetchProducts();
    }, [fetchProducts]);
    

    const addProduct = async (category: 'staking' | 'finance') => {
        if (!isSupabaseEnabled) {
            console.warn("Supabase not enabled, cannot add products.");
            return;
        }
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
            // Ensure hourlyTiers is a JSON string when adding
            newProductData.hourlyTiers = JSON.stringify([{ hours: 1, rate: 0.01 }]);
        }
        
        const { data, error } = await supabase.from('investment_products').insert(newProductData as any).select().single();
        if (error) {
            console.error("Error adding product:", JSON.stringify(error, null, 2));
        } else if (data) {
           await fetchProducts();
        }
    };
    
    const removeProduct = async (id: string) => {
        if (!isSupabaseEnabled) {
            console.warn("Supabase not enabled, cannot remove products.");
            return;
        }
        const { error } = await supabase.from('investment_products').delete().eq('id', id);
        if (error) {
             console.error("Error removing product:", JSON.stringify(error, null, 2));
        } else {
            await fetchProducts();
        }
    };

    const updateProduct = async (id: string, updates: Partial<InvestmentProduct>) => {
        if (!isSupabaseEnabled) {
            console.warn("Supabase not enabled, cannot update products.");
            return;
        }

        // If updates include hourlyTiers, stringify it before sending
        if (updates.hourlyTiers && typeof updates.hourlyTiers !== 'string') {
            updates.hourlyTiers = JSON.stringify(updates.hourlyTiers);
        }

        const { error } = await supabase.from('investment_products').update(updates as any).eq('id', id);
        if (error) {
            console.error("Error updating product:", JSON.stringify(error, null, 2));
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
