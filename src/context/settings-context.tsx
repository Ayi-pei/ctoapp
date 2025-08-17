
"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { availablePairs } from '@/types';

export type SpecialTimeFrame = {
    id: string;
    startTime: string; 
    endTime: string;   
    profitRate: number; 
};

export type TimedMarketPreset = {
    id: string;
    action: 'buy' | 'sell';
    startTime: string;
    endTime: string;
    pair: string;
    minPrice: number;
    maxPrice: number;
}

export type MarketOverridePreset = {
    id: string;
    startTime: string;
    endTime: string;
    minPrice: number;
    maxPrice: number;
    frequency: 'day' | 'night';
}

export type TradingPairSettings = {
    trend: 'up' | 'down' | 'normal';
    tradingDisabled: boolean; 
    isTradingHalted: boolean; 
    volatility: number; 
    baseProfitRate: number;
    specialTimeFrames: SpecialTimeFrame[];
    marketOverrides: MarketOverridePreset[];
};

type AllSettings = {
    [key: string]: TradingPairSettings;
};

interface SettingsContextType {
    settings: AllSettings;
    timedMarketPresets: TimedMarketPreset[];
    updateSettings: (pair: string, newSettings: Partial<TradingPairSettings>) => void;
    addSpecialTimeFrame: (pair: string) => void;
    removeSpecialTimeFrame: (pair: string, frameId: string) => void;
    updateSpecialTimeFrame: (pair: string, frameId: string, updates: Partial<SpecialTimeFrame>) => void;
    addTimedMarketPreset: () => void;
    removeTimedMarketPreset: (presetId: string) => void;
    updateTimedMarketPreset: (presetId: string, updates: Partial<TimedMarketPreset>) => void;
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

const defaultSettings: AllSettings = availablePairs.reduce((acc, pair) => {
    acc[pair] = getDefaultPairSettings();
    return acc;
}, {} as AllSettings);

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export function SettingsProvider({ children }: { children: ReactNode }) {
    const [settings, setSettings] = useState<AllSettings>(defaultSettings);
    const [timedMarketPresets, setTimedMarketPresets] = useState<TimedMarketPreset[]>([]);
    
    const updateSettings = useCallback((pair: string, newSettings: Partial<TradingPairSettings>) => {
        setSettings(prevSettings => {
            const updatedPairSettings = {
                ...(prevSettings[pair] || getDefaultPairSettings()),
                ...newSettings,
            };
            const allNewSettings = {
                ...prevSettings,
                [pair]: updatedPairSettings,
            };
            return allNewSettings;
        });
    }, []);

    const addSpecialTimeFrame = useCallback((pair: string) => {
        setSettings(prevSettings => {
            const newFrame: SpecialTimeFrame = {
                id: `frame_${Date.now()}`,
                startTime: "10:00",
                endTime: "11:00",
                profitRate: 0.90,
            };
            const pairSettings = prevSettings[pair] || getDefaultPairSettings();
            const updatedFrames = [...pairSettings.specialTimeFrames, newFrame];
            const allNewSettings = {
                ...prevSettings,
                [pair]: { ...pairSettings, specialTimeFrames: updatedFrames },
            };
            return allNewSettings;
        });
    }, []);

    const removeSpecialTimeFrame = useCallback((pair: string, frameId: string) => {
        setSettings(prevSettings => {
            const pairSettings = prevSettings[pair];
            if (!pairSettings) return prevSettings;
            
            const updatedFrames = pairSettings.specialTimeFrames.filter(frame => frame.id !== frameId);
            const allNewSettings = {
                ...prevSettings,
                [pair]: { ...pairSettings, specialTimeFrames: updatedFrames },
            };
            return allNewSettings;
        });
    }, []);

    const updateSpecialTimeFrame = useCallback((pair: string, frameId: string, updates: Partial<SpecialTimeFrame>) => {
        setSettings(prevSettings => {
            const pairSettings = prevSettings[pair];
            if (!pairSettings) return prevSettings;

            const updatedFrames = pairSettings.specialTimeFrames.map(frame =>
                frame.id === frameId ? { ...frame, ...updates } : frame
            );

            const allNewSettings = {
                ...prevSettings,
                [pair]: { ...pairSettings, specialTimeFrames: updatedFrames },
            };
            return allNewSettings;
        });
    }, []);

    const addTimedMarketPreset = useCallback(() => {
        setTimedMarketPresets(prev => [...prev, {
            id: `preset_${Date.now()}`,
            action: 'buy',
            startTime: '12:00',
            endTime: '13:00',
            pair: availablePairs[0],
            minPrice: 65000,
            maxPrice: 65100,
        }]);
    }, []);

    const removeTimedMarketPreset = useCallback((presetId: string) => {
        setTimedMarketPresets(prev => prev.filter(p => p.id !== presetId));
    }, []);

    const updateTimedMarketPreset = useCallback((presetId: string, updates: Partial<TimedMarketPreset>) => {
        setTimedMarketPresets(prev => prev.map(p => p.id === presetId ? { ...p, ...updates } : p));
    }, []);

    const addMarketOverride = useCallback((pair: string) => {
        setSettings(prev => {
            const newOverride: MarketOverridePreset = {
                id: `override_${Date.now()}`,
                startTime: '14:30',
                endTime: '14:35',
                minPrice: 65000,
                maxPrice: 65100,
                frequency: 'day',
            };
            const pairSettings = prev[pair] || getDefaultPairSettings();
            const updatedOverrides = [...pairSettings.marketOverrides, newOverride];
            return {
                ...prev,
                [pair]: { ...pairSettings, marketOverrides: updatedOverrides },
            };
        });
    }, []);

    const removeMarketOverride = useCallback((pair: string, overrideId: string) => {
        setSettings(prev => {
            const pairSettings = prev[pair];
            if (!pairSettings) return prev;
            const updatedOverrides = pairSettings.marketOverrides.filter(o => o.id !== overrideId);
            return {
                ...prev,
                [pair]: { ...pairSettings, marketOverrides: updatedOverrides },
            };
        });
    }, []);

    const updateMarketOverride = useCallback((pair: string, overrideId: string, updates: Partial<MarketOverridePreset>) => {
        setSettings(prev => {
            const pairSettings = prev[pair];
            if (!pairSettings) return prev;
            const updatedOverrides = pairSettings.marketOverrides.map(o =>
                o.id === overrideId ? { ...o, ...updates } : o
            );
            return {
                ...prev,
                [pair]: { ...pairSettings, marketOverrides: updatedOverrides },
            };
        });
    }, []);


    return (
        <SettingsContext.Provider value={{ 
            settings, 
            timedMarketPresets,
            updateSettings, 
            addSpecialTimeFrame, 
            removeSpecialTimeFrame, 
            updateSpecialTimeFrame,
            addTimedMarketPreset,
            removeTimedMarketPreset,
            updateTimedMarketPreset,
            addMarketOverride,
            removeMarketOverride,
            updateMarketOverride,
        }}>
            {children}
        </SettingsContext.Provider>
    );
}

export function useSettings() {
    const context = useContext(SettingsContext);
    if (context === undefined) {
        throw new Error('useSettings must be used within a SettingsProvider');
    }
    return context;
}

    
