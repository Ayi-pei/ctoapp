
"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';

const SETTINGS_STORAGE_KEY = 'tradeflow_system_settings';

export type SystemSettings = {
    depositAddresses: {
        USDT: string;
        ETH: string;
        BTC: string;
        USD: string;
    };
    contractTradingEnabled: boolean;
};

interface SystemSettingsContextType {
    systemSettings: SystemSettings;
    updateDepositAddress: (asset: keyof SystemSettings['depositAddresses'], value: string) => void;
    updateSetting: <K extends keyof SystemSettings>(key: K, value: SystemSettings[K]) => void;
}

const defaultSystemSettings: SystemSettings = {
    depositAddresses: {
        USDT: "",
        ETH: "",
        BTC: "",
        USD: "",
    },
    contractTradingEnabled: true,
};

const SystemSettingsContext = createContext<SystemSettingsContextType | undefined>(undefined);

export function SystemSettingsProvider({ children }: { children: ReactNode }) {
    const [systemSettings, setSystemSettings] = useState<SystemSettings>(defaultSystemSettings);
    const [isLoaded, setIsLoaded] = useState(false);

    // Load settings from localStorage on initial render
    useEffect(() => {
        try {
            const storedSettings = localStorage.getItem(SETTINGS_STORAGE_KEY);
            if (storedSettings) {
                // Merge stored settings with defaults to ensure all keys are present
                const parsedSettings = JSON.parse(storedSettings);
                setSystemSettings(prev => ({
                    ...defaultSystemSettings, // Start with defaults
                    ...parsedSettings,      // Override with stored settings
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

    // Save settings to localStorage whenever they change
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

    const updateSetting = useCallback(<K extends keyof SystemSettings>(key: K, value: SystemSettings[K]) => {
        setSystemSettings(prevSettings => ({
            ...prevSettings,
            [key]: value,
        }));
    }, []);
    

    return (
        <SystemSettingsContext.Provider value={{ systemSettings, updateDepositAddress, updateSetting }}>
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
