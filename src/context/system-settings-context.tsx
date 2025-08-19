
"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { availablePairs } from '@/types';

const SETTINGS_STORAGE_KEY = 'tradeflow_system_settings_v3';

// Define the shape of settings for a single trading pair
export type TradingPairSettings = {
    trend: 'up' | 'down' | 'normal';
    tradingDisabled: boolean;
    isTradingHalted: boolean;
    volatility: number;
    baseProfitRate: number;
    specialTimeFrames: SpecialTimeFrame[];
    marketOverrides: MarketOverridePreset[];
};

// Define the shape for special time frames with custom profit rates
export type SpecialTimeFrame = {
    id: string;
    startTime: string;
    endTime: string;
    profitRate: number;
};

// Define the shape for market data override presets
export type MarketOverridePreset = {
    id:string;
    startTime: string;
    endTime: string;
    minPrice: number;
    maxPrice: number;
    frequency: 'day' | 'night';
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
};

interface SystemSettingsContextType {
    systemSettings: SystemSettings;
    updateDepositAddress: (asset: keyof SystemSettings['depositAddresses'], value: string) => void;
    updateSetting: <K extends keyof Omit<SystemSettings, 'marketSettings'>>(key: K, value: SystemSettings[K]) => void;
    updatePairSettings: (pair: string, newSettings: Partial<TradingPairSettings>) => void;
    addSpecialTimeFrame: (pair: string) => void;
    removeSpecialTimeFrame: (pair: string, frameId: string) => void;
    updateSpecialTimeFrame: (pair: string, frameId: string, updates: Partial<SpecialTimeFrame>) => void;
    addMarketOverride: (pair: string) => void;
    removeMarketOverride: (pair: string, overrideId: string) => void;
    updateMarketOverride: (pair: string, overrideId: string, updates: Partial<MarketOverridePreset>) => void;
}

const getDefaultPairSettings = (): TradingPairSettings => ({
    trend: 'normal',
    tradingDisabled: false,
    isTradingHalted: false,
    volatility: Math.random() * (0.02 - 0.01) + 0.01,
    baseProfitRate: 0.85,
    specialTimeFrames: [],
    marketOverrides: [],
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

    const updateSetting = useCallback(<K extends keyof Omit<SystemSettings, 'marketSettings'>>(key: K, value: SystemSettings[K]) => {
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

    const addSpecialTimeFrame = useCallback((pair: string) => {
        setSystemSettings(prev => {
            const newFrame: SpecialTimeFrame = { id: `frame_${Date.now()}`, startTime: "10:00", endTime: "11:00", profitRate: 0.90 };
            const pairSettings = prev.marketSettings[pair] || getDefaultPairSettings();
            const updatedFrames = [...pairSettings.specialTimeFrames, newFrame];
            return { ...prev, marketSettings: { ...prev.marketSettings, [pair]: { ...pairSettings, specialTimeFrames: updatedFrames } } };
        });
    }, []);

    const removeSpecialTimeFrame = useCallback((pair: string, frameId: string) => {
        setSystemSettings(prev => {
            const pairSettings = prev.marketSettings[pair];
            if (!pairSettings) return prev;
            const updatedFrames = pairSettings.specialTimeFrames.filter(f => f.id !== frameId);
            return { ...prev, marketSettings: { ...prev.marketSettings, [pair]: { ...pairSettings, specialTimeFrames: updatedFrames } } };
        });
    }, []);

    const updateSpecialTimeFrame = useCallback((pair: string, frameId: string, updates: Partial<SpecialTimeFrame>) => {
        setSystemSettings(prev => {
            const pairSettings = prev.marketSettings[pair];
            if (!pairSettings) return prev;
            const updatedFrames = pairSettings.specialTimeFrames.map(f => f.id === frameId ? { ...f, ...updates } : f);
            return { ...prev, marketSettings: { ...prev.marketSettings, [pair]: { ...pairSettings, specialTimeFrames: updatedFrames } } };
        });
    }, []);

    const addMarketOverride = useCallback((pair: string) => {
        setSystemSettings(prev => {
            const newOverride: MarketOverridePreset = { id: `override_${Date.now()}`, startTime: '14:30', endTime: '14:35', minPrice: 65000, maxPrice: 65100, frequency: 'day' };
            const pairSettings = prev.marketSettings[pair] || getDefaultPairSettings();
            const updatedOverrides = [...pairSettings.marketOverrides, newOverride];
            return { ...prev, marketSettings: { ...prev.marketSettings, [pair]: { ...pairSettings, marketOverrides: updatedOverrides } } };
        });
    }, []);

    const removeMarketOverride = useCallback((pair: string, overrideId: string) => {
        setSystemSettings(prev => {
            const pairSettings = prev.marketSettings[pair];
            if (!pairSettings) return prev;
            const updatedOverrides = pairSettings.marketOverrides.filter(o => o.id !== overrideId);
            return { ...prev, marketSettings: { ...prev.marketSettings, [pair]: { ...pairSettings, marketOverrides: updatedOverrides } } };
        });
    }, []);

    const updateMarketOverride = useCallback((pair: string, overrideId: string, updates: Partial<MarketOverridePreset>) => {
        setSystemSettings(prev => {
            const pairSettings = prev.marketSettings[pair];
            if (!pairSettings) return prev;
            const updatedOverrides = pairSettings.marketOverrides.map(o => o.id === overrideId ? { ...o, ...updates } : o);
            return { ...prev, marketSettings: { ...prev.marketSettings, [pair]: { ...pairSettings, marketOverrides: updatedOverrides } } };
        });
    }, []);

    return (
        <SystemSettingsContext.Provider value={{ 
            systemSettings, 
            updateDepositAddress, 
            updateSetting,
            updatePairSettings,
            addSpecialTimeFrame,
            removeSpecialTimeFrame,
            updateSpecialTimeFrame,
            addMarketOverride,
            removeMarketOverride,
            updateMarketOverride,
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
