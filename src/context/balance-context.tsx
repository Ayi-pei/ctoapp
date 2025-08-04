
"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { Trade } from '@/types';

const INITIAL_BALANCE = 10000;

export type Investment = {
    id: string;
    productName: string;
    amount: number;
    date: string;
}

interface BalanceContextType {
  balance: number;
  investments: Investment[];
  placeTrade: (trade: Omit<Trade, 'id' | 'time' | 'price'>) => void;
  addInvestment: (productName: string, amount: number) => boolean;
  isLoading: boolean;
}

const BalanceContext = createContext<BalanceContextType | undefined>(undefined);

export function BalanceProvider({ children }: { children: ReactNode }) {
  const [balance, setBalance] = useState(INITIAL_BALANCE);
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    try {
      const storedBalance = localStorage.getItem('userBalance');
      if (storedBalance) {
        setBalance(parseFloat(storedBalance));
      } else {
        setBalance(INITIAL_BALANCE);
      }

      const storedInvestments = localStorage.getItem('userInvestments');
      if (storedInvestments) {
        setInvestments(JSON.parse(storedInvestments));
      }

    } catch (error) {
      console.error("Could not access localStorage.", error);
      setBalance(INITIAL_BALANCE);
    } finally {
        setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isLoading) {
      try {
        localStorage.setItem('userBalance', balance.toString());
        localStorage.setItem('userInvestments', JSON.stringify(investments));
      } catch (error) {
         console.error("Could not access localStorage.", error);
      }
    }
  }, [balance, investments, isLoading]);

  const placeTrade = useCallback((trade: Omit<Trade, 'id' | 'time' | 'price'>) => {
    setBalance(prevBalance => prevBalance - trade.amount);
    // Here you would also add logic to handle winning/losing the trade after the period
    // For simulation, we are just deducting the amount.
  }, []);
  
  const addInvestment = useCallback((productName: string, amount: number): boolean => {
    if (amount > balance) {
        return false;
    }
    setBalance(prevBalance => prevBalance - amount);
    const newInvestment: Investment = {
        id: `inv-${Date.now()}`,
        productName,
        amount,
        date: new Date().toLocaleDateString('en-CA'),
    };
    setInvestments(prevInvestments => [...prevInvestments, newInvestment]);
    return true;

  }, [balance]);

  const value = { balance, investments, placeTrade, addInvestment, isLoading };

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
