
"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { Trade } from '@/types';

const INITIAL_BALANCE = 10000;

interface BalanceContextType {
  balance: number;
  placeTrade: (trade: Omit<Trade, 'id' | 'time' | 'price'>) => void;
  isLoading: boolean;
}

const BalanceContext = createContext<BalanceContextType | undefined>(undefined);

export function BalanceProvider({ children }: { children: ReactNode }) {
  const [balance, setBalance] = useState(INITIAL_BALANCE);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const storedBalance = localStorage.getItem('userBalance');
    if (storedBalance) {
      setBalance(parseFloat(storedBalance));
    } else {
      setBalance(INITIAL_BALANCE);
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    if (!isLoading) {
      localStorage.setItem('userBalance', balance.toString());
    }
  }, [balance, isLoading]);

  const placeTrade = useCallback((trade: Omit<Trade, 'id' | 'time' | 'price'>) => {
    setBalance(prevBalance => prevBalance - trade.amount);
    // Here you would also add logic to handle winning/losing the trade after the period
    // For simulation, we are just deducting the amount.
  }, []);

  const value = { balance, placeTrade, isLoading };

  return (
    <BalanceContext.Provider value={value}>
      {!isLoading && children}
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
