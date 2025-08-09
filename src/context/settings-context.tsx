
"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { availablePairs } from '@/types';

export type TradingPairSettings = {
    trend: 'up' | 'down' | 'normal';
    tradingDisabled: boolean;
    profitRate: number;
};

type AllSettings = {
    [key: string]: TradingPairSettings;
};

interface SettingsContextType {
    settings: AllSettings;
    updateSettings: (pair: string, newSettings: Partial<TradingPairSettings>) => void;
}

const defaultSettings: AllSettings = availablePairs.reduce((acc, pair) => {
    acc[pair] = {
        trend: 'normal',
        tradingDisabled: false,
        profitRate: 0.85, // Default 85% profit rate
    };
    return acc;
}, {} as AllSettings);

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export function SettingsProvider({ children }: { children: ReactNode }) {
    const [settings, setSettings] = useState<AllSettings>({});
    
    useEffect(() => {
        try {
            const storedSettings = localStorage.getItem('marketSettings');
            if (storedSettings) {
                // Merge stored settings with defaults to ensure all pairs are present
                const parsedSettings = JSON.parse(storedSettings);
                const mergedSettings = { ...defaultSettings, ...parsedSettings };
                setSettings(mergedSettings);
            } else {
                setSettings(defaultSettings);
            }
        } catch (e) {
            console.error("Failed to load settings from localStorage", e);
            setSettings(defaultSettings);
        }
    }, []);

    const updateSettings = useCallback((pair: string, newSettings: Partial<TradingPairSettings>) => {
        setSettings(prevSettings => {
            const updatedPairSettings = {
                ...prevSettings[pair],
                ...newSettings,
            };
            const allNewSettings = {
                ...prevSettings,
                [pair]: updatedPairSettings,
            };
            
            try {
                localStorage.setItem('marketSettings', JSON.stringify(allNewSettings));
            } catch(e) {
                console.error("Failed to save settings to localStorage", e);
            }

            return allNewSettings;
        });
    }, []);

    return (
        <SettingsContext.Provider value={{ settings, updateSettings }}>
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
