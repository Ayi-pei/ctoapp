
"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { ContractTrade, SpotTrade, CommissionLog } from '@/types';
import { CircleDollarSign } from 'lucide-react';
import { useAuth, User } from './auth-context';
import { useMarket } from './market-data-context';

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

type ContractTradeParams = {
  type: 'buy' | 'sell';
  amount: number;
  period: number;
  profitRate: number;
}


interface BalanceContextType {
  balances: { [key: string]: { available: number; frozen: number } };
  investments: Investment[];
  balance: number; // Keep this for now for finance page
  addInvestment: (productName: string, amount: number) => boolean;
  assets: { name: string, icon: React.ElementType }[];
  placeContractTrade: (trade: ContractTradeParams, tradingPair: string) => void;
  placeSpotTrade: (trade: Omit<SpotTrade, 'id' | 'status' | 'userId' | 'orderType' | 'tradingPair' | 'createdAt'>, tradingPair: string) => void;
  updateBalance: (username: string, asset: string, amount: number) => void;
  isLoading: boolean;
}

const BalanceContext = createContext<BalanceContextType | undefined>(undefined);

const COMMISSION_RATES = {
    1: 0.08, // Level 1: 8%
    2: 0.04, // Level 2: 4%
    3: 0.02, // Level 3: 2%
};

type CommissionRates = typeof COMMISSION_RATES;

export function BalanceProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { data: marketData } = useMarket(); // Get current market data
  const [balances, setBalances] = useState(INITIAL_BALANCES_REAL_USER);
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const isTestUser = user?.isTestUser ?? false;
  
  const loadUserBalances = useCallback((username: string) => {
    try {
        const storedBalances = localStorage.getItem(`userBalances_${username}`);
        if (storedBalances) {
            return JSON.parse(storedBalances);
        }
        
        const users = JSON.parse(localStorage.getItem('users') || '[]');
        const currentUser = users.find((u: any) => u.username === username);
        return currentUser?.isTestUser ? INITIAL_BALANCES_TEST_USER : INITIAL_BALANCES_REAL_USER;

    } catch (e) { 
        console.error(e);
        // Fallback based on user type if parsing fails
        const users = JSON.parse(localStorage.getItem('users') || '[]');
        const currentUser = users.find((u: any) => u.username === username);
        return currentUser?.isTestUser ? INITIAL_BALANCES_TEST_USER : INITIAL_BALANCES_REAL_USER;
    }
  }, []);


  useEffect(() => {
    // This effect runs when auth state changes (login/logout)
    setIsLoading(true);
    if (user) {
        try {
            const userBalances = loadUserBalances(user.username);
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

  useEffect(() => {
    // Contract settlement simulation
    if (!user) return;

    const interval = setInterval(() => {
        try {
            const allTrades: ContractTrade[] = JSON.parse(localStorage.getItem('contractTrades') || '[]');
            const userActiveTrades = allTrades.filter(t => t.userId === user.username && t.status === 'active');
            
            if (userActiveTrades.length === 0) return;

            let balanceUpdated = false;
            const now = Date.now();

            userActiveTrades.forEach(trade => {
                if (now >= trade.settlementTime) {
                    // Settle this trade
                    // Simulate final price - in a real app this would come from an API
                    const settlementPrice = trade.entryPrice * (1 + (Math.random() - 0.5) * 0.001); // Tiny random fluctuation
                    let outcome: 'win' | 'loss';

                    if (trade.type === 'buy') { // Predicted price would go up
                        outcome = settlementPrice > trade.entryPrice ? 'win' : 'loss';
                    } else { // Predicted price would go down
                        outcome = settlementPrice < trade.entryPrice ? 'win' : 'loss';
                    }

                    const profit = outcome === 'win' ? trade.amount * trade.profitRate : -trade.amount;

                    // Find the trade in the main array to update it
                    const tradeIndex = allTrades.findIndex(t => t.id === trade.id);
                    if (tradeIndex !== -1) {
                        allTrades[tradeIndex] = {
                            ...allTrades[tradeIndex],
                            status: 'settled',
                            settlementPrice: settlementPrice,
                            outcome: outcome,
                            profit: profit
                        };
                        
                        // Update balance
                        setBalances(prev => {
                            const newBalance = prev.USDT.available + trade.amount + profit;
                            return {
                                ...prev,
                                USDT: { ...prev.USDT, available: newBalance }
                            }
                        });
                        balanceUpdated = true;
                    }
                }
            });

            if (balanceUpdated) {
                localStorage.setItem('contractTrades', JSON.stringify(allTrades));
            }

        } catch (error) {
            console.error("Error during settlement simulation:", error);
        }

    }, 2000); // Check for settlements every 2 seconds

    return () => clearInterval(interval);

  }, [user]);

  
  const updateBalance = (username: string, asset: string, amount: number) => {
    try {
        const userBalances = loadUserBalances(username);
        
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
  
    const handleCommissionDistribution = (sourceUser: User, tradeAmount: number) => {
        try {
            const allUsers: User[] = JSON.parse(localStorage.getItem('users') || '[]');
            const allBalances = allUsers.reduce((acc, u) => {
                acc[u.username] = loadUserBalances(u.username);
                return acc;
            }, {} as { [key:string]: any });
            const allCommissions: CommissionLog[] = JSON.parse(localStorage.getItem('commissionLogs') || '[]');

            let currentUpline = allUsers.find(u => u.username === sourceUser.inviter);
            
            for (let level = 1; level <= 3; level++) {
                if (!currentUpline) break;

                const commissionRate = COMMISSION_RATES[level as keyof CommissionRates];
                const commissionAmount = tradeAmount * commissionRate;

                // Update upline's balance
                if (!allBalances[currentUpline.username!]) {
                     allBalances[currentUpline.username!] = { USDT: { available: 0, frozen: 0 } };
                }
                if (!allBalances[currentUpline.username!].USDT) {
                     allBalances[currentUpline.username!].USDT = { available: 0, frozen: 0 };
                }
                allBalances[currentUpline.username!].USDT.available += commissionAmount;
                
                // Create commission log
                const newLog: CommissionLog = {
                    id: `comm_${Date.now()}_${level}`,
                    uplineUsername: currentUpline.username,
                    sourceUsername: sourceUser.username,
                    sourceLevel: level,
                    tradeAmount,
                    commissionRate,
                    commissionAmount,
                    createdAt: new Date().toISOString(),
                };
                allCommissions.push(newLog);

                // If this upline is the currently logged in user, update their state
                if (user && user.username === currentUpline.username) {
                    setBalances(prev => ({
                        ...prev,
                        USDT: { ...prev.USDT, available: prev.USDT.available + commissionAmount }
                    }));
                }
                
                // Move to the next level upline
                currentUpline = allUsers.find(u => u.username === currentUpline!.inviter);
            }
            
            // Persist all updated balances and new commissions
            Object.keys(allBalances).forEach(username => {
                 localStorage.setItem(`userBalances_${username}`, JSON.stringify(allBalances[username]));
            });
            localStorage.setItem('commissionLogs', JSON.stringify(allCommissions));

        } catch (error) {
            console.error("Failed to distribute commissions:", error);
        }
    };


  const placeContractTrade = useCallback((trade: ContractTradeParams, tradingPair: string) => {
    if (!user || !marketData) return;
    
    // Deduct amount from balance immediately
    setBalances(prevBalances => {
        const newBalances = { ...prevBalances };
        newBalances.USDT = {
            ...newBalances.USDT,
            available: newBalances.USDT.available - trade.amount,
        };
        return newBalances;
    });

    const now = Date.now();
    const fullTrade: ContractTrade = {
        ...trade,
        id: `contract_${now}`,
        userId: user.username,
        tradingPair,
        orderType: 'contract',
        status: 'active',
        entryPrice: marketData.summary.price,
        settlementTime: now + (trade.period * 1000),
        createdAt: new Date().toISOString(),
    }

    try {
        const existingTrades = JSON.parse(localStorage.getItem('contractTrades') || '[]');
        existingTrades.push(fullTrade);
        localStorage.setItem('contractTrades', JSON.stringify(existingTrades));
        // Handle commissions after placing the trade
        handleCommissionDistribution(user, trade.amount);
    } catch (error) {
        console.error("Failed to save contract trade to localStorage", error);
    }
  }, [user, marketData, handleCommissionDistribution]);
  
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
    
    const fullTrade: SpotTrade = {
        ...trade,
        id: `spot_${Date.now()}`,
        userId: user.username,
        tradingPair,
        orderType: 'spot',
        status: 'filled',
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
