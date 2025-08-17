
"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';

type Theme = 'dark' | 'light';

interface ThemeContextType {
    theme: Theme;
    setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
    const [theme, setThemeState] = useState<Theme>('dark');
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        const storedTheme = localStorage.getItem('tradeflow-theme') as Theme | null;
        if (storedTheme) {
            setThemeState(storedTheme);
        }
        setIsMounted(true);
    }, []);

    useEffect(() => {
        if (isMounted) {
            const root = window.document.documentElement;
            root.classList.remove('light', 'dark');
            root.classList.add(theme);
        }
    }, [theme, isMounted]);

    const setTheme = useCallback((newTheme: Theme) => {
        localStorage.setItem('tradeflow-theme', newTheme);
        setThemeState(newTheme);
    }, []);

    if (!isMounted) {
        // To prevent hydration mismatch, render nothing or a loader on the server/first-pass.
        // Once mounted, the client-side `useEffect` will kick in.
        return null;
    }

    return (
        <ThemeContext.Provider value={{ theme, setTheme }}>
            {children}
        </ThemeContext.Provider>
    );
}

export function useTheme() {
    const context = useContext(ThemeContext);
    if (context === undefined) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return context;
}
