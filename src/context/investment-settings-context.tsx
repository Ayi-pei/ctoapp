
"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { supabase, isSupabaseEnabled } from '@/lib/supabaseClient';
import { useAuthenticatedSupabase } from '@/context/enhanced-supabase-context';

// Corrected Type Definitions
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
    hourlyTiers?: InvestmentTier[]; // CORRECTED TYPE: No longer a string
    stakingAsset?: string;
    stakingAmount?: number;
};

// Raw product data for seeding, with hourlyTiers as an array
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
        hourlyTiers: [ // CORRECTED: Now an array of objects
            { hours: 2, rate: 0.015 },
            { hours: 4, rate: 0.020 },
            { hours: 6, rate: 0.025 },
        ],
        dailyRate: undefined,
        period: undefined,
        stakingAsset: undefined,
        stakingAmount: undefined,
    },
    { name: "ASIC 矿机", price: 98, dailyRate: 0.03, period: 25, maxPurchase: 1, imgSrc: "/images/0kio.png", category: 'staking', productType: 'daily', stakingAsset: 'USDT', stakingAmount: 50, hourlyTiers: undefined },
    { name: "阿瓦隆矿机 (Avalon) A13", price: 103, dailyRate: 0.025, period: 30, maxPurchase: 1, imgSrc: "/images/0kio01.png", category: 'staking', productType: 'daily', hourlyTiers: undefined },
    { name: "MicroBT Whatsminer M60S", price: 1, dailyRate: 0.80, period: 365, maxPurchase: 1, imgSrc: "/images/0kio02.png", category: 'staking', productType: 'daily', hourlyTiers: undefined },
    { name: "Canaan Avalon A1566", price: 288, dailyRate: 0.027, period: 60, maxPurchase: 1, imgSrc: "/images/0kio03.png", category: 'staking', productType: 'daily', hourlyTiers: undefined },
    { name: "Bitmain Antminer S21 Pro", price: 268, dailyRate: 0.019, period: 365, maxPurchase: 1, imgSrc: "/images/0kio04.png", category: 'staking', productType: 'daily', hourlyTiers: undefined },
];


interface InvestmentSettingsContextType {
    investmentProducts: InvestmentProduct[];
    addProduct: (category: 'staking' | 'finance') => Promise<void>;
    removeProduct: (id: string) => Promise<void>;
    updateProduct: (id: string, updates: Partial<InvestmentProduct>) => Promise<void>;
}

const InvestmentSettingsContext = createContext<InvestmentSettingsContextType | undefined>(undefined);

// Helper to parse hourlyTiers FROM the database
const parseProductTiers = (product: any): InvestmentProduct => {
    return {
        ...product,
        hourlyTiers: typeof product.hourlyTiers === 'string'
            ? JSON.parse(product.hourlyTiers)
            : product.hourlyTiers || undefined,
    };
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
            setInvestmentProducts(productsWithIds); // No need to parse defaults, they are already correct
            return;
        }

        try {
            const { data, error } = await supabase.from('investment_products').select('*');
            
            if (error) {
                console.error("Failed to load investment settings from Supabase", (error as any)?.message || error);
                // Fallback to default products on error
                const productsWithIds = defaultInvestmentProducts.map((product, index) => ({
                    ...product,
                    id: `fallback_${index}`
                }));
                setInvestmentProducts(productsWithIds);
                return;
            }

            if (!data || data.length === 0) {
                console.log("No products found, seeding database...");
                // CORRECTED: Transform data for DB insertion
                const productsToSeed = defaultInvestmentProducts.map(p => ({
                    ...p,
                    hourlyTiers: p.hourlyTiers ? JSON.stringify(p.hourlyTiers) : null,
                }));

                const { data: seededData, error: seedError } = await supabase
                    .from('investment_products')
                    .insert(productsToSeed)
                    .select();
                
                if (seedError) {
                    throw seedError;
                }
                // Parse the newly seeded data back for the UI state
                setInvestmentProducts(seededData.map(parseProductTiers));

            } else {
                // Parse existing data for the UI state
                setInvestmentProducts(data.map(parseProductTiers));
            }
        } catch (e: any) {
            console.error("Failed to fetch or seed investment products:", e.message);
            // Fallback to local data
            const productsWithIds = defaultInvestmentProducts.map((product, index) => ({
                ...product,
                id: `fallback_${index}`
            }));
            setInvestmentProducts(productsWithIds);
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

        const newProduct: Omit<InvestmentProduct, 'id'> = {
            name: '新产品',
            price: 100,
            maxPurchase: 1,
            imgSrc: "https://placehold.co/80x80.png",
            productType: category === 'staking' ? 'daily' : 'hourly',
            category: category,
        };
        
        // Data to be inserted into the database
        const dbProduct: any = { ...newProduct };

        if (category === 'staking') {
            dbProduct.dailyRate = 0.01;
            dbProduct.period = 30;
        } else {
            // CORRECTED: Stringify hourlyTiers for the database
            dbProduct.hourlyTiers = JSON.stringify([{ hours: 1, rate: 0.01 }]);
        }
        
        const { error } = await supabase.from('investment_products').insert(dbProduct);
        
        if (error) {
            console.error("Error adding product:", JSON.stringify(error, null, 2));
        } else {
           await fetchProducts(); // Refetch all products to get the new one with its ID
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
            await fetchProducts(); // Refetch to update the list
        }
    };

    const updateProduct = async (id: string, updates: Partial<InvestmentProduct>) => {
        if (!isSupabaseEnabled) {
            console.warn("Supabase not enabled, cannot update products.");
            return;
        }
        
        // CORRECTED: Create a separate object for the DB and stringify tiers
        const dbUpdates: any = { ...updates };

        if (dbUpdates.hourlyTiers) {
            dbUpdates.hourlyTiers = JSON.stringify(dbUpdates.hourlyTiers);
        }

        const { error } = await supabase.from('investment_products').update(dbUpdates).eq('id', id);

        if (error) {
            console.error("Error updating product:", JSON.stringify(error, null, 2));
        } else {
            // Optimistic update could be done here, but refetching is simpler
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
