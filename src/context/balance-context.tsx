
"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { ContractTrade, SpotTrade } from '@/types';
import { CircleDollarSign } from 'lucide-react';
import { useAuth } from './auth-context';

const INITIAL_BALANCES_TEST_USER = {
    USDT: { available: 10000, frozen: 0 },
    BTC: { available: 0.5, frozen: 0 },
    ETH: { available: 10, frozen: 0 },
};

const INITIAL_BALANCES_REAL_USER = {
    USDT: { available: 0, frozen: 0 },
    BTC: { available: 0, frozen: 0 },
    ETH: { available: 0, frozen: 0 },
};

const ALL_ASSETS = [
    { name: "USDT", icon: CircleDollarSign },
    { name: "BTC", icon: CircleDollarSign },
    { name: "ETH", icon: CircleDollarSign },
];

export type Investment = {
    id: string;
    productName: string;
    amount: number;
    date: string;
}


interface BalanceContextType {
  balances: { [key: string]: { available: number; frozen: number } };
  investments: Investment[];
  balance: number; // Keep this for now for finance page
  addInvestment: (productName: string, amount: number) => boolean;
  assets: { name: string, icon: React.ElementType }[];
  placeContractTrade: (trade: Omit<ContractTrade, 'id' | 'price' | 'status' | 'userId' | 'orderType' | 'tradingPair' | 'createdAt'>, tradingPair: string) => void;
  placeSpotTrade: (trade: Omit<SpotTrade, 'id' | 'status' | 'userId' | 'orderType' | 'tradingPair' | 'createdAt'>, tradingPair: string) => void;
  updateBalance: (username: string, asset: string, amount: number) => void;
  isLoading: boolean;
}

const BalanceContext = createContext<BalanceContextType | undefined>(undefined);

export function BalanceProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [balances, setBalances] = useState(user?.isTestUser ? INITIAL_BALANCES_TEST_USER : INITIAL_BALANCES_REAL_USER);
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const isTestUser = user?.isTestUser ?? false;
  
  const loadUserBalances = useCallback((username: string, isTest: boolean) => {
    try {
        const storedBalances = localStorage.getItem(`userBalances_${username}`);
        if (storedBalances) {
            return JSON.parse(storedBalances);
        }
    } catch (e) { console.error(e); }
    return isTest ? INITIAL_BALANCES_TEST_USER : INITIAL_BALANCES_REAL_USER;
  }, []);


  useEffect(() => {
    // This effect runs when auth state changes (login/logout)
    setIsLoading(true);
    if (user) {
        try {
            const userBalances = loadUserBalances(user.username, isTestUser);
            setBalances(userBalances);

            const storedInvestments = localStorage.getItem(`userInvestments_${user.username}`);
            if (storedInvestments) {
                setInvestments(JSON.parse(storedInvestments));
            } else {
                setInvestments([]);
            }

        } catch (error) {
            console.error("Could not access localStorage or parse balances.", error);
            setBalances(isTestUser ? INITIAL_BALANCES_TEST_USER : INITIAL_BALANCES_REAL_USER);
            setInvestments([]);
        } finally {
            setIsLoading(false);
        }
    } else {
      // Not authenticated, clear balances
      setBalances(INITIAL_BALANCES_REAL_USER);
      setInvestments([]);
      setIsLoading(false);
    }
  }, [user, isTestUser, loadUserBalances]);

  useEffect(() => {
    // This effect persists the current user's balance changes to localStorage
    if (!isLoading && user) {
      try {
        localStorage.setItem(`userBalances_${user.username}`, JSON.stringify(balances));
        localStorage.setItem(`userInvestments_${user.username}`, JSON.stringify(investments));
      } catch (error) {
         console.error("Could not access localStorage to save balances.", error);
      }
    }
  }, [balances, investments, isLoading, user]);
  
  const updateBalance = (username: string, asset: string, amount: number) => {
    try {
        const userIsTest = (JSON.parse(localStorage.getItem('users') || '[]')).find((u:any) => u.username === username)?.isTestUser || false;
        const userBalances = loadUserBalances(username, userIsTest);
        
        if (!userBalances[asset]) {
            userBalances[asset] = { available: 0, frozen: 0 };
        }
        userBalances[asset].available += amount;

        localStorage.setItem(`userBalances_${username}`, JSON.stringify(userBalances));

        // If the updated user is the currently logged-in user, update the state as well
        if (user && user.username === username) {
            setBalances(userBalances);
        }

    } catch (error) {
        console.error(`Failed to update balance for ${username}:`, error);
    }
  };


  const addInvestment = (productName: string, amount: number) => {
    if (balances.USDT.available < amount) {
        return false;
    }
    setBalances(prev => ({
        ...prev,
        USDT: { ...prev.USDT, available: prev.USDT.available - amount }
    }));
    const newInvestment: Investment = {
        id: new Date().toISOString(),
        productName,
        amount,
        date: new Date().toLocaleDateString()
    }
    setInvestments(prev => [...prev, newInvestment]);
    return true;
  }

  const placeContractTrade = useCallback((trade: Omit<ContractTrade, 'id' | 'price' | 'status' | 'userId' | 'orderType' | 'tradingPair' | 'createdAt'>, tradingPair: string) => {
    if (!user) return;
    
    setBalances(prevBalances => {
        const newBalances = { ...prevBalances };
        newBalances.USDT = {
            ...newBalances.USDT,
            available: newBalances.USDT.available - trade.amount,
        };
        return newBalances;
    });

    const fullTrade = {
        ...trade,
        id: `contract_${Date.now()}`,
        userId: user.username,
        tradingPair,
        orderType: 'contract' as const,
        status: 'filled' as const,
        createdAt: new Date().toISOString(),
    }

    try {
        const existingTrades = JSON.parse(localStorage.getItem('contractTrades') || '[]');
        existingTrades.push(fullTrade);
        localStorage.setItem('contractTrades', JSON.stringify(existingTrades));
    } catch (error) {
        console.error("Failed to save contract trade to localStorage", error);
    }
  }, [user]);
  
  const placeSpotTrade = useCallback((trade: Omit<SpotTrade, 'id' | 'status' | 'userId' | 'orderType' | 'tradingPair' | 'createdAt'>, tradingPair: string) => {
     if (!user) return;
    
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
    
    const fullTrade = {
        ...trade,
        id: `spot_${Date.now()}`,
        userId: user.username,
        tradingPair,
        orderType: 'spot' as const,
        status: 'filled' as const,
        createdAt: new Date().toISOString(),
    }

    try {
        const existingTrades = JSON.parse(localStorage.getItem('spotTrades') || '[]');
        existingTrades.push(fullTrade);
        localStorage.setItem('spotTrades', JSON.stringify(existingTrades));
    } catch (error) {
        console.error("Failed to save spot trade to localStorage", error);
    }

  }, [user]);


  const value = { 
      balances, 
      assets: ALL_ASSETS, 
      placeContractTrade, 
      placeSpotTrade, 
      isLoading,
      investments,
      balance: balances.USDT?.available || 0, // for finance page
      addInvestment,
      updateBalance
    };

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
