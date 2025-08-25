
"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { ContractTrade, SpotTrade, Investment, RewardLog, User, InvestmentTier, SecureUser } from '@/types';
import { useAuth } from './auth-context';
import { useMarket } from './market-data-context';
import { useToast } from '@/hooks/use-toast';
import { useLogs } from './logs-context';
import { supabase, isSupabaseEnabled } from '@/lib/supabaseClient';

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
  adjustBalance: (userId: string, asset: string, amount: number, isFrozen?: boolean, isDebitFrozen?: boolean) => Promise<void>;
  creditReward: (params: CreditRewardParams) => void;
}

const BalanceContext = createContext<BalanceContextType | undefined>(undefined);

export function BalanceProvider({ children }: { children: ReactNode }) {
  const { user, getUserById, updateUser } = useAuth();
  const { getLatestPrice } = useMarket();
  const { toast } = useToast();
  const { addLog } = useLogs();
  
  const [balances, setBalances] = useState<{ [key: string]: { available: number; frozen: number } }>({});
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [rewardLogs, setRewardLogs] = useState<RewardLog[]>([]);
  const [activeContractTrades, setActiveContractTrades] = useState<ContractTrade[]>([]);
  const [historicalTrades, setHistoricalTrades] = useState<(SpotTrade | ContractTrade)[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // --- DATA FETCHING ---
  const fetchUserBalanceData = useCallback(async (userId: string) => {
      if (!isSupabaseEnabled) return;
      const { data, error } = await supabase.from('balances').select('*').eq('user_id', userId);
      if (error) console.error("Error fetching balances:", error);
      else {
          const formattedBalances: { [key: string]: { available: number; frozen: number } } = {};
          data?.forEach(b => {
              formattedBalances[b.asset] = { available: b.available_balance, frozen: b.frozen_balance };
          });
          setBalances(formattedBalances);
      }
  }, []);
  
  const fetchUserTradeData = useCallback(async (userId: string) => {
      if (!isSupabaseEnabled) return;
      const { data, error } = await supabase.from('trades').select('*').eq('user_id', userId).order('created_at', { ascending: false });
      if (error) console.error("Error fetching trades:", error);
      else {
          setActiveContractTrades(data.filter(t => t.orderType === 'contract' && t.status === 'active') as ContractTrade[]);
          setHistoricalTrades(data.filter(t => t.status !== 'active') as (SpotTrade | ContractTrade)[]);
      }
  }, []);

  const fetchUserInvestmentData = useCallback(async (userId: string) => {
    if (!isSupabaseEnabled) return;
    const { data, error } = await supabase.from('investments').select('*').eq('user_id', userId).order('created_at', { ascending: false });
    if (error) console.error("Error fetching investments:", error);
    else setInvestments(data as Investment[]);
  }, []);
  
  const fetchUserRewardLogs = useCallback(async (userId: string) => {
      if (!isSupabaseEnabled) return;
      const { data, error } = await supabase.from('reward_logs').select('*').eq('user_id', userId).order('created_at', { ascending: false });
      if (error) console.error("Error fetching reward logs:", error);
      else setRewardLogs(data as RewardLog[]);
  }, []);


  useEffect(() => {
    const loadAllData = async () => {
        setIsLoading(true);
        if (user?.id && isSupabaseEnabled) {
            await Promise.all([
                fetchUserBalanceData(user.id),
                fetchUserTradeData(user.id),
                fetchUserInvestmentData(user.id),
                fetchUserRewardLogs(user.id),
            ]);
        } else {
            // Clear data on logout
            setBalances({});
            setInvestments([]);
            setRewardLogs([]);
            setActiveContractTrades([]);
            setHistoricalTrades([]);
        }
        setIsLoading(false);
    }
    loadAllData();
  }, [user, isSupabaseEnabled, fetchUserBalanceData, fetchUserTradeData, fetchUserInvestmentData, fetchUserRewardLogs]);
  
  // Realtime Subscriptions
  useEffect(() => {
    if (!user || !isSupabaseEnabled) return;

    const handleDataChange = () => {
        if (!user) return;
        fetchUserTradeData(user.id);
        fetchUserInvestmentData(user.id);
        fetchUserBalanceData(user.id);
    }

    const tradesChannel = supabase
      .channel(`trades-channel-${user.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'trades', filter: `user_id=eq.${user.id}` }, 
        handleDataChange
      ).subscribe();
      
    const investmentsChannel = supabase
      .channel(`investments-channel-${user.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'investments', filter: `user_id=eq.${user.id}` }, 
        handleDataChange
      ).subscribe();

    const balancesChannel = supabase
      .channel(`balances-channel-${user.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'balances', filter: `user_id=eq.${user.id}` }, 
        handleDataChange
      ).subscribe();
      
    return () => {
      supabase.removeChannel(tradesChannel);
      supabase.removeChannel(investmentsChannel);
      supabase.removeChannel(balancesChannel);
    };
  }, [user, isSupabaseEnabled, fetchUserTradeData, fetchUserInvestmentData, fetchUserBalanceData]);

  
  // --- CORE FUNCTIONS ---
  const adjustBalance = useCallback(async (userId: string, asset: string, amount: number, isFrozen: boolean = false, isDebitFrozen: boolean = false) => {
        if (!isSupabaseEnabled) return;
        const { error } = await supabase.rpc('adjust_balance', {
            p_user_id: userId,
            p_asset: asset,
            p_amount: amount,
            p_is_frozen: isFrozen,
            p_is_debit_frozen: isDebitFrozen,
        });
        if (error) {
            console.error(`Failed to adjust ${asset} for user ${userId}:`, error);
            toast({ variant: 'destructive', title: 'Balance update failed', description: error.message });
        }
  }, [toast]);

  const creditReward = useCallback(async (params: CreditRewardParams) => {
    const targetUser = await getUserById(params.userId);
    if (!targetUser || !isSupabaseEnabled) return;
      
    await adjustBalance(params.userId, params.asset, params.amount);

    const newLog: Omit<RewardLog, 'id' | 'created_at'> = {
      user_id: params.userId,
      type: params.type,
      amount: params.amount,
      asset: params.asset,
      source_id: params.sourceId,
      source_username: params.sourceUsername,
      source_level: params.sourceLevel,
      description: params.description,
    };
    
    const { error: logError } = await supabase.from('reward_logs').insert(newLog);
    if (logError) console.error("Failed to insert reward log:", logError);
    
    addLog({
        entity_type: 'reward',
        entity_id: params.sourceId || params.userId,
        action: 'create',
        details: `Credited ${params.amount.toFixed(4)} ${params.asset} to ${targetUser.username} for ${params.type}. Desc: ${params.description || 'N/A'}`
    });
  }, [adjustBalance, addLog, getUserById]);


  const placeContractTrade = useCallback(async (trade: Pick<ContractTrade, 'type' | 'amount' | 'period' | 'profit_rate'>, tradingPair: string) => {
    if (!user || !isSupabaseEnabled) return;

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
    
    const newTrade: Omit<ContractTrade, 'id' | 'created_at'> = {
      user_id: user.id,
      trading_pair: tradingPair,
      type: trade.type,
      amount: trade.amount,
      entry_price: currentPrice,
      settlement_time: new Date(Date.now() + (trade.period * 1000)).toISOString(),
      period: trade.period,
      profit_rate: trade.profit_rate,
      status: 'active',
      orderType: 'contract',
    }

    // Backend will handle balance adjustments via triggers or functions
    const { data: insertedTrade, error } = await supabase.from('trades').insert(newTrade).select().single();

    if (error || !insertedTrade) {
      console.error("Failed to place contract trade:", error);
      toast({ variant: 'destructive', title: '下单失败', description: '无法保存交易记录，请重试。' });
      return;
    }
    
    toast({ title: '下单成功', description: '您的合约订单已成功建立。' });

  }, [user, balances, getLatestPrice, toast]);
  
  
  const placeSpotTrade = useCallback(async (trade: Pick<SpotTrade, 'type' | 'amount' | 'total' | 'trading_pair'>) => {
     if (!user || !isSupabaseEnabled) return;
    
     if (user.is_frozen) {
        toast({ variant: 'destructive', title: 'Action Failed', description: 'Your account is frozen.'});
        return;
    }

    const [baseAsset, quoteAsset] = trade.trading_pair.split('/');
    
    if (trade.type === 'buy' && (balances[quoteAsset]?.available || 0) < trade.total) {
        toast({ variant: 'destructive', title: '下单失败', description: `可用 ${quoteAsset} 余额不足。` });
        return;
    }
     if (trade.type === 'sell' && (balances[baseAsset]?.available || 0) < trade.amount) {
        toast({ variant: 'destructive', title: '下单失败', description: `可用 ${baseAsset} 余额不足。` });
        return;
    }

    const currentPrice = getLatestPrice(trade.trading_pair);
    const newTrade: Omit<SpotTrade, 'id'|'created_at'> = {
        type: trade.type,
        amount: trade.amount,
        total: trade.total,
        price: currentPrice,
        user_id: user.id,
        trading_pair: trade.trading_pair,
        base_asset: baseAsset,
        quote_asset: quoteAsset,
        status: 'filled',
        orderType: 'spot'
    }

    const { data: insertedTrade, error } = await supabase.from('trades').insert(newTrade).select().single();
    if (error || !insertedTrade) {
      console.error("Failed to place spot trade:", error);
      toast({ variant: 'destructive', title: '下单失败', description: '无法保存交易记录，请联系客服。' });
      return;
    }
     
     toast({ title: '交易成功', description: '您的币币交易已完成。' });
  }, [user, balances, getLatestPrice, toast]);


    const addDailyInvestment = async (params: DailyInvestmentParams) => {
        if (!user || !isSupabaseEnabled) return false;
        
        await adjustBalance(user.id, 'USDT', -params.amount);
        if (params.stakingAsset && params.stakingAmount) {
            await adjustBalance(user.id, params.stakingAsset, params.stakingAmount, true);
        }

        const now = new Date();
        const settlementDate = new Date(now.getTime() + params.period * 24 * 60 * 60 * 1000);

        const newInvestment: Omit<Investment, 'id'> = {
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
            staking_asset: params.stakingAsset,
            staking_amount: params.stakingAmount,
        }
        
        const { error } = await supabase.from('investments').insert(newInvestment);
        if (error) {
            console.error("Failed to add daily investment:", error);
            await adjustBalance(user.id, 'USDT', params.amount);
             if (params.stakingAsset && params.stakingAmount) {
                await adjustBalance(user.id, params.stakingAsset, -params.stakingAmount, true);
            }
            return false;
        }
        return true;
    }
  
    const addHourlyInvestment = async (params: HourlyInvestmentParams) => {
        if (!user || !isSupabaseEnabled) return false;
        
        const selectedTier = params.tiers.find(t => t.hours === params.durationHours);
        if (!selectedTier) return false;

        await adjustBalance(user.id, 'USDT', -params.amount);
        
        const now = new Date();
        const settlementDate = new Date(now.getTime() + params.durationHours * 60 * 60 * 1000);

        const newInvestment: Omit<Investment, 'id'> = {
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
        
        const { error } = await supabase.from('investments').insert(newInvestment);
        if (error) {
            console.error("Failed to add hourly investment:", error);
            await adjustBalance(user.id, 'USDT', params.amount);
            return false;
        }
        return true;
  }

  const value = { 
      balances, 
      placeContractTrade, 
      placeSpotTrade, 
      isLoading,
      investments,
      rewardLogs,
      addDailyInvestment,
      addHourlyInvestment,
      activeContractTrades,
      historicalTrades,
      adjustBalance,
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
