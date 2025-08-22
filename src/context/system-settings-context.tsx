
"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { availablePairs, MarketIntervention } from '@/types';

const SETTINGS_STORAGE_KEY = 'tradeflow_system_settings_v4';

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
    marketInterventions: MarketIntervention[]; // Moved from being nested to top-level
};

interface SystemSettingsContextType {
    systemSettings: SystemSettings;
    updateDepositAddress: (asset: keyof SystemSettings['depositAddresses'], value: string) => void;
    updateSetting: <K extends keyof Omit<SystemSettings, 'marketSettings' | 'marketInterventions'>>(key: K, value: SystemSettings[K]) => void;
    updatePairSettings: (pair: string, newSettings: Partial<TradingPairSettings>) => void;
    
    // New functions for managing global interventions
    addMarketIntervention: () => void;
    removeMarketIntervention: (id: string) => void;
    updateMarketIntervention: (id: string, updates: Partial<MarketIntervention>) => void;
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
    marketInterventions: [], // Initialize as empty array
};

const SystemSettingsContext = createContext<SystemSettingsContextType | undefined>(undefined);

export function SystemSettingsProvider({ children }: { children: ReactNode }) {
    const [systemSettings, setSystemSettings] = useState<SystemSettings>(defaultSystemSettings);
    const [isLoaded, setIsLoaded] = useState(false);

    useEffect(() => {
        try {
            const storedSettings = localStorage.getItem(SETTINGS_STORAGE_KEY);
            if (storedSettings) {
                const parsedSettings = JSON.parse(storedSettings);
                setSystemSettings(prev => ({
                    ...defaultSystemSettings,
                    ...parsedSettings,
                    marketSettings: {
                        ...defaultSystemSettings.marketSettings,
                        ...(parsedSettings.marketSettings || {})
                    },
                    depositAddresses: {
                        ...defaultSystemSettings.depositAddresses,
                        ...(parsedSettings.depositAddresses || {})
                    },
                    marketInterventions: parsedSettings.marketInterventions || [],
                }));
            }
        } catch (error) {
            console.error("Failed to load system settings from localStorage", error);
        }
        setIsLoaded(true);
    }, []);

    useEffect(() => {
        if (isLoaded) {
            try {
                localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(systemSettings));
            } catch (error) {
                console.error("Failed to save system settings to localStorage", error);
            }
        }
    }, [systemSettings, isLoaded]);

    const updateDepositAddress = useCallback((asset: keyof SystemSettings['depositAddresses'], value: string) => {
        setSystemSettings(prevSettings => ({
            ...prevSettings,
            depositAddresses: {
                ...prevSettings.depositAddresses,
                [asset]: value,
            }
        }));
    }, []);

    const updateSetting = useCallback(<K extends keyof Omit<SystemSettings, 'marketSettings' | 'marketInterventions'>>(key: K, value: SystemSettings[K]) => {
        setSystemSettings(prevSettings => ({
            ...prevSettings,
            [key]: value,
        }));
    }, []);

    const updatePairSettings = useCallback((pair: string, newSettings: Partial<TradingPairSettings>) => {
        setSystemSettings(prev => ({
            ...prev,
            marketSettings: {
                ...prev.marketSettings,
                [pair]: {
                    ...(prev.marketSettings[pair] || getDefaultPairSettings()),
                    ...newSettings,
                }
            }
        }));
    }, []);

    const addMarketIntervention = useCallback(() => {
        if (systemSettings.marketInterventions.length >= 5) return;
        setSystemSettings(prev => ({
            ...prev,
            marketInterventions: [
                ...prev.marketInterventions,
                {
                    id: `intervention-${Date.now()}`,
                    tradingPair: 'BTC/USDT',
                    startTime: '10:00',
                    endTime: '11:00',
                    minPrice: 65000,
                    maxPrice: 66000,
                    trend: 'random',
                }
            ]
        }));
    }, [systemSettings.marketInterventions.length]);

    const removeMarketIntervention = useCallback((id: string) => {
        setSystemSettings(prev => ({
            ...prev,
            marketInterventions: prev.marketInterventions.filter(i => i.id !== id),
        }));
    }, []);

    const updateMarketIntervention = useCallback((id: string, updates: Partial<MarketIntervention>) => {
        setSystemSettings(prev => ({
            ...prev,
            marketInterventions: prev.marketInterventions.map(i =>
                i.id === id ? { ...i, ...updates } : i
            ),
        }));
    }, []);

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
