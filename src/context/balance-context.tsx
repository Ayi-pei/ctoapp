

"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { ContractTrade, SpotTrade, Transaction, availablePairs, Investment, CommissionLog, User } from '@/types';
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
    XAU: { available: 0, frozen: 0},
    USD: { available: 0, frozen: 0},
    EUR: { available: 0, frozen: 0},
    GBP: { available: 0, frozen: 0},
};


const ALL_ASSETS = [...new Set(availablePairs.flatMap(p => p.split('/')))];
const COMMISSION_RATES = [0.08, 0.05, 0.02]; // Level 1, 2, 3

type ContractTradeParams = {
  type: 'buy' | 'sell';
  amount: number;
  period: number;
  profitRate: number;
}


interface BalanceContextType {
  balances: { [key: string]: { available: number; frozen: number } };
  investments: Investment[];
  commissionLogs: CommissionLog[];
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
  const { user, getUserById } = useAuth();
  const { data: marketData } = useMarket();
  const { toast } = useToast();
  const [balances, setBalances] = useState<{ [key: string]: { available: number; frozen: number } }>(INITIAL_BALANCES_USER);
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [commissionLogs, setCommissionLogs] = useState<CommissionLog[]>([]);

  const [activeContractTrades, setActiveContractTrades] = useState<ContractTrade[]>([]);
  const [historicalTrades, setHistoricalTrades] = useState<(SpotTrade | ContractTrade)[]>([]);
  
  const recalculateBalanceForUser = useCallback(async (userId: string) => {
    // This is a mock. In a real app, this would fetch all transactions for the user
    // and recalculate the balance from scratch.
    console.log("Recalculating balance for (mock)", userId);
    // For now, we just return the current state as we don't have a transaction log to rebuild from.
    const userStorageKey = `tradeflow_user_${userId}`;
    const storedData = localStorage.getItem(userStorageKey);
    if (storedData) {
        const data = JSON.parse(storedData);
        return data.balances || INITIAL_BALANCES_USER;
    }
    return INITIAL_BALANCES_USER;
  }, []);

  const adjustBalance = useCallback((userId: string, asset: string, amount: number) => {
      // This is a generic utility now, so it needs to fetch, update, and save.
      const userStorageKey = `tradeflow_user_${userId}`;
      const storedData = localStorage.getItem(userStorageKey);
      const userData = storedData ? JSON.parse(storedData) : { balances: INITIAL_BALANCES_USER, investments: [], activeContractTrades: [], historicalTrades: [] };
      
      const userBalances = userData.balances;
      userBalances[asset] = {
          ...userBalances[asset],
          available: (userBalances[asset]?.available || 0) + amount,
      };

      userData.balances = userBalances;
      localStorage.setItem(userStorageKey, JSON.stringify(userData));

      // If the adjusted user is the current user, update state too.
      if (user?.id === userId) {
          setBalances(userBalances);
      }
  }, [user?.id]);
  
  const adjustFrozenBalance = useCallback((asset: string, amount: number, userId?: string) => {
      if (userId && user?.id !== userId) return; // Should not happen if called correctly
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
            setCommissionLogs(data.commissionLogs || []);
        } else {
            // New user, set initial state
            setBalances(INITIAL_BALANCES_USER);
            setInvestments([]);
            setActiveContractTrades([]);
            setHistoricalTrades([]);
            setCommissionLogs([]);
        }
    } else {
        // Logged out, clear all data
        setBalances(INITIAL_BALANCES_USER);
        setInvestments([]);
        setActiveContractTrades([]);
        setHistoricalTrades([]);
        setCommissionLogs([]);
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
              commissionLogs,
          };
          localStorage.setItem(userStorageKey, JSON.stringify(dataToStore));
      }
  }, [user, isLoading, balances, investments, activeContractTrades, historicalTrades, commissionLogs]);


  const distributeCommissions = useCallback((sourceUser: User, tradeAmount: number) => {
    if (!sourceUser.inviter_id) return;

    let currentUplineId: string | null = sourceUser.inviter_id;
    
    for (let level = 1; level <= 3; level++) {
        if (!currentUplineId) break;

        const uplineUser = getUserById(currentUplineId);
        if (!uplineUser || uplineUser.is_frozen) {
            // Stop distributing if upline doesn't exist or is frozen
            break;
        }
        
        const commissionRate = COMMISSION_RATES[level - 1];
        const commissionAmount = tradeAmount * commissionRate;

        // Give commission to the upline user
        adjustBalance(uplineUser.id, 'USDT', commissionAmount);
        
        // Log the commission for the upline user
        const commissionLog: CommissionLog = {
            id: `clog-${Date.now()}-${level}`,
            upline_user_id: uplineUser.id,
            source_user_id: sourceUser.id,
            source_username: sourceUser.username,
            source_level: level,
            trade_amount: tradeAmount,
            commission_rate: commissionRate,
            commission_amount: commissionAmount,
            created_at: new Date().toISOString(),
        };

        // We need to fetch the upline user's data, add the log, and save it back
        const uplineStorageKey = `tradeflow_user_${uplineUser.id}`;
        const storedUplineData = localStorage.getItem(uplineStorageKey);
        const uplineData = storedUplineData ? JSON.parse(storedUplineData) : { commissionLogs: [] };
        const updatedLogs = [...(uplineData.commissionLogs || []), commissionLog];
        uplineData.commissionLogs = updatedLogs;
        localStorage.setItem(uplineStorageKey, JSON.stringify(uplineData));

        // If the current user is this upline, update their state too
        if (user?.id === uplineUser.id) {
            setCommissionLogs(updatedLogs);
        }

        currentUplineId = uplineUser.inviter_id; // Move to the next level up
    }
  }, [getUserById, adjustBalance, user?.id]);


  const settleContractTrade = useCallback((tradeId: string) => {
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

    const quoteAsset = trade.trading_pair.split('/')[1];

    // Update balances
    setBalances(prev => {
        const newBalances = { ...prev };
        const newFrozen = newBalances[quoteAsset].frozen - trade.amount;
        // If win, add back principal + profit. If loss, principal is lost, so only adjust frozen.
        const newAvailable = newBalances[quoteAsset].available + (outcome === 'win' ? trade.amount + profit : 0);
        newBalances[quoteAsset] = { available: newAvailable, frozen: newFrozen };
        return newBalances;
    });

    // Move trade from active to historical
    setActiveContractTrades(prev => prev.filter(t => t.id !== tradeId));
    setHistoricalTrades(prev => [settledTrade, ...prev]);

    toast({
        title: `合约结算: ${outcome === 'win' ? '盈利' : '亏损'}`,
        description: `${trade.trading_pair} 合约已结算，盈亏: ${profit.toFixed(2)} ${quoteAsset}`
    });
  }, [activeContractTrades, marketData, toast]);

  // Effect to handle contract trade settlement
  useEffect(() => {
    if (activeContractTrades.length === 0) return;

    const interval = setInterval(() => {
        const now = new Date();
        activeContractTrades.forEach(trade => {
            if (new Date(trade.settlement_time) <= now) {
                settleContractTrade(trade.id);
            }
        });
    }, 1000); // Check every second

    return () => clearInterval(interval);
  }, [activeContractTrades, settleContractTrade]);
  
  

  const addInvestment = async (productName: string, amount: number) => {
    if (!user) return false;
    
    if (balances.USDT.available < amount) {
      return false;
    }
    
    setBalances(prev => ({
      ...prev,
      USDT: { ...prev.USDT, available: prev.USDT.available - amount, frozen: prev.USDT.frozen }
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
    setInvestments(prev => [newInvestment, ...prev]);
    return true;
  }
  
  const placeContractTrade = async (trade: ContractTradeParams, tradingPair: string) => {
    if (!user || !marketData) return;

    if (user.is_frozen) {
        toast({ variant: 'destructive', title: 'Action Failed', description: 'Your account is frozen.'});
        return;
    }
    
    const quoteAsset = tradingPair.split('/')[1];

     if (balances[quoteAsset].available < trade.amount) {
        toast({ variant: 'destructive', title: '下单失败', description: `可用 ${quoteAsset} 余额不足。` });
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
      [quoteAsset]: { 
        available: prev[quoteAsset].available - trade.amount,
        frozen: prev[quoteAsset].frozen + trade.amount
      }
    }));

    // Distribute commissions only for USDT-based trades
    if(quoteAsset === 'USDT') {
      distributeCommissions(user, trade.amount);
    }
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
    });

     // Distribute commissions only for USDT-based trades
     if(quoteAsset === 'USDT') {
        distributeCommissions(user, trade.total);
     }
  };
  
  const value = { 
      balances, 
      assets: ALL_ASSETS, 
      placeContractTrade, 
      placeSpotTrade, 
      isLoading,
      investments,
      commissionLogs,
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
