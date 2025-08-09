
"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { availablePairs } from '@/types';

export type SpecialTimeFrame = {
    id: string; // e.g., timestamp or a unique string
    startTime: string;
    endTime: string;
    profitRate: number;
};

export type TradingPairSettings = {
    trend: 'up' | 'down' | 'normal';
    tradingDisabled: boolean; // This now acts as a master switch for all special time frames
    baseProfitRate: number; // The default profit rate outside of any special time frames
    specialTimeFrames: SpecialTimeFrame[];
};

type AllSettings = {
    [key: string]: TradingPairSettings;
};

interface SettingsContextType {
    settings: AllSettings;
    updateSettings: (pair: string, newSettings: Partial<TradingPairSettings>) => void;
    addSpecialTimeFrame: (pair: string) => void;
    removeSpecialTimeFrame: (pair: string, frameId: string) => void;
    updateSpecialTimeFrame: (pair: string, frameId: string, updates: Partial<SpecialTimeFrame>) => void;
}

const getDefaultPairSettings = (): TradingPairSettings => ({
    trend: 'normal',
    tradingDisabled: false,
    baseProfitRate: 0.85, // Default 85% profit rate
    specialTimeFrames: [],
});


const defaultSettings: AllSettings = availablePairs.reduce((acc, pair) => {
    acc[pair] = getDefaultPairSettings();
    return acc;
}, {} as AllSettings);

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export function SettingsProvider({ children }: { children: ReactNode }) {
    const [settings, setSettings] = useState<AllSettings>({});
    
    useEffect(() => {
        try {
            const storedSettings = localStorage.getItem('marketSettings');
            if (storedSettings) {
                const parsedSettings = JSON.parse(storedSettings);
                const mergedSettings = { ...defaultSettings };
                for (const pair of availablePairs) {
                    // Make sure each pair has the default structure, then override with stored data
                    mergedSettings[pair] = { 
                        ...getDefaultPairSettings(), 
                        ...(parsedSettings[pair] || {}) 
                    };
                }
                setSettings(mergedSettings);
            } else {
                setSettings(defaultSettings);
            }
        } catch (e) {
            console.error("Failed to load settings from localStorage", e);
            setSettings(defaultSettings);
        }
    }, []);

    const saveSettings = (newSettings: AllSettings) => {
        try {
            localStorage.setItem('marketSettings', JSON.stringify(newSettings));
        } catch(e) {
            console.error("Failed to save settings to localStorage", e);
        }
    }

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
            saveSettings(allNewSettings);
            return allNewSettings;
        });
    }, []);

    const addSpecialTimeFrame = useCallback((pair: string) => {
        setSettings(prevSettings => {
            const newFrame: SpecialTimeFrame = {
                id: `frame_${Date.now()}`,
                startTime: "00:00",
                endTime: "23:59",
                profitRate: 0.90, // Default 90%
            };
            const pairSettings = prevSettings[pair] || getDefaultPairSettings();
            const updatedFrames = [...pairSettings.specialTimeFrames, newFrame];
            const allNewSettings = {
                ...prevSettings,
                [pair]: { ...pairSettings, specialTimeFrames: updatedFrames },
            };
            saveSettings(allNewSettings);
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
            saveSettings(allNewSettings);
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
            saveSettings(allNewSettings);
            return allNewSettings;
        });
    }, []);


    return (
        <SettingsContext.Provider value={{ settings, updateSettings, addSpecialTimeFrame, removeSpecialTimeFrame, updateSpecialTimeFrame }}>
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
