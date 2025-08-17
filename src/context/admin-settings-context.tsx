
"use client";

import React, { createContext, useContext, useState, ReactNode, useCallback } from 'react';

interface AdminSettings {
  adminOverrideActive: boolean;
  overridePrice: number;
  overrideDuration: number;
}

interface AdminSettingsContextType extends AdminSettings {
  setAdminOverride: (price: number, duration: number) => void;
  clearAdminOverride: () => void;
}

const AdminSettingsContext = createContext<AdminSettingsContextType | undefined>(undefined);

export const AdminSettingsProvider = ({ children }: { children: ReactNode }) => {
  const [settings, setSettings] = useState<AdminSettings>({
    adminOverrideActive: false,
    overridePrice: 0,
    overrideDuration: 0,
  });

  const setAdminOverride = useCallback((price: number, duration: number) => {
    setSettings({
      adminOverrideActive: true,
      overridePrice: price,
      overrideDuration: duration,
    });

    setTimeout(() => {
      clearAdminOverride();
    }, duration * 1000);
  }, []);

  const clearAdminOverride = useCallback(() => {
    setSettings({
      adminOverrideActive: false,
      overridePrice: 0,
      overrideDuration: 0,
    });
  }, []);

  const value = {
    ...settings,
    setAdminOverride,
    clearAdminOverride,
  };

  return (
    <AdminSettingsContext.Provider value={value}>
      {children}
    </AdminSettingsContext.Provider>
  );
};

export const useAdminSettings = () => {
  const context = useContext(AdminSettingsContext);
  if (!context) {
    throw new Error('useAdminSettings must be used within an AdminSettingsProvider');
  }
  return context;
};
