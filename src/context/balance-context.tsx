
"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { ContractTrade, SpotTrade, CommissionLog, Transaction, Investment } from '@/types';
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
  updateBalance: (username: string, asset: string, amount: number, type?: 'available' | 'frozen') => void;
  freezeBalance: (asset: string, amount: number) => void;
  recalculateBalanceForUser: (username: string) => void;
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
        
        const users = JSON.parse(localStorage.getItem('users') || '[]') as User[];
        const currentUser = users.find((u: any) => u.username === username);
        return currentUser?.isTestUser ? INITIAL_BALANCES_TEST_USER : INITIAL_BALANCES_REAL_USER;

    } catch (e) { 
        console.error(e);
        const users = JSON.parse(localStorage.getItem('users') || '[]') as User[];
        const currentUser = users.find((u) => u.username === username);
        return currentUser?.isTestUser ? INITIAL_BALANCES_TEST_USER : INITIAL_BALANCES_REAL_USER;
    }
  }, []);

  const recalculateBalanceForUser = useCallback((username: string) => {
    try {
        const allUsers: User[] = JSON.parse(localStorage.getItem('users') || '[]');
        const targetUser = allUsers.find(u => u.username === username);
        if (!targetUser) return;

        let calculatedBalances = targetUser.isTestUser ? 
            JSON.parse(JSON.stringify(INITIAL_BALANCES_TEST_USER)) : 
            JSON.parse(JSON.stringify(INITIAL_BALANCES_REAL_USER));

        // 1. Financial Transactions (Deposits/Withdrawals)
        const allFinancialTxs: Transaction[] = JSON.parse(localStorage.getItem('transactions') || '[]') as Transaction[];
        const userFinancialTxs = allFinancialTxs.filter(tx => tx.userId === username);
        userFinancialTxs.forEach(tx => {
            if (!calculatedBalances[tx.asset]) calculatedBalances[tx.asset] = { available: 0, frozen: 0 };
            
            if (tx.type === 'deposit' && tx.status === 'approved') {
                calculatedBalances[tx.asset].available += tx.amount;
            }
            // For withdrawals, the amount is deducted/frozen upon request, not approval.
            // If rejected, it should be returned, but that's handled by the request handler.
            // Here, we just ensure approved ones are permanently deducted from `available`
            // and pending ones are moved from `available` to `frozen`.
             if (tx.type === 'withdrawal') {
                 if (tx.status === 'approved') {
                     calculatedBalances[tx.asset].frozen -= tx.amount; // Unfreeze and it's gone
                 } else if (tx.status === 'rejected') {
                     calculatedBalances[tx.asset].available += tx.amount;
                     calculatedBalances[tx.asset].frozen -= tx.amount;
                 }
            }
        });

        // 2. Spot Trades
        const allSpotTrades: SpotTrade[] = JSON.parse(localStorage.getItem('spotTrades') || '[]');
        const userSpotTrades = allSpotTrades.filter(t => t.userId === username && t.status === 'filled');
        userSpotTrades.forEach(trade => {
            if (!calculatedBalances[trade.baseAsset]) calculatedBalances[trade.baseAsset] = { available: 0, frozen: 0 };
            if (!calculatedBalances[trade.quoteAsset]) calculatedBalances[trade.quoteAsset] = { available: 0, frozen: 0 };

            if (trade.type === 'buy') {
                calculatedBalances[trade.quoteAsset].available -= trade.total;
                calculatedBalances[trade.baseAsset].available += trade.amount;
            } else { // sell
                calculatedBalances[trade.baseAsset].available -= trade.amount;
                calculatedBalances[trade.quoteAsset].available += trade.total;
            }
        });

        // 3. Contract Trades
        const allContractTrades: ContractTrade[] = JSON.parse(localStorage.getItem('contractTrades') || '[]');
        const userContractTrades = allContractTrades.filter(t => t.userId === username);
        userContractTrades.forEach(trade => {
             if (!calculatedBalances['USDT']) calculatedBalances['USDT'] = { available: 0, frozen: 0 };
             
             // The trade amount is deducted from available upon placing the trade.
             calculatedBalances['USDT'].available -= trade.amount;
             
             if (trade.status === 'settled' && trade.profit !== undefined) {
                 // Return the original amount + profit/loss
                 calculatedBalances['USDT'].available += (trade.amount + trade.profit);
             }
        });

        // 4. Investments
        const userInvestments: Investment[] = JSON.parse(localStorage.getItem(`userInvestments_${username}`) || '[]');
        userInvestments.forEach(investment => {
             if (!calculatedBalances['USDT']) calculatedBalances['USDT'] = { available: 0, frozen: 0 };
             // Investment amount is deducted.
             calculatedBalances['USDT'].available -= investment.amount;
        });

        // 5. Commissions
        const allCommissions: CommissionLog[] = JSON.parse(localStorage.getItem('commissionLogs') || '[]');
        const userCommissions = allCommissions.filter(c => c.uplineUsername === username);
        userCommissions.forEach(log => {
             if (!calculatedBalances['USDT']) calculatedBalances['USDT'] = { available: 0, frozen: 0 };
             calculatedBalances['USDT'].available += log.commissionAmount;
        })
        
        // Save the recalculated balances
        localStorage.setItem(`userBalances_${username}`, JSON.stringify(calculatedBalances));

        // If the recalculated user is the one logged in, update the state
        if (user && user.username === username) {
            setBalances(calculatedBalances);
        }

    } catch (error) {
        console.error(`Error recalculating balance for ${username}:`, error);
    }
  }, [user]);


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
            const allTrades: ContractTrade[] = JSON.parse(localStorage.getItem('contractTrades') || '[]') as [];
            const userActiveTrades = allTrades.filter(t => t.userId === user.username && t.status === 'active');
            
            if (userActiveTrades.length === 0) return;

            let balanceUpdated = false;
            const now = Date.now();

            userActiveTrades.forEach(trade => {
                if (now >= trade.settlementTime) {
                    // Settle this trade
                    const settlementPrice = trade.entryPrice * (1 + (Math.random() - 0.5) * 0.001); // Tiny random fluctuation
                    let outcome: 'win' | 'loss';

                    if (trade.type === 'buy') {
                        outcome = settlementPrice > trade.entryPrice ? 'win' : 'loss';
                    } else {
                        outcome = settlementPrice < trade.entryPrice ? 'win' : 'loss';
                    }

                    const profit = outcome === 'win' ? trade.amount * trade.profitRate : -trade.amount;

                    const tradeIndex = allTrades.findIndex(t => t.id === trade.id);
                    if (tradeIndex !== -1) {
                        allTrades[tradeIndex] = {
                            ...allTrades[tradeIndex],
                            status: 'settled',
                            settlementPrice: settlementPrice,
                            outcome: outcome,
                            profit: profit
                        };
                        
                        // Update balance: Return original amount + profit/loss
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

  
  const updateBalance = (username: string, asset: string, amount: number, type: 'available' | 'frozen' = 'available') => {
    try {
        const userBalances = loadUserBalances(username);
        
        if (!userBalances[asset]) {
            userBalances[asset] = { available: 0, frozen: 0 };
        }
        userBalances[asset][type] += amount;

        localStorage.setItem(`userBalances_${username}`, JSON.stringify(userBalances));

        if (user && user.username === username) {
            setBalances(userBalances);
        }

    } catch (error) {
        console.error(`Failed to update balance for ${username}:`, error);
    }
  };

  const freezeBalance = (asset: string, amount: number) => {
    if (!user) return;
    setBalances(prev => {
        if (!prev[asset]) return prev;
        const newAvailable = prev[asset].available - amount;
        const newFrozen = prev[asset].frozen + amount;
        return {
            ...prev,
            [asset]: { available: newAvailable, frozen: newFrozen }
        }
    });
  }


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
            const allUsers: User[] = JSON.parse(localStorage.getItem('users') || '[]') as User[];
            const allCommissions: CommissionLog[] = JSON.parse(localStorage.getItem('commissionLogs') || '[]');

            let currentUplineUsername = sourceUser.inviter;
            
            for (let level = 1; level <= 3; level++) {
                if (!currentUplineUsername) break;

                const commissionRate = COMMISSION_RATES[level as keyof CommissionRates];
                const commissionAmount = tradeAmount * commissionRate;

                updateBalance(currentUplineUsername, 'USDT', commissionAmount, 'available');
                
                const newLog: CommissionLog = {
                    id: `comm_${Date.now()}_${level}`,
                    uplineUsername: currentUplineUsername,
                    sourceUsername: sourceUser.username,
                    sourceLevel: level,
                    tradeAmount,
                    commissionRate,
                    commissionAmount,
                    createdAt: new Date().toISOString(),
                };
                allCommissions.push(newLog);
                
                const currentUplineUser = allUsers.find(u => u.username === currentUplineUsername);
                currentUplineUsername = currentUplineUser ? currentUplineUser.inviter : null;
            }
            
            localStorage.setItem('commissionLogs', JSON.stringify(allCommissions));

        } catch (error) {
            console.error("Failed to distribute commissions:", error);
        }
    };


  const placeContractTrade = useCallback((trade: ContractTradeParams, tradingPair: string) => {
    if (!user || !marketData) return;
    
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
        const existingTrades = JSON.parse(localStorage.getItem('contractTrades') || '[]') as [];
        existingTrades.push(fullTrade);
        localStorage.setItem('contractTrades', JSON.stringify(existingTrades));
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
            newBalances[quoteAsset].available -= trade.total;
            newBalances[baseAsset].available += trade.amount;
        } else { // sell
            newBalances[baseAsset].available -= trade.amount;
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
        const existingTrades = JSON.parse(localStorage.getItem('spotTrades') || '[]') as [];
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
      updateBalance,
      freezeBalance,
      recalculateBalanceForUser
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
