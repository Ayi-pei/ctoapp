
"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';

const SETTINGS_STORAGE_KEY = 'tradeflow_system_settings';

export type SystemSettings = {
    depositAddress: string;
};

interface SystemSettingsContextType {
    systemSettings: SystemSettings;
    updateSystemSetting: (key: keyof SystemSettings, value: string) => void;
}

const defaultSystemSettings: SystemSettings = {
    depositAddress: "",
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
                setSystemSettings(JSON.parse(storedSettings));
            }
        } catch (error) {
            console.error("Failed to load system settings from localStorage", error);
        }
        setIsLoaded(true);
    }, []);

    // Save settings to localStorage whenever they change
    useEffect(() => {
        // Only save after initial load to prevent overwriting with defaults
        if (isLoaded) {
            try {
                localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(systemSettings));
            } catch (error) {
                console.error("Failed to save system settings to localStorage", error);
            }
        }
    }, [systemSettings, isLoaded]);

    const updateSystemSetting = useCallback((key: keyof SystemSettings, value: string) => {
        setSystemSettings(prevSettings => ({
            ...prevSettings,
            [key]: value,
        }));
    }, []);

    return (
        <SystemSettingsContext.Provider value={{ systemSettings, updateSystemSetting }}>
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
