
"use client";
import React, { createContext, useContext, useState, ReactNode } from "react";

export type AdminSettings = {
  overrideActive: boolean;
  overridePrice?: number;
  overrideVolume?: number;
  overrideDuration?: number; // 秒
};

type AdminSettingsContextType = {
  settings: AdminSettings;
  setSettings: (settings: AdminSettings) => void;
  startOverride: (price: number, volume: number, duration: number) => void;
};

const AdminSettingsContext = createContext<AdminSettingsContextType | undefined>(undefined);

export const useAdminSettings = () => {
  const ctx = useContext(AdminSettingsContext);
  if (!ctx) throw new Error("useAdminSettings must be used within AdminSettingsProvider");
  return ctx;
};

export const AdminSettingsProvider = ({ children }: { children: ReactNode }) => {
  const [settings, setSettings] = useState<AdminSettings>({
    overrideActive: false,
  });

  // 启动临时干预
  const startOverride = (price: number, volume: number, duration: number) => {
    setSettings({ overrideActive: true, overridePrice: price, overrideVolume: volume, overrideDuration: duration });
    setTimeout(() => {
      setSettings({ overrideActive: false });
    }, duration * 1000);
  };

  return (
    <AdminSettingsContext.Provider value={{ settings, setSettings, startOverride }}>
      {children}
    </AdminSettingsContext.Provider>
  );
};
