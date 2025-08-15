
"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { ContractTrade, SpotTrade, Transaction, availablePairs, Investment } from '@/types';
import { useAuth } from '@/context/auth-context';
import { useMarket } from '@/context/market-data-context';
import { useToast } from '@/hooks/use-toast';

export type { Investment };

const INITIAL_BALANCES_TEST_USER: { [key: string]: { available: number; frozen: number } } = {
    USDT: { available: 10000, frozen: 0 },
    BTC: { available: 0.1, frozen: 0 },
    ETH: { available: 2, frozen: 0 },
    SOL: { available: 10, frozen: 0},
    XRP: { available: 1000, frozen: 0},
    LTC: { available: 10, frozen: 0},
    BNB: { available: 5, frozen: 0},
    MATIC: { available: 1000, frozen: 0},
    DOGE: { available: 10000, frozen: 0},
    ADA: { available: 1000, frozen: 0},
    SHIB: { available: 1000000, frozen: 0},
    'XAU/USD': { available: 0, frozen: 0},
    'EUR/USD': { available: 0, frozen: 0},
    'GBP/USD': { available: 0, frozen: 0},
};

const ALL_ASSETS = [...new Set(availablePairs.flatMap(p => p.split('/')))];

type ContractTradeParams = {
  type: 'buy' | 'sell';
  amount: number;
  period: number;
  profitRate: number;
}


interface BalanceContextType {
  balances: { [key: string]: { available: number; frozen: number } };
  investments: Investment[];
  addInvestment: (productName: string, amount: number) => Promise<boolean>;
  assets: string[];
  placeContractTrade: (trade: ContractTradeParams, tradingPair: string) => void;
  placeSpotTrade: (trade: Pick<SpotTrade, 'type' | 'amount' | 'total' | 'trading_pair'>) => void;
  requestWithdrawal: (asset: string, amount: number, address: string) => Promise<boolean>;
  isLoading: boolean;
  activeContractTrades: ContractTrade[];
  historicalTrades: (SpotTrade | ContractTrade)[];
  recalculateBalanceForUser: (userId: string) => Promise<any>;
}

const BalanceContext = createContext<BalanceContextType | undefined>(undefined);

export function BalanceProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { data: marketData } = useMarket();
  const { toast } = useToast();
  const [balances, setBalances] = useState<{ [key: string]: { available: number; frozen: number } }>(INITIAL_BALANCES_TEST_USER);
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const [activeContractTrades, setActiveContractTrades] = useState<ContractTrade[]>([]);
  const [historicalTrades, setHistoricalTrades] = useState<(SpotTrade | ContractTrade)[]>([]);
  
  const recalculateBalanceForUser = useCallback(async (userId: string) => {
    console.log("Recalculating balance for (mock)", userId);
    // In a real scenario, this would fetch and calculate. Now it does nothing.
    return balances;
  }, [balances]);

  useEffect(() => {
    // Since we are using mock data, we don't need to reload anything when the user changes.
  }, [user]);

  const addInvestment = async (productName: string, amount: number) => {
    if (!user) return false;
    
    if (balances.USDT.available < amount) {
      toast({ variant: 'destructive', title: 'Investment Failed', description: 'Insufficient balance.' });
      return false;
    }
    
    setBalances(prev => ({
      ...prev,
      USDT: { ...prev.USDT, available: prev.USDT.available - amount }
    }));

    const newInvestment: Investment = {
        id: `inv-${Date.now()}`,
        user_id: user.id,
        product_name: productName,
        amount,
        created_at: new Date().toISOString(),
        productName: productName,
        date: new Date().toLocaleDateString(),
    }
    setInvestments(prev => [...prev, newInvestment]);
    toast({ title: 'Investment Successful' });
    return true;
  }
  
  const placeContractTrade = async (trade: ContractTradeParams, tradingPair: string) => {
    if (!user || !marketData) return;

    if (user.is_frozen) {
        toast({ variant: 'destructive', title: 'Action Failed', description: 'Your account is frozen.'});
        return;
    }
    
    const newTrade: ContractTrade = {
      id: `ct-${Date.now()}`,
      user_id: user.id,
      trading_pair: tradingPair,
      type: trade.type,
      amount: trade.amount,
      entry_price: marketData.summary.price,
      settlement_time: new Date(Date.now() + (trade.period * 1000)).toISOString(),
      period: trade.period,
      profit_rate: trade.profitRate,
      status: 'active',
      created_at: new Date().toISOString(),
      orderType: 'contract',
    }

    setActiveContractTrades(prev => [...prev, newTrade]);
    setBalances(prev => ({
      ...prev,
      USDT: { 
        available: prev.USDT.available - trade.amount,
        frozen: prev.USDT.frozen + trade.amount
      }
    }));
  };
  
  const placeSpotTrade = async (trade: Pick<SpotTrade, 'type' | 'amount' | 'total' | 'trading_pair'>) => {
     if (!user || !marketData) return;
    
     if (user.is_frozen) {
        toast({ variant: 'destructive', title: 'Action Failed', description: 'Your account is frozen.'});
        return;
    }

    const [baseAsset, quoteAsset] = trade.trading_pair.split('/');
    const fullTrade: SpotTrade = {
        id: `st-${Date.now()}`,
        type: trade.type,
        amount: trade.amount,
        total: trade.total,
        user_id: user.id,
        trading_pair: trade.trading_pair,
        base_asset: baseAsset,
        quote_asset: quoteAsset,
        status: 'filled',
        created_at: new Date().toISOString(),
        orderType: 'spot'
    }

    setHistoricalTrades(prev => [fullTrade, ...prev]);
    
    setBalances(prev => {
      const newBalances = {...prev};
      if (trade.type === 'buy') {
        newBalances[quoteAsset].available -= trade.total;
        newBalances[baseAsset].available += trade.amount;
      } else {
        newBalances[baseAsset].available -= trade.amount;
        newBalances[quoteAsset].available += trade.total;
      }
      return newBalances;
    })
  };
  
  const requestWithdrawal = async (asset: string, amount: number, address: string) => {
      if (!user) return false;
      if (user.is_frozen) {
        toast({ variant: 'destructive', title: 'Action Failed', description: 'Your account is frozen.'});
        return false;
      }
      const balance = balances[asset];
      if (!balance || amount > balance.available) {
          toast({ variant: 'destructive', title: 'Withdrawal Failed', description: 'Insufficient balance.' });
          return false;
      }

      toast({ title: 'Withdrawal Requested', description: 'Your request has been submitted for review.' });
      setBalances(prev => ({
        ...prev,
        [asset]: {
          available: prev[asset].available - amount,
          frozen: prev[asset].frozen + amount,
        }
      }))
      return true;
  };

  const value = { 
      balances, 
      assets: ALL_ASSETS, 
      placeContractTrade, 
      placeSpotTrade, 
      isLoading,
      investments,
      addInvestment,
      requestWithdrawal,
      recalculateBalanceForUser,
      activeContractTrades,
      historicalTrades,
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
