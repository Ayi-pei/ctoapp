
"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { ContractTrade, SpotTrade } from '@/types';
import { CircleDollarSign } from 'lucide-react';

const INITIAL_BALANCES = {
    USDT: { available: 10000, frozen: 0 },
    BTC: { available: 0, frozen: 0 },
    ETH: { available: 0, frozen: 0 },
};

const ALL_ASSETS = [
    { name: "USDT", icon: CircleDollarSign },
    { name: "BTC", icon: CircleDollarSign },
    { name: "ETH", icon: CircleDollarSign },
];


interface BalanceContextType {
  balances: { [key: string]: { available: number; frozen: number } };
  assets: { name: string, icon: React.ElementType }[];
  placeContractTrade: (trade: Omit<ContractTrade, 'id' | 'time' | 'price'>) => void;
  placeSpotTrade: (trade: SpotTrade) => void;
  isLoading: boolean;
}

const BalanceContext = createContext<BalanceContextType | undefined>(undefined);

export function BalanceProvider({ children }: { children: ReactNode }) {
  const [balances, setBalances] = useState(INITIAL_BALANCES);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    try {
      const storedBalances = localStorage.getItem('userBalances');
      if (storedBalances) {
        setBalances(JSON.parse(storedBalances));
      } else {
        setBalances(INITIAL_BALANCES);
      }
    } catch (error) {
      console.error("Could not access localStorage.", error);
      setBalances(INITIAL_BALANCES);
    } finally {
        setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isLoading) {
      try {
        localStorage.setItem('userBalances', JSON.stringify(balances));
      } catch (error) {
         console.error("Could not access localStorage.", error);
      }
    }
  }, [balances, isLoading]);

  const placeContractTrade = useCallback((trade: Omit<ContractTrade, 'id' | 'time' | 'price'>) => {
    setBalances(prevBalances => {
        const newBalances = { ...prevBalances };
        newBalances.USDT = {
            ...newBalances.USDT,
            available: newBalances.USDT.available - trade.amount,
        };
        return newBalances;
    });
    // Here you would also add logic to handle winning/losing the trade after the period
    // For simulation, we are just deducting the amount.
  }, []);
  
  const placeSpotTrade = useCallback((trade: SpotTrade) => {
    setBalances(prevBalances => {
        const newBalances = JSON.parse(JSON.stringify(prevBalances));
        
        const baseAsset = trade.baseAsset;
        const quoteAsset = trade.quoteAsset;
        
        if (trade.type === 'buy') {
            // Deduct quote asset
            newBalances[quoteAsset].available -= trade.total;
            // Add base asset
            newBalances[baseAsset].available += trade.amount;
        } else { // sell
            // Deduct base asset
            newBalances[baseAsset].available -= trade.amount;
            // Add quote asset
            newBalances[quoteAsset].available += trade.total;
        }
        
        return newBalances;
    });
  }, []);


  const value = { balances, assets: ALL_ASSETS, placeContractTrade, placeSpotTrade, isLoading };

  return (
    <BalanceContext.Provider value={value}>
      {children}
    </BalanceContext.Provider>
  );
}

export function useBalance() {
  const context = useContext(BalanceContext);
  if (context === undefined) {
    throw new Error('useBalance must be used within a BalanceProvider');
  }
  return context;
}
