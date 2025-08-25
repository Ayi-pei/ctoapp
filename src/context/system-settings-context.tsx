
"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { availablePairs, MarketIntervention } from '@/types';
import { supabase, isSupabaseEnabled } from '@/lib/supabaseClient';


// Define the shape of settings for a single trading pair
export type TradingPairSettings = {
    isTradingHalted: boolean; 
    baseProfitRate: number;
};

export type SystemSettings = {
    depositAddresses: {
        USDT: string;
        ETH: string;
        BTC: string;
        USD: string;
    };
    contractTradingEnabled: boolean;
    marketSettings: { [key: string]: TradingPairSettings };
    marketInterventions: MarketIntervention[];
};

interface SystemSettingsContextType {
    systemSettings: SystemSettings;
    updateDepositAddress: (asset: keyof SystemSettings['depositAddresses'], value: string) => Promise<void>;
    updateSetting: <K extends keyof Omit<SystemSettings, 'marketSettings' | 'marketInterventions'>>(key: K, value: SystemSettings[K]) => Promise<void>;
    updatePairSettings: (pair: string, newSettings: Partial<TradingPairSettings>) => Promise<void>;
    addMarketIntervention: () => Promise<void>;
    removeMarketIntervention: (id: string) => Promise<void>;
    updateMarketIntervention: (id: string, updates: Partial<MarketIntervention>) => Promise<void>;
}

const getDefaultPairSettings = (): TradingPairSettings => ({
    isTradingHalted: false,
    baseProfitRate: 0.85,
});

const defaultMarketSettings: { [key: string]: TradingPairSettings } = availablePairs.reduce((acc, pair) => {
    acc[pair] = getDefaultPairSettings();
    return acc;
}, {} as { [key: string]: TradingPairSettings });


const defaultSystemSettings: SystemSettings = {
    depositAddresses: {
        USDT: "",
        ETH: "",
        BTC: "",
        USD: "",
    },
    contractTradingEnabled: true,
    marketSettings: defaultMarketSettings,
    marketInterventions: [],
};

const SystemSettingsContext = createContext<SystemSettingsContextType | undefined>(undefined);

export function SystemSettingsProvider({ children }: { children: ReactNode }) {
    const [systemSettings, setSystemSettings] = useState<SystemSettings>(defaultSystemSettings);

    const fetchSettings = useCallback(async () => {
        if (!isSupabaseEnabled) return;
        const { data, error } = await supabase
            .from('system_settings')
            .select('settings')
            .single();

        if (error && error.code !== 'PGRST116') { // Ignore 'no rows found' error, use defaults
            console.error("Failed to load system settings from Supabase", error);
        } else if (data) {
            const dbSettings = data.settings as Partial<SystemSettings>;
            setSystemSettings(prev => ({
                ...defaultSystemSettings,
                ...prev,
                ...dbSettings,
                 marketSettings: {
                    ...defaultSystemSettings.marketSettings,
                    ...(dbSettings.marketSettings || {})
                },
                depositAddresses: {
                    ...defaultSystemSettings.depositAddresses,
                    ...(dbSettings.depositAddresses || {})
                },
                marketInterventions: dbSettings.marketInterventions || [],
            }));
        }
    }, []);

    useEffect(() => {
        fetchSettings();
    }, [fetchSettings]);

    const updateAndPersistSettings = useCallback(async (newSettings: SystemSettings) => {
        setSystemSettings(newSettings);
        if (!isSupabaseEnabled) return;
        const { error } = await supabase
            .from('system_settings')
            .upsert({ id: 1, settings: newSettings }, { onConflict: 'id' });
        if (error) {
            console.error("Failed to save system settings to Supabase", error);
            // Optionally, revert state or show a toast
        }
    }, []);

    const updateDepositAddress = useCallback(async (asset: keyof SystemSettings['depositAddresses'], value: string) => {
        const newSettings = {
            ...systemSettings,
            depositAddresses: {
                ...systemSettings.depositAddresses,
                [asset]: value,
            }
        };
        await updateAndPersistSettings(newSettings);
    }, [systemSettings, updateAndPersistSettings]);

    const updateSetting = useCallback(async <K extends keyof Omit<SystemSettings, 'marketSettings' | 'marketInterventions'>>(key: K, value: SystemSettings[K]) => {
        const newSettings = { ...systemSettings, [key]: value };
        await updateAndPersistSettings(newSettings);
    }, [systemSettings, updateAndPersistSettings]);

    const updatePairSettings = useCallback(async (pair: string, newSettings: Partial<TradingPairSettings>) => {
        const updatedSettings = {
            ...systemSettings,
            marketSettings: {
                ...systemSettings.marketSettings,
                [pair]: {
                    ...(systemSettings.marketSettings[pair] || getDefaultPairSettings()),
                    ...newSettings,
                }
            }
        };
       await updateAndPersistSettings(updatedSettings);
    }, [systemSettings, updateAndPersistSettings]);

    const addMarketIntervention = useCallback(async () => {
        if (systemSettings.marketInterventions.length >= 5) return;
        const newIntervention: MarketIntervention = {
            id: `intervention-${Date.now()}`,
            tradingPair: 'BTC/USDT',
            startTime: '10:00',
            endTime: '11:00',
            minPrice: 65000,
            maxPrice: 66000,
            trend: 'random',
        };
        const newSettings = {
            ...systemSettings,
            marketInterventions: [...systemSettings.marketInterventions, newIntervention]
        };
        await updateAndPersistSettings(newSettings);
    }, [systemSettings, updateAndPersistSettings]);

    const removeMarketIntervention = useCallback(async (id: string) => {
        const newSettings = {
            ...systemSettings,
            marketInterventions: systemSettings.marketInterventions.filter(i => i.id !== id),
        };
        await updateAndPersistSettings(newSettings);
    }, [systemSettings, updateAndPersistSettings]);


    const updateMarketIntervention = useCallback(async (id: string, updates: Partial<MarketIntervention>) => {
        const newSettings = {
            ...systemSettings,
            marketInterventions: systemSettings.marketInterventions.map(i =>
                i.id === id ? { ...i, ...updates } : i
            ),
        };
        await updateAndPersistSettings(newSettings);
    }, [systemSettings, updateAndPersistSettings]);

    return (
        <SystemSettingsContext.Provider value={{ 
            systemSettings, 
            updateDepositAddress, 
            updateSetting,
            updatePairSettings,
            addMarketIntervention,
            removeMarketIntervention,
            updateMarketIntervention,
        }}>
            {children}
        </SystemSettingsContext.Provider>
    );
}

export function useSystemSettings() {
    const context = useContext(SystemSettingsContext);
    if (context === undefined) {
        throw new Error('useSystemSettings must be used within a SystemSettingsProvider');
    }
    return context;
}
