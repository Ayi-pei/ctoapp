
"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { ContractTrade, SpotTrade, Transaction, availablePairs, Investment } from '@/types';
import { useAuth } from '@/context/auth-context';
import { useMarket } from '@/context/market-data-context';
import { useToast } from '@/hooks/use-toast';

export type { Investment };

const INITIAL_BALANCES_USER: { [key: string]: { available: number; frozen: number } } = {
    USDT: { available: 0, frozen: 0 },
    BTC: { available: 0, frozen: 0 },
    ETH: { available: 0, frozen: 0 },
    SOL: { available: 0, frozen: 0},
    XRP: { available: 0, frozen: 0},
    LTC: { available: 0, frozen: 0},
    BNB: { available: 0, frozen: 0},
    MATIC: { available: 0, frozen: 0},
    DOGE: { available: 0, frozen: 0},
    ADA: { available: 0, frozen: 0},
    SHIB: { available: 0, frozen: 0},
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
  isLoading: boolean;
  activeContractTrades: ContractTrade[];
  historicalTrades: (SpotTrade | ContractTrade)[];
  recalculateBalanceForUser: (userId: string) => Promise<any>;
  adjustBalance: (userId: string, asset: string, amount: number) => void;
  adjustFrozenBalance: (asset: string, amount: number, userId?: string) => void;
}

const BalanceContext = createContext<BalanceContextType | undefined>(undefined);

export function BalanceProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { data: marketData } = useMarket();
  const { toast } = useToast();
  const [balances, setBalances] = useState<{ [key: string]: { available: number; frozen: number } }>(INITIAL_BALANCES_USER);
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const [activeContractTrades, setActiveContractTrades] = useState<ContractTrade[]>([]);
  const [historicalTrades, setHistoricalTrades] = useState<(SpotTrade | ContractTrade)[]>([]);
  
  const recalculateBalanceForUser = useCallback(async (userId: string) => {
    // This is a mock. In a real app, this would fetch all transactions for the user
    // and recalculate the balance from scratch.
    console.log("Recalculating balance for (mock)", userId);
    // For now, we just return the current state as we don't have a transaction log to rebuild from.
    return balances;
  }, [balances]);

  // This should only be called by an admin or a trusted context (like RequestsContext)
  const adjustBalance = useCallback((userId: string, asset: string, amount: number) => {
      // In a real app, you'd find the user's balance state and adjust it.
      // Since this is a single-user-view app, we adjust the current user's balance
      // if the ID matches. This is a simplification for the mock environment.
      if (user?.id === userId) {
          setBalances(prev => {
              const newBalances = { ...prev };
              newBalances[asset] = {
                  ...newBalances[asset],
                  available: (newBalances[asset]?.available || 0) + amount,
              };
              return newBalances;
          });
      }
  }, [user]);
  
  const adjustFrozenBalance = useCallback((asset: string, amount: number, userId?: string) => {
      // If userId is provided, check if it's the current user. If not, this is for the current user.
      if (userId && user?.id !== userId) {
          // This adjustment is for another user, so we do nothing in this client's state.
          // In a real app with a central DB, this would just work.
          return;
      }
      setBalances(prev => {
        const newBalances = { ...prev };
        newBalances[asset] = {
            available: (newBalances[asset]?.available || 0) - amount,
            frozen: (newBalances[asset]?.frozen || 0) + amount,
        };
        return newBalances;
      })

  }, [user]);

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
  
  const value = { 
      balances, 
      assets: ALL_ASSETS, 
      placeContractTrade, 
      placeSpotTrade, 
      isLoading,
      investments,
      addInvestment,
      recalculateBalanceForUser,
      activeContractTrades,
      historicalTrades,
      adjustBalance,
      adjustFrozenBalance,
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
