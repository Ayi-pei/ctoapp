
"use client";

import { ThemeProvider, useTheme as useNextTheme } from 'next-themes';
import React, { createContext, useContext, ReactNode } from 'react';

type Theme = 'dark' | 'light';

interface ThemeContextType {
    theme: Theme;
    setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

// This is a custom hook that wraps the one from next-themes
export function useTheme() {
    const context = useContext(ThemeContext);
    if (context === undefined) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return context;
}

// You can keep a separate provider if you have other theme-related state,
// but for just wrapping next-themes, we can simplify.
// For now, let's keep it in case you want to add more context later.
export function CustomThemeProvider({ children }: { children: ReactNode }) {
    const { theme, setTheme } = useNextTheme();

    return (
        <ThemeContext.Provider value={{ theme: (theme as Theme) || 'dark', setTheme }}>
            {children}
        </ThemeContext.Provider>
    );
}
