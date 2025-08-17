
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
    time: string;
    pair: string;
    price: number;
}

export type TradingPairSettings = {
    trend: 'up' | 'down' | 'normal';
    tradingDisabled: boolean; 
    isTradingHalted: boolean; 
    volatility: number; 
    baseProfitRate: number;
    specialTimeFrames: SpecialTimeFrame[];
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
}

const getDefaultPairSettings = (): TradingPairSettings => ({
    trend: 'normal',
    tradingDisabled: false,
    isTradingHalted: false,
    volatility: Math.random() * (0.02 - 0.01) + 0.01,
    baseProfitRate: 0.85,
    specialTimeFrames: [],
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
            time: '12:00',
            pair: availablePairs[0],
            price: 0
        }]);
    }, []);

    const removeTimedMarketPreset = useCallback((presetId: string) => {
        setTimedMarketPresets(prev => prev.filter(p => p.id !== presetId));
    }, []);

    const updateTimedMarketPreset = useCallback((presetId: string, updates: Partial<TimedMarketPreset>) => {
        setTimedMarketPresets(prev => prev.map(p => p.id === presetId ? { ...p, ...updates } : p));
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
            updateTimedMarketPreset
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
