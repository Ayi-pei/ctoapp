
"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { availablePairs } from '@/types';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';

export type SpecialTimeFrame = {
    id: string;
    startTime: string;
    endTime: string;
    profitRate: number;
};

export type TradingPairSettings = {
    trend: 'up' | 'down' | 'normal';
    tradingDisabled: boolean;
    baseProfitRate: number;
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
    const { toast } = useToast();
    
    const saveSettingsToDb = useCallback(async (newSettings: AllSettings) => {
        try {
            const { error } = await supabase
                .from('market_settings')
                .upsert({ id: 1, settings_data: newSettings, updated_at: new Date().toISOString() }, { onConflict: 'id' });
            
            if (error) throw error;
        } catch(e) {
            console.error("Failed to save settings to Supabase", e);
            toast({ variant: "destructive", title: "错误", description: "保存市场设置失败。" });
        }
    }, [toast]);


    useEffect(() => {
        const fetchSettings = async () => {
            try {
                const { data, error } = await supabase
                    .from('market_settings')
                    .select('settings_data')
                    .single();

                if (error && error.code !== 'PGRST116') { // PGRST116: no rows found
                    throw error;
                }

                if (data && data.settings_data) {
                    const parsedSettings = data.settings_data as AllSettings;
                    const mergedSettings: AllSettings = {};
                    for (const pair of availablePairs) {
                        mergedSettings[pair] = { 
                            ...getDefaultPairSettings(), 
                            ...(parsedSettings[pair] || {}) 
                        };
                    }
                    setSettings(mergedSettings);
                } else {
                    // This case happens if no settings are in the DB yet.
                    // We should create the initial record.
                    await saveSettingsToDb(defaultSettings);
                    setSettings(defaultSettings);
                }
            } catch (e: any) {
                // If the table doesn't exist (e.g., code 42P01 in postgres), create it by saving default settings.
                if(e.code === '42P01'){
                    console.warn("market_settings table not found. Initializing with default settings.");
                    await saveSettingsToDb(defaultSettings);
                    setSettings(defaultSettings);
                } else {
                    console.error("Failed to load settings from Supabase", e);
                    setSettings(defaultSettings);
                    toast({ variant: "destructive", title: "错误", description: "加载市场设置失败。" });
                }
            }
        };

        fetchSettings();
    }, [saveSettingsToDb, toast]);

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
            saveSettingsToDb(allNewSettings);
            return allNewSettings;
        });
    }, [saveSettingsToDb]);

    const addSpecialTimeFrame = useCallback((pair: string) => {
        setSettings(prevSettings => {
            const newFrame: SpecialTimeFrame = {
                id: `frame_${Date.now()}`,
                startTime: "00:00",
                endTime: "23:59",
                profitRate: 0.90,
            };
            const pairSettings = prevSettings[pair] || getDefaultPairSettings();
            const updatedFrames = [...pairSettings.specialTimeFrames, newFrame];
            const allNewSettings = {
                ...prevSettings,
                [pair]: { ...pairSettings, specialTimeFrames: updatedFrames },
            };
            saveSettingsToDb(allNewSettings);
            return allNewSettings;
        });
    }, [saveSettingsToDb]);

    const removeSpecialTimeFrame = useCallback((pair: string, frameId: string) => {
        setSettings(prevSettings => {
            const pairSettings = prevSettings[pair];
            if (!pairSettings) return prevSettings;
            
            const updatedFrames = pairSettings.specialTimeFrames.filter(frame => frame.id !== frameId);
            const allNewSettings = {
                ...prevSettings,
                [pair]: { ...pairSettings, specialTimeFrames: updatedFrames },
            };
            saveSettingsToDb(allNewSettings);
            return allNewSettings;
        });
    }, [saveSettingsToDb]);

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
            saveSettingsToDb(allNewSettings);
            return allNewSettings;
        });
    }, [saveSettingsToDb]);


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
