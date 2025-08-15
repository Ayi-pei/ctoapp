

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
  confirmWithdrawal: (asset: string, amount: number, userId?: string) => void;
  revertWithdrawal: (asset: string, amount: number, userId?: string) => void;
}

const BalanceContext = createContext<BalanceContextType | undefined>(undefined);

export function BalanceProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { data: marketData } = useMarket();
  const { toast } = useToast();
  const [balances, setBalances] = useState<{ [key: string]: { available: number; frozen: number } }>(INITIAL_BALANCES_USER);
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [activeContractTrades, setActiveContractTrades] = useState<ContractTrade[]>([]);
  const [historicalTrades, setHistoricalTrades] = useState<(SpotTrade | ContractTrade)[]>([]);
  
  const recalculateBalanceForUser = useCallback(async (userId: string) => {
    // This is a mock. In a real app, this would fetch all transactions for the user
    // and recalculate the balance from scratch.
    console.log("Recalculating balance for (mock)", userId);
    // For now, we just return the current state as we don't have a transaction log to rebuild from.
    return balances;
  }, [balances]);

  const adjustBalance = useCallback((userId: string, asset: string, amount: number) => {
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
      if (userId && user?.id !== userId) return;
      setBalances(prev => {
        const newBalances = { ...prev };
        newBalances[asset] = {
            available: (newBalances[asset]?.available || 0) - amount,
            frozen: (newBalances[asset]?.frozen || 0) + amount,
        };
        return newBalances;
      })

  }, [user]);
  
  const confirmWithdrawal = useCallback((asset: string, amount: number, userId?: string) => {
      if (userId && user?.id !== userId) return;
      setBalances(prev => {
        const newBalances = { ...prev };
        newBalances[asset] = {
            ...newBalances[asset],
            frozen: (newBalances[asset]?.frozen || 0) - amount,
        };
        return newBalances;
      });
  }, [user]);

  const revertWithdrawal = useCallback((asset: string, amount: number, userId?: string) => {
      if (userId && user?.id !== userId) return;
      setBalances(prev => {
        const newBalances = { ...prev };
        newBalances[asset] = {
            available: (newBalances[asset]?.available || 0) + amount,
            frozen: (newBalances[asset]?.frozen || 0) - amount,
        };
        return newBalances;
      });
  }, [user]);

  // Load user data from localStorage on login
  useEffect(() => {
    setIsLoading(true);
    if (user) {
        const userStorageKey = `tradeflow_user_${user.id}`;
        const storedData = localStorage.getItem(userStorageKey);
        if (storedData) {
            const data = JSON.parse(storedData);
            setBalances(data.balances || INITIAL_BALANCES_USER);
            setInvestments(data.investments || []);
            setActiveContractTrades(data.activeContractTrades || []);
            setHistoricalTrades(data.historicalTrades || []);
        } else {
            // New user, set initial state
            setBalances(INITIAL_BALANCES_USER);
            setInvestments([]);
            setActiveContractTrades([]);
            setHistoricalTrades([]);
        }
    } else {
        // Logged out, clear all data
        setBalances(INITIAL_BALANCES_USER);
        setInvestments([]);
        setActiveContractTrades([]);
        setHistoricalTrades([]);
    }
    setIsLoading(false);
  }, [user]);

  // Save user data to localStorage whenever it changes
  useEffect(() => {
      if (user && !isLoading) {
          const userStorageKey = `tradeflow_user_${user.id}`;
          const dataToStore = {
              balances,
              investments,
              activeContractTrades,
              historicalTrades,
          };
          localStorage.setItem(userStorageKey, JSON.stringify(dataToStore));
      }
  }, [user, isLoading, balances, investments, activeContractTrades, historicalTrades]);

  // Effect to handle contract trade settlement
  useEffect(() => {
    if (activeContractTrades.length === 0) return;

    const interval = setInterval(() => {
        const now = new Date();
        const tradesToSettle = activeContractTrades.filter(
            trade => new Date(trade.settlement_time) <= now
        );

        if (tradesToSettle.length > 0) {
            tradesToSettle.forEach(trade => settleContractTrade(trade.id));
        }
    }, 1000); // Check every second

    return () => clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeContractTrades]);
  
  const settleContractTrade = (tradeId: string) => {
    const trade = activeContractTrades.find(t => t.id === tradeId);
    if (!trade || !marketData) return;

    const settlementPrice = marketData.summary.price;
    let outcome: 'win' | 'loss';
    
    if (trade.type === 'buy') { // Predicted price would go up
        outcome = settlementPrice > trade.entry_price ? 'win' : 'loss';
    } else { // Predicted price would go down
        outcome = settlementPrice < trade.entry_price ? 'win' : 'loss';
    }
    
    const profit = outcome === 'win' ? trade.amount * trade.profit_rate : -trade.amount;
    
    const settledTrade: ContractTrade = {
        ...trade,
        status: 'settled',
        settlement_price: settlementPrice,
        outcome: outcome,
        profit: profit
    };

    // Update balances
    setBalances(prev => {
        const newBalances = { ...prev };
        const newAvailable = newBalances.USDT.available + (outcome === 'win' ? trade.amount + profit : 0);
        const newFrozen = newBalances.USDT.frozen - trade.amount;
        newBalances.USDT = { available: newAvailable, frozen: newFrozen };
        return newBalances;
    });

    // Move trade from active to historical
    setActiveContractTrades(prev => prev.filter(t => t.id !== tradeId));
    setHistoricalTrades(prev => [settledTrade, ...prev]);

    toast({
        title: `合约结算: ${outcome === 'win' ? '盈利' : '亏损'}`,
        description: `${trade.trading_pair} 合约已结算，盈亏: ${profit.toFixed(2)} USDT`
    });
  }


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

     if (balances.USDT.available < trade.amount) {
        toast({ variant: 'destructive', title: '下单失败', description: '可用余额不足。' });
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
      confirmWithdrawal,
      revertWithdrawal
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
