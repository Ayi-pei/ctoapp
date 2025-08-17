
"use client";
import React, { createContext, useContext, useState, ReactNode } from "react";

// Describes the override state for a single trading pair
export type AdminOverride = {
  active: boolean;
  overridePrice?: number;
  overrideVolume?: number;
  duration?: number; // duration in seconds
};

type AdminSettingsContextType = {
  overrides: Record<string, AdminOverride>;
  startOverride: (symbol: string, price: number, volume: number, duration: number) => void;
};

const AdminSettingsContext = createContext<AdminSettingsContextType | undefined>(undefined);

export const useAdminSettings = () => {
  const ctx = useContext(AdminSettingsContext);
  if (!ctx) throw new Error("useAdminSettings must be used within AdminSettingsProvider");
  return ctx;
};

export const AdminSettingsProvider = ({ children }: { children: ReactNode }) => {
  const [overrides, setOverrides] = useState<Record<string, AdminOverride>>({});

  // Starts a temporary override for a specific symbol
  const startOverride = (symbol: string, price: number, volume: number, duration: number) => {
    // Set the override for the specific symbol
    setOverrides((prev) => ({
      ...prev,
      [symbol]: { active: true, overridePrice: price, overrideVolume: volume, duration },
    }));

    // Automatically cancel the override after the specified duration
    setTimeout(() => {
      setOverrides((prev) => {
        const newOverrides = { ...prev };
        if (newOverrides[symbol]) {
          newOverrides[symbol] = { ...newOverrides[symbol], active: false };
        }
        return newOverrides;
      });
    }, duration * 1000);
  };

  return (
    <AdminSettingsContext.Provider value={{ overrides, startOverride }}>
      {children}
    </AdminSettingsContext.Provider>
  );
};
