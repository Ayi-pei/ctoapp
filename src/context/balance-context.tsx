
"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { ContractTrade, SpotTrade, Transaction, Investment, RewardLog, User, InvestmentTier, ActionLog, SecureUser } from '@/types';
import { useAuth } from './auth-context';
import { useMarket } from './market-data-context';
import { useToast } from '@/hooks/use-toast';
import { getUserData, saveUserData, UserData } from '@/lib/user-data';
import { useLogs } from './logs-context';

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
    AVAX: { available: 0, frozen: 0 },
    LINK: { available: 0, frozen: 0 },
    DOT: { available: 0, frozen: 0 },
    UNI: { available: 0, frozen: 0 },
    TRX: { available: 0, frozen: 0 },
    XLM: { available: 0, frozen: 0 },
    VET: { available: 0, frozen: 0 },
    EOS: { available: 0, frozen: 0 },
    FIL: { available: 0, frozen: 0 },
    ICP: { available: 0, frozen: 0 },
    XAU: { available: 0, frozen: 0},
    USD: { available: 0, frozen: 0},
    EUR: { available: 0, frozen: 0},
    GBP: { available: 0, frozen: 0},
};

const COMMISSION_RATES = [0.08, 0.05, 0.02]; // Level 1, 2, 3

export type DailyInvestmentParams = {
    productName: string;
    amount: number;
    dailyRate: number;
    period: number;
    category: 'staking' | 'finance';
    stakingAsset?: string;
    stakingAmount?: number;
}

export type HourlyInvestmentParams = {
    productName: string;
    amount: number;
    durationHours: number;
    tiers: InvestmentTier[];
    category: 'staking' | 'finance';
}

type CreditRewardParams = {
    userId: string;
    amount: number;
    asset: string;
    type: RewardLog['type'];
    sourceId?: string;
    sourceUsername?: string;
    sourceLevel?: number;
    description?: string;
};


interface BalanceContextType {
  balances: { [key: string]: { available: number; frozen: number } };
  investments: Investment[];
  rewardLogs: RewardLog[];
  addDailyInvestment: (params: DailyInvestmentParams) => Promise<boolean>;
  addHourlyInvestment: (params: HourlyInvestmentParams) => Promise<boolean>;
  placeContractTrade: (trade: Pick<ContractTrade, 'type' | 'amount' | 'period' | 'profit_rate'>, tradingPair: string) => void;
  placeSpotTrade: (trade: Pick<SpotTrade, 'type' | 'amount' | 'total' | 'trading_pair'>) => void;
  isLoading: boolean;
  activeContractTrades: ContractTrade[];
  historicalTrades: (SpotTrade | ContractTrade)[];
  recalculateBalanceForUser: (userId: string) => Promise<any>;
  adjustBalance: (userId: string, asset: string, amount: number) => void;
  adjustFrozenBalance: (asset: string, amount: number, userId?: string) => void;
  confirmWithdrawal: (asset: string, amount: number, userId?: string) => void;
  revertWithdrawal: (asset: string, amount: number, userId?: string) => void;
  handleCheckIn: () => Promise<{ success: boolean; reward: number; message?: string; }>;
  lastCheckInDate?: string;
  consecutiveCheckIns: number;
  getAllHistoricalTrades: () => (SpotTrade | ContractTrade)[];
  getAllUserInvestments: () => Investment[];
  creditReward: (params: CreditRewardParams) => void;
}

const BalanceContext = createContext<BalanceContextType | undefined>(undefined);

// Helper to get all users directly from localStorage for data aggregation
const getAllUsersFromStorage = (): User[] => {
    if (typeof window === 'undefined') return [];
    const storedUsers = localStorage.getItem('tradeflow_users');
    return storedUsers ? Object.values(JSON.parse(storedUsers)) : [];
};


export function BalanceProvider({ children }: { children: ReactNode }) {
  const { user, getUserById, updateUser } = useAuth();
  const { getLatestPrice } = useMarket();
  const { toast } = useToast();
  const { addLog } = useLogs();
  
  const [balances, setBalances] = useState<{ [key: string]: { available: number; frozen: number } }>(INITIAL_BALANCES_USER);
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [rewardLogs, setRewardLogs] = useState<RewardLog[]>([]);
  const [activeContractTrades, setActiveContractTrades] = useState<ContractTrade[]>([]);
  const [historicalTrades, setHistoricalTrades] = useState<(SpotTrade | ContractTrade)[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [lastCheckInDate, setLastCheckInDate] = useState<string | undefined>();
  const [consecutiveCheckIns, setConsecutiveCheckIns] = useState(0);

    const getAllHistoricalTrades = useCallback(() => {
        const allUsers = getAllUsersFromStorage();
        const allTrades: (SpotTrade | ContractTrade)[] = [];
        allUsers.forEach((u) => {
            const userData = getUserData(u.id);
            if (userData.historicalTrades) {
                allTrades.push(...userData.historicalTrades);
            }
        });
        return allTrades;
    }, []);

    const getAllUserInvestments = useCallback(() => {
        const allUsers = getAllUsersFromStorage();
        const allInvestments: Investment[] = [];
        allUsers.forEach((u) => {
            const userData = getUserData(u.id);
            if (userData.investments) {
                const userInvestments = userData.investments.map(inv => ({
                    ...inv,
                    user_id: u.id
                }));
                allInvestments.push(...userInvestments);
            }
        });
        return allInvestments;
    }, []);


  // Load user data from storage
  useEffect(() => {
    setIsLoading(true);
    if (user) {
        const data = getUserData(user.id);
        setBalances(data.balances);
        setInvestments(data.investments);
        setActiveContractTrades(data.activeContractTrades);
        setHistoricalTrades(data.historicalTrades);
        setRewardLogs(data.rewardLogs);
        setLastCheckInDate(data.lastCheckInDate);
        setConsecutiveCheckIns(data.consecutiveCheckIns || 0);
    } else {
        // Logged out, clear all data
        setBalances(INITIAL_BALANCES_USER);
        setInvestments([]);
        setActiveContractTrades([]);
        setHistoricalTrades([]);
        setRewardLogs([]);
        setLastCheckInDate(undefined);
        setConsecutiveCheckIns(0);
    }
    setIsLoading(false);
  }, [user]);

  // Save user data to storage whenever it changes
  useEffect(() => {
      if (user && !isLoading) {
          const dataToStore: UserData = {
              balances,
              investments,
              activeContractTrades,
              historicalTrades,
              rewardLogs,
              lastCheckInDate,
              consecutiveCheckIns,
          };
          saveUserData(user.id, dataToStore);
      }
  }, [user, isLoading, balances, investments, activeContractTrades, historicalTrades, rewardLogs, lastCheckInDate, consecutiveCheckIns]);


  const adjustBalance = useCallback((userId: string, asset: string, amount: number) => {
      const userData = getUserData(userId);
      const userBalances = userData.balances;
      userBalances[asset] = {
          ...userBalances[asset],
          available: (userBalances[asset]?.available || 0) + amount,
      };

      userData.balances = userBalances;
      saveUserData(userId, userData);

      if (user?.id === userId) {
          setBalances(userBalances);
      }
  }, [user?.id]);
  
  const creditReward = useCallback((params: CreditRewardParams) => {
    const targetUser = getUserById(params.userId);
    if (!targetUser) return;
      
    adjustBalance(params.userId, params.asset, params.amount);

    const newLog: RewardLog = {
      id: `rlog-${Date.now()}`,
      user_id: params.userId,
      type: params.type,
      amount: params.amount,
      source_id: params.sourceId,
      source_username: params.sourceUsername,
      source_level: params.sourceLevel,
      created_at: new Date().toISOString(),
      description: params.description,
    };
    
    addLog({
        entity_type: 'reward',
        entity_id: newLog.id,
        action: 'create',
        details: `Credited ${params.amount.toFixed(4)} ${params.asset} to ${targetUser.username} for ${params.type}. Description: ${params.description || 'N/A'}`
    });

    const userData = getUserData(params.userId);
    userData.rewardLogs.push(newLog);
    saveUserData(params.userId, userData);

    if (user?.id === params.userId) {
      setRewardLogs(prev => [newLog, ...prev]);
    }
  }, [adjustBalance, user?.id, addLog, getUserById]);


  const distributeCommissions = useCallback((sourceUser: SecureUser, tradeAmount: number, sourceId: string) => {
    if (!sourceUser.inviter_id) return;

    let currentUplineId: string | null = sourceUser.inviter_id;
    
    for (let level = 1; level <= 3; level++) {
        if (!currentUplineId) break;

        const uplineUser = getUserById(currentUplineId);
        if (!uplineUser || uplineUser.is_frozen) {
            break;
        }
        
        const commissionRate = COMMISSION_RATES[level - 1];
        const commissionAmount = tradeAmount * commissionRate;
        
        creditReward({
            userId: uplineUser.id,
            amount: commissionAmount,
            asset: 'USDT',
            type: 'team',
            sourceId: sourceId,
            sourceUsername: sourceUser.username,
            sourceLevel: level,
            description: `From level ${level} user ${sourceUser.username}'s trade`
        });

        currentUplineId = uplineUser.inviter_id; 
    }
  }, [getUserById, creditReward]);

  const adjustFrozenBalance = useCallback((asset: string, amount: number, userId?: string) => {
      const targetUserId = userId || user?.id;
      if (!targetUserId) return;

      const userData = getUserData(targetUserId);
      const userBalances = userData.balances;
      
      const currentAvailable = userBalances[asset]?.available || 0;
      const currentFrozen = userBalances[asset]?.frozen || 0;

      // amount can be negative to unfreeze
      userBalances[asset] = {
          available: currentAvailable - amount,
          frozen: currentFrozen + amount,
      };
      saveUserData(targetUserId, { ...userData, balances: userBalances });
      
      if (user?.id === targetUserId) {
          setBalances(userBalances);
      }
  }, [user]);

  const settleInvestment = useCallback((investmentToSettle: Investment) => {
    if (!investmentToSettle || investmentToSettle.status !== 'active') {
        return;
    }

    let profit = 0;
    if (investmentToSettle.productType === 'hourly' && investmentToSettle.hourly_rate && investmentToSettle.duration_hours) {
        profit = investmentToSettle.amount * investmentToSettle.hourly_rate;
    } else if (investmentToSettle.productType === 'daily' && investmentToSettle.daily_rate && investmentToSettle.period) {
        profit = investmentToSettle.amount * investmentToSettle.daily_rate * investmentToSettle.period;
    }
    
    const totalReturn = investmentToSettle.amount + profit;

    adjustBalance(investmentToSettle.user_id, 'USDT', totalReturn);

    if (investmentToSettle.stakingAsset && investmentToSettle.stakingAmount) {
        adjustFrozenBalance(investmentToSettle.stakingAsset, -investmentToSettle.stakingAmount, investmentToSettle.user_id);
    }
    
    const userData = getUserData(investmentToSettle.user_id);
    const updatedInvestments = userData.investments.map(inv => 
        inv.id === investmentToSettle.id ? { ...inv, status: 'settled', profit } : inv
    );
    saveUserData(investmentToSettle.user_id, { ...userData, investments: updatedInvestments });

    if (user?.id === investmentToSettle.user_id) {
        setInvestments(updatedInvestments);
        toast({
            title: '理财订单已结算',
            description: `您的 “${investmentToSettle.product_name}” 订单已到期，本金和收益共 ${totalReturn.toFixed(2)} USDT 已返还至您的余额。`
        });
    }
  }, [adjustBalance, toast, user?.id, adjustFrozenBalance]);

  // Effect to handle investment settlement for ALL users
  useEffect(() => {
    const interval = setInterval(() => {
        const allUsers = getAllUsersFromStorage();
        if (!allUsers.length) return;

        const now = new Date();
        allUsers.forEach(u => {
            const userData = getUserData(u.id);
            userData.investments.forEach(inv => {
                 if (inv.status === 'active' && new Date(inv.settlement_date) <= now) {
                    // Pass the full investment object to avoid re-fetching
                    settleInvestment({ ...inv, user_id: u.id });
                }
            });
        });
    }, 5000); // Check every 5 seconds

    return () => clearInterval(interval);
  }, [settleInvestment]);


  const settleContractTrade = useCallback((trade: ContractTrade) => {
    if (!trade || trade.status !== 'active') return;

    const settlementPrice = getLatestPrice(trade.trading_pair);
    let outcome: 'win' | 'loss';
    
    if (trade.type === 'buy') { 
        outcome = settlementPrice > trade.entry_price ? 'win' : 'loss';
    } else { 
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

    const userData = getUserData(trade.user_id);
    const userBalances = userData.balances;
    const newFrozen = userBalances[quoteAsset].frozen - trade.amount;
    const newAvailable = userBalances[quoteAsset].available + (outcome === 'win' ? trade.amount + profit : 0);
    userBalances[quoteAsset] = { available: newAvailable, frozen: newFrozen };
    
    const updatedActiveTrades = userData.activeContractTrades.filter(t => t.id !== trade.id);
    const updatedHistoricalTrades = [settledTrade, ...userData.historicalTrades];

    saveUserData(trade.user_id, {
        ...userData,
        balances: userBalances,
        activeContractTrades: updatedActiveTrades,
        historicalTrades: updatedHistoricalTrades,
    });

    if (user?.id === trade.user_id) {
        setBalances(userBalances);
        setActiveContractTrades(updatedActiveTrades);
        setHistoricalTrades(updatedHistoricalTrades);
        toast({
            title: `合约结算: ${outcome === 'win' ? '盈利' : '亏损'}`,
            description: `${trade.trading_pair} 合约已结算，盈亏: ${profit.toFixed(2)} ${quoteAsset}`
        });
    }
  }, [getLatestPrice, toast, user?.id]);

  // Effect to handle contract trade settlement for ALL users
  useEffect(() => {
    const interval = setInterval(() => {
       const allUsers = getAllUsersFromStorage();
        if (!allUsers.length) return;

        const now = new Date();
        allUsers.forEach(u => {
            const userData = getUserData(u.id);
            userData.activeContractTrades.forEach(trade => {
                 if (new Date(trade.settlement_time) <= now) {
                    settleContractTrade({ ...trade, user_id: u.id });
                }
            });
        });
    }, 1000); 

    return () => clearInterval(interval);
  }, [settleContractTrade]);
  
  
    const addDailyInvestment = useCallback(async (params: DailyInvestmentParams) => {
        if (!user) return false;
        
        // This function now assumes validation has happened in the UI layer.
        // It focuses purely on state mutation.
        
        // 1. Deduct purchase price from available balance
        adjustBalance(user.id, 'USDT', -params.amount);

        // 2. Freeze staked asset if required
        if (params.stakingAsset && params.stakingAmount) {
            adjustFrozenBalance(params.stakingAsset, params.stakingAmount, user.id);
        }

        const now = new Date();
        const settlementDate = new Date(now.getTime() + params.period * 24 * 60 * 60 * 1000);

        const newInvestment: Investment = {
            id: `inv-d-${Date.now()}`,
            user_id: user.id,
            product_name: params.productName,
            amount: params.amount,
            created_at: now.toISOString(),
            settlement_date: settlementDate.toISOString(),
            daily_rate: params.dailyRate,
            period: params.period,
            status: 'active',
            productType: 'daily',
            category: 'staking',
            stakingAsset: params.stakingAsset,
            stakingAmount: params.stakingAmount,
        }
        setInvestments(prev => [newInvestment, ...prev]);
        return true;
  }, [user, adjustBalance, adjustFrozenBalance]);
  
  const addHourlyInvestment = useCallback(async (params: HourlyInvestmentParams) => {
     if (!user) return false;
    
    if ((balances.USDT?.available || 0) < params.amount) {
      return false;
    }
    
    const selectedTier = params.tiers.find(t => t.hours === params.durationHours);
    if (!selectedTier) {
        console.error("Invalid duration or tier not found for hourly investment");
        return false;
    }

    setBalances(prev => ({
      ...prev,
      USDT: { ...prev.USDT, available: prev.USDT.available - params.amount }
    }));

    const now = new Date();
    const settlementDate = new Date(now.getTime() + params.durationHours * 60 * 60 * 1000);

    const newInvestment: Investment = {
        id: `inv-h-${Date.now()}`,
        user_id: user.id,
        product_name: params.productName,
        amount: params.amount,
        created_at: now.toISOString(),
        settlement_date: settlementDate.toISOString(),
        status: 'active',
        productType: 'hourly',
        duration_hours: params.durationHours,
        hourly_rate: selectedTier.rate,
        category: 'finance',
    }
    setInvestments(prev => [newInvestment, ...prev]);
    return true;
  }, [user, balances]);

  const placeContractTrade = useCallback(async (trade: Pick<ContractTrade, 'type' | 'amount' | 'period' | 'profit_rate'>, tradingPair: string) => {
    if (!user) return;

    if (user.is_frozen) {
        toast({ variant: 'destructive', title: 'Action Failed', description: 'Your account is frozen.'});
        return;
    }
    
    const quoteAsset = tradingPair.split('/')[1];
    const currentPrice = getLatestPrice(tradingPair);

     if ((balances[quoteAsset]?.available || 0) < trade.amount) {
        toast({ variant: 'destructive', title: '下单失败', description: `可用 ${quoteAsset} 余额不足。` });
        return;
    }
    
    const newTrade: ContractTrade = {
      id: `ct-${Date.now()}`,
      user_id: user.id,
      trading_pair: tradingPair,
      type: trade.type,
      amount: trade.amount,
      entry_price: currentPrice,
      settlement_time: new Date(Date.now() + (trade.period * 1000)).toISOString(),
      period: trade.period,
      profit_rate: trade.profit_rate,
      status: 'active',
      created_at: new Date().toISOString(),
      orderType: 'contract',
    }

    setActiveContractTrades(prev => [...prev, newTrade]);
    adjustFrozenBalance(quoteAsset, trade.amount);

    if(quoteAsset === 'USDT') {
      distributeCommissions(user, trade.amount, newTrade.id);
    }
  }, [user, balances, getLatestPrice, toast, distributeCommissions, adjustFrozenBalance]);
  
  const placeSpotTrade = useCallback(async (trade: Pick<SpotTrade, 'type' | 'amount' | 'total' | 'trading_pair'>) => {
     if (!user) return;
    
     if (user.is_frozen) {
        toast({ variant: 'destructive', title: 'Action Failed', description: 'Your account is frozen.'});
        return;
    }

    const [baseAsset, quoteAsset] = trade.trading_pair.split('/');
    const currentPrice = getLatestPrice(trade.trading_pair);
    const fullTrade: SpotTrade = {
        id: `st-${Date.now()}`,
        type: trade.type,
        amount: trade.amount,
        total: trade.total,
        price: currentPrice,
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

     if(quoteAsset === 'USDT') {
        distributeCommissions(user, trade.total, fullTrade.id);
     }
  }, [user, getLatestPrice, toast, distributeCommissions]);

    const handleCheckIn = useCallback(async (): Promise<{ success: boolean; reward: number; message?: string; }> => {
        if (!user) {
            return { success: false, reward: 0, message: "User not logged in." };
        }

        const today = new Date();
        const todayStr = today.toISOString().split('T')[0];

        if (lastCheckInDate === todayStr) {
            return { success: false, reward: 0, message: "You have already checked in today." };
        }

        const yesterday = new Date(today);
        yesterday.setDate(today.getDate() - 1);
        const yesterdayStr = yesterday.toISOString().split('T')[0];

        let newConsecutiveCheckIns = 1;
        if (lastCheckInDate === yesterdayStr) {
            newConsecutiveCheckIns = (consecutiveCheckIns % 7) + 1;
        }

        const baseReward = 0.5;
        const reward = baseReward * Math.pow(1.5, newConsecutiveCheckIns - 1);
        
        creditReward({
            userId: user.id,
            amount: reward,
            asset: 'USDT',
            type: 'dailyTask',
            sourceId: `checkin-${todayStr}`,
            description: `Daily check-in reward (Day ${newConsecutiveCheckIns})`
        });
        
        await updateUser(user.id, { credit_score: (user.credit_score || 0) + 1 });

        setLastCheckInDate(todayStr);
        setConsecutiveCheckIns(newConsecutiveCheckIns);

        return { success: true, reward };
    }, [user, lastCheckInDate, consecutiveCheckIns, creditReward, updateUser]);
  
  const confirmWithdrawal = useCallback((asset: string, amount: number, userId?: string) => {
      const targetUserId = userId || user?.id;
      if (!targetUserId) return;

      const userData = getUserData(targetUserId);
      const userBalances = userData.balances;
      userBalances[asset] = {
          ...userBalances[asset],
          frozen: (userBalances[asset]?.frozen || 0) - amount,
      };
      saveUserData(targetUserId, { ...userData, balances: userBalances });

      if (user?.id === targetUserId) {
          setBalances(userBalances);
      }
  }, [user]);

  const revertWithdrawal = useCallback((asset: string, amount: number, userId?: string) => {
      const targetUserId = userId || user?.id;
      if (!targetUserId) return;

      const userData = getUserData(targetUserId);
      const userBalances = userData.balances;
      userBalances[asset] = {
          available: (userBalances[asset]?.available || 0) + amount,
          frozen: (userBalances[asset]?.frozen || 0) - amount,
      };
      saveUserData(targetUserId, { ...userData, balances: userBalances });

      if (user?.id === targetUserId) {
          setBalances(userBalances);
      }
  }, [user]);

  const recalculateBalanceForUser = useCallback(async (userId: string) => {
    return getUserData(userId).balances;
  }, []);
  
  const value = { 
      balances, 
      placeContractTrade, 
      placeSpotTrade, 
      isLoading,
      investments,
      rewardLogs,
      addDailyInvestment,
      addHourlyInvestment,
      recalculateBalanceForUser,
      activeContractTrades,
      historicalTrades,
      adjustBalance,
      adjustFrozenBalance,
      confirmWithdrawal,
      revertWithdrawal,
      handleCheckIn,
      lastCheckInDate,
      consecutiveCheckIns,
      getAllHistoricalTrades,
      getAllUserInvestments,
      creditReward,
    };

    return (
        <BalanceContext.Provider value={value}>
            {children}
        </BalanceContext.Provider>
    )
}

export function useBalance() {
  const context = useContext(BalanceContext);
  if (context === undefined) {
    throw new Error('useBalance must be used within an BalanceProvider');
  }
  return context;
}
