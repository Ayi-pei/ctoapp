
"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { ContractTrade, SpotTrade, CommissionLog, Transaction, Investment, availablePairs } from '@/types';
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

const ALL_ASSETS = [...new Set(availablePairs.flatMap(p => p.split('/')))].map(asset => ({ name: asset, icon: CircleDollarSign }));


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
  requestWithdrawal: (asset: string, amount: number, address: string) => boolean;
  isLoading: boolean;
  activeContractTrades: ContractTrade[];
  historicalTrades: (SpotTrade | ContractTrade)[];
  recalculateBalanceForUser: (username: string) => void;
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

  // Trade history states
  const [activeContractTrades, setActiveContractTrades] = useState<ContractTrade[]>([]);
  const [historicalTrades, setHistoricalTrades] = useState<(SpotTrade | ContractTrade)[]>([]);

  const isTestUser = user?.isTestUser ?? false;
  
  const loadUserBalances = (username: string) => {
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
  };

  const loadUserTrades = (username: string) => {
        try {
            const allContractTrades: ContractTrade[] = JSON.parse(localStorage.getItem('contractTrades') || '[]') as ContractTrade[];
            const allSpotTrades: SpotTrade[] = JSON.parse(localStorage.getItem('spotTrades') || '[]') as SpotTrade[];
            
            const userContractTrades = allContractTrades.filter(t => t.userId === username);
            const userSpotTrades = allSpotTrades.filter(t => t.userId === username);

            setActiveContractTrades(userContractTrades.filter(t => t.status === 'active'));
            
            const settledContractTrades = userContractTrades.filter(t => t.status === 'settled');
            const combinedHistory = [...settledContractTrades, ...userSpotTrades]
                .sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

            setHistoricalTrades(combinedHistory);

        } catch (error) {
            console.error("Failed to fetch user trades:", error);
        }
    };


  const recalculateBalanceForUser = (username: string) => {
    try {
        const allUsers: User[] = JSON.parse(localStorage.getItem('users') || '[]') as [];
        const targetUser = allUsers.find(u => u.username === username);
        if (!targetUser) return;

        let calculatedBalances = targetUser.isTestUser ? 
            JSON.parse(JSON.stringify(INITIAL_BALANCES_TEST_USER)) : 
            JSON.parse(JSON.stringify(INITIAL_BALANCES_REAL_USER));

        // 1. Financial Transactions (Deposits/Withdrawals/Admin Adjustments)
        const allFinancialTxs: Transaction[] = JSON.parse(localStorage.getItem('transactions') || '[]') as [];
        const userFinancialTxs = allFinancialTxs.filter(tx => tx.userId === username);

        userFinancialTxs.forEach(tx => {
            if (!calculatedBalances[tx.asset]) calculatedBalances[tx.asset] = { available: 0, frozen: 0 };
            
            if (tx.type === 'deposit') {
                if (tx.status === 'approved') {
                    calculatedBalances[tx.asset].available += tx.amount;
                }
            } else if (tx.type === 'withdrawal') {
                 if (tx.status === 'pending') {
                    calculatedBalances[tx.asset].available -= tx.amount;
                    calculatedBalances[tx.asset].frozen += tx.amount;
                 } else if (tx.status === 'rejected') {
                    // Money was never taken, it was just frozen. Now it is unfrozen.
                    calculatedBalances[tx.asset].available += tx.amount;
                 } else if (tx.status === 'approved') {
                    // Money is gone from frozen.
                    calculatedBalances[tx.asset].frozen -= tx.amount;
                 }
            } else if (tx.type === 'adjustment') { // Admin adjustments
                calculatedBalances[tx.asset].available += tx.amount;
            }
        });


        // 2. Spot Trades
        const allSpotTrades: SpotTrade[] = JSON.parse(localStorage.getItem('spotTrades') || '[]') as [];
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
        const allContractTrades: ContractTrade[] = JSON.parse(localStorage.getItem('contractTrades') || '[]') as [];
        const userContractTrades = allContractTrades.filter(t => t.userId === username);
        userContractTrades.forEach(trade => {
             if (!calculatedBalances['USDT']) calculatedBalances['USDT'] = { available: 0, frozen: 0 };
             
             if (trade.status === 'active') {
                calculatedBalances['USDT'].available -= trade.amount;
             }
             
             if (trade.status === 'settled' && trade.profit !== undefined) {
                 calculatedBalances['USDT'].available += (trade.amount + trade.profit);
             }
        });

        // 4. Investments
        const userInvestments: Investment[] = JSON.parse(localStorage.getItem(`userInvestments_${username}`) || '[]') as [];
        userInvestments.forEach(investment => {
             if (!calculatedBalances['USDT']) calculatedBalances['USDT'] = { available: 0, frozen: 0 };
             calculatedBalances['USDT'].available -= investment.amount;
        });

        // 5. Commissions
        const allCommissions: CommissionLog[] = JSON.parse(localStorage.getItem('commissionLogs') || '[]') as [];
        const userCommissions = allCommissions.filter(c => c.uplineUsername === username);
        userCommissions.forEach(log => {
             if (!calculatedBalances['USDT']) calculatedBalances['USDT'] = { available: 0, frozen: 0 };
             calculatedBalances['USDT'].available += log.commissionAmount;
        })
        
        localStorage.setItem(`userBalances_${username}`, JSON.stringify(calculatedBalances));

        if (user && user.username === username) {
            setBalances(calculatedBalances);
        }

    } catch (error) {
        console.error(`Error recalculating balance for ${username}:`, error);
    }
  };


  useEffect(() => {
    // This effect runs when auth state changes (login/logout)
    setIsLoading(true);
    if (user) {
        try {
            // First recalculate to catch any offline changes, then set state
            recalculateBalanceForUser(user.username);
            const userBalances = loadUserBalances(user.username);
            setBalances(userBalances);

            const storedInvestments = localStorage.getItem(`userInvestments_${user.username}`);
            setInvestments(storedInvestments ? JSON.parse(storedInvestments) : []);
            
            loadUserTrades(user.username);

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
      setActiveContractTrades([]);
      setHistoricalTrades([]);
      setIsLoading(false);
    }
  }, [user]);


  useEffect(() => {
    // Contract settlement simulation
    if (!user) return;

    const interval = setInterval(() => {
        try {
            const allTrades: ContractTrade[] = JSON.parse(localStorage.getItem('contractTrades') || '[]') as [];
            const userActiveTrades = allTrades.filter(t => t.userId === user.username && t.status === 'active');
            
            if (userActiveTrades.length === 0) return;

            let tradeSettled = false;
            const now = Date.now();
            let settledTradeIds: string[] = [];

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
                        
                        tradeSettled = true;
                        settledTradeIds.push(trade.id);
                    }
                }
            });

            if (tradeSettled) {
                localStorage.setItem('contractTrades', JSON.stringify(allTrades));
                // Reload trades for the UI, then recalculate balance from the source of truth
                loadUserTrades(user.username);
                recalculateBalanceForUser(user.username);
            }

        } catch (error) {
            console.error("Error during settlement simulation:", error);
        }

    }, 2000); // Check for settlements every 2 seconds

    return () => clearInterval(interval);

  }, [user]);
  

  const addInvestment = (productName: string, amount: number) => {
    if (!user) return false;
    if (balances.USDT.available < amount) {
        return false;
    }
    
    const newInvestment: Investment = {
        id: new Date().toISOString(),
        productName,
        amount,
        date: new Date().toLocaleDateString()
    }
    try {
        const investments = JSON.parse(localStorage.getItem(`userInvestments_${user.username}`) || '[]') as Investment[];
        investments.push(newInvestment);
        localStorage.setItem(`userInvestments_${user.username}`, JSON.stringify(investments));
        setInvestments(investments);
        // Recalculate balance after saving the new state
        recalculateBalanceForUser(user.username);
        return true;
    } catch (e) {
        console.error(e);
        return false;
    }
  }
  
    const handleCommissionDistribution = (sourceUser: User, tradeAmount: number) => {
        try {
            const allUsers: User[] = JSON.parse(localStorage.getItem('users') || '[]') as [];
            const allCommissions: CommissionLog[] = JSON.parse(localStorage.getItem('commissionLogs') || '[]');

            let currentUplineUsername = sourceUser.inviter;
            
            for (let level = 1; level <= 3; level++) {
                if (!currentUplineUsername) break;

                const commissionRate = COMMISSION_RATES[level as keyof CommissionRates];
                const commissionAmount = tradeAmount * commissionRate;

                // Create a commission transaction log instead of directly calling updateBalance
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

                const uplineUser = allUsers.find(u => u.username === currentUplineUsername);
                if (uplineUser) {
                    // Important: Instead of direct update, just mark for recalc
                    recalculateBalanceForUser(uplineUser.username);
                    currentUplineUsername = uplineUser.inviter;
                } else {
                    currentUplineUsername = null;
                }
            }
            
            localStorage.setItem('commissionLogs', JSON.stringify(allCommissions));

        } catch (error) {
            console.error("Failed to distribute commissions:", error);
        }
    };


  const placeContractTrade = (trade: ContractTradeParams, tradingPair: string) => {
    if (!user || !marketData) return;

    // Persist first, then update state by re-reading source of truth
    try {
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

        const existingTrades = JSON.parse(localStorage.getItem('contractTrades') || '[]') as ContractTrade[];
        existingTrades.push(fullTrade);
        localStorage.setItem('contractTrades', JSON.stringify(existingTrades));

        handleCommissionDistribution(user, trade.amount);
        recalculateBalanceForUser(user.username);
        loadUserTrades(user.username);

    } catch (error) {
        console.error("Failed to save contract trade to localStorage", error);
    }
  };
  
  const placeSpotTrade = (trade: Omit<SpotTrade, 'id' | 'status' | 'userId' | 'orderType' | 'tradingPair' | 'createdAt'>, tradingPair: string) => {
     if (!user) return;
    
    try {
        const fullTrade: SpotTrade = {
            ...trade,
            id: `spot_${Date.now()}`,
            userId: user.username,
            tradingPair,
            orderType: 'spot',
            status: 'filled',
            createdAt: new Date().toISOString(),
        }
        const existingTrades = JSON.parse(localStorage.getItem('spotTrades') || '[]') as SpotTrade[];
        existingTrades.push(fullTrade);
        localStorage.setItem('spotTrades', JSON.stringify(existingTrades));

        recalculateBalanceForUser(user.username);
        loadUserTrades(user.username);
    } catch (error) {
        console.error("Failed to save spot trade to localStorage", error);
    }

  };
  
  const requestWithdrawal = (asset: string, amount: number, address: string) => {
      if (!user) return false;
      if (amount > (balances[asset]?.available || 0)) {
          return false;
      }
       try {
           const newTransaction: Transaction = {
                id: `txn_${Date.now()}`,
                userId: user.username,
                type: 'withdrawal',
                asset: asset,
                amount: amount,
                address: address,
                status: 'pending',
                createdAt: new Date().toISOString(),
            };

            const existingTransactions = JSON.parse(localStorage.getItem('transactions') || '[]') as Transaction[];
            existingTransactions.push(newTransaction);
            localStorage.setItem('transactions', JSON.stringify(existingTransactions));
            
            // After logging the request, recalculate balances which will handle the freezing
            recalculateBalanceForUser(user.username);
            return true;
       } catch (error) {
           console.error("Failed to save withdrawal request to localStorage", error);
           return false;
       }
  };


  const value = { 
      balances, 
      assets: ALL_ASSETS, 
      placeContractTrade, 
      placeSpotTrade, 
      isLoading,
      investments,
      balance: balances.USDT?.available || 0, // for finance page
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
