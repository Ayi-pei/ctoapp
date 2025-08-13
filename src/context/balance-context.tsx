
"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { ContractTrade, SpotTrade, Transaction, Investment, availablePairs } from '@/types';
import { CircleDollarSign } from 'lucide-react';
import { useAuth } from '@/context/auth-context';
import { useMarket } from '@/context/market-data-context';
import { supabase } from '@/lib/supabase';

const INITIAL_BALANCES_TEST_USER: { [key: string]: { available: number; frozen: number } } = {
    USDT: { available: 100000, frozen: 0 },
    BTC: { available: 5, frozen: 0 },
    ETH: { available: 100, frozen: 0 },
    SOL: { available: 1000, frozen: 0},
    XRP: { available: 50000, frozen: 0},
    LTC: { available: 1000, frozen: 0},
    BNB: { available: 500, frozen: 0},
    MATIC: { available: 100000, frozen: 0},
    DOGE: { available: 1000000, frozen: 0},
    ADA: { available: 100000, frozen: 0},
    SHIB: { available: 500000000, frozen: 0},
    'XAU/USD': { available: 0, frozen: 0},
    'EUR/USD': { available: 0, frozen: 0},
    'GBP/USD': { available: 0, frozen: 0},
};

const INITIAL_BALANCES_REAL_USER: { [key: string]: { available: number; frozen: number } } = {
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
  addInvestment: (productName: string, amount: number) => Promise<boolean>;
  assets: { name: string, icon: React.ElementType }[];
  placeContractTrade: (trade: ContractTradeParams, tradingPair: string) => void;
  placeSpotTrade: (trade: Omit<SpotTrade, 'id' | 'status' | 'user_id' | 'orderType' | 'tradingPair' | 'createdAt' | 'order_type' | 'trading_pair' | 'base_asset' | 'quote_asset'>, tradingPair: string) => void;
  requestWithdrawal: (asset: string, amount: number, address: string) => Promise<boolean>;
  isLoading: boolean;
  activeContractTrades: ContractTrade[];
  historicalTrades: (SpotTrade | ContractTrade)[];
  recalculateBalanceForUser: (userId: string) => Promise<any>;
}

const BalanceContext = createContext<BalanceContextType | undefined>(undefined);

const COMMISSION_RATES: { [key: number]: number } = {
    1: 0.08, // Level 1: 8%
};

export function BalanceProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { data: marketData } = useMarket(); // Get current market data
  const [balances, setBalances] = useState<{ [key: string]: { available: number; frozen: number } }>(INITIAL_BALANCES_REAL_USER);
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Trade history states
  const [activeContractTrades, setActiveContractTrades] = useState<ContractTrade[]>([]);
  const [historicalTrades, setHistoricalTrades] = useState<(SpotTrade | ContractTrade)[]>([]);

  
  const loadUserTrades = useCallback(async (userId: string) => {
        if (!userId) return;
        try {
            const { data: allContractTrades, error: contractError } = await supabase.from('contract_trades').select('*').eq('user_id', userId);
            const { data: allSpotTrades, error: spotError } = await supabase.from('spot_trades').select('*').eq('user_id', userId);
            
            if (contractError) throw contractError;
            if (spotError) throw spotError;
            
            const activeTrades = allContractTrades.filter(t => t.status === 'active');
            setActiveContractTrades(activeTrades.map(t => ({...t, userId: t.user_id, tradingPair: t.trading_pair, orderType: 'contract', createdAt: t.created_at} as ContractTrade)));

            const settledContractTrades = allContractTrades.filter(t => t.status === 'settled');
            const combinedHistory = [...settledContractTrades, ...allSpotTrades]
                .sort((a,b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
            
            const formattedHistory = combinedHistory.map(t => {
                const base = { userId: t.user_id, tradingPair: t.trading_pair, createdAt: t.created_at };
                if ('base_asset' in t) { // Spot Trade
                    return { ...t, ...base, orderType: 'spot', baseAsset: t.base_asset, quoteAsset: t.quote_asset };
                }
                return { ...t, ...base, orderType: 'contract' }; // Contract Trade
            });

            setHistoricalTrades(formattedHistory as (SpotTrade | ContractTrade)[]);

        } catch (error) {
            console.error("Failed to fetch user trades:", error);
        }
    }, []);


  const recalculateBalanceForUser = useCallback(async (userId: string) => {
    if (!userId) return;
    try {
        const { data: targetUser, error: userError } = await supabase.from('users').select('*').eq('id', userId).single();
        if (userError || !targetUser) return {};

        let calculatedBalances: { [key: string]: { available: number; frozen: number } } = targetUser.is_test_user ? 
            JSON.parse(JSON.stringify(INITIAL_BALANCES_TEST_USER)) : 
            JSON.parse(JSON.stringify(INITIAL_BALANCES_REAL_USER));

        // 1. Financial Transactions (Deposits/Withdrawals/Admin Adjustments)
        const { data: userFinancialTxs, error: txError } = await supabase.from('transactions').select('*').eq('user_id', userId);
        if (txError) throw txError;


        userFinancialTxs.forEach((tx: Transaction) => {
            if (!calculatedBalances[tx.asset]) calculatedBalances[tx.asset] = { available: 0, frozen: 0 };
            
            if (tx.type === 'deposit' && tx.status === 'approved') {
                calculatedBalances[tx.asset].available += tx.amount;
            } else if (tx.type === 'withdrawal') {
                 if (tx.status === 'pending') {
                    calculatedBalances[tx.asset].available -= tx.amount;
                    calculatedBalances[tx.asset].frozen += tx.amount;
                 } else if (tx.status === 'rejected') {
                    calculatedBalances[tx.asset].available += tx.amount;
                 } else if (tx.status === 'approved') {
                    calculatedBalances[tx.asset].frozen -= tx.amount;
                 }
            } else if (tx.type === 'adjustment' && tx.status === 'approved') { // Admin adjustments
                calculatedBalances[tx.asset].available += tx.amount;
            }
        });


        // 2. Spot Trades
        const {data: userSpotTrades, error: spotError } = await supabase.from('spot_trades').select('*').eq('user_id', userId).eq('status', 'filled');
        if (spotError) throw spotError;
        userSpotTrades.forEach(trade => {
            if (!calculatedBalances[trade.base_asset]) calculatedBalances[trade.base_asset] = { available: 0, frozen: 0 };
            if (!calculatedBalances[trade.quote_asset]) calculatedBalances[trade.quote_asset] = { available: 0, frozen: 0 };

            if (trade.type === 'buy') {
                calculatedBalances[trade.quote_asset].available -= trade.total;
                calculatedBalances[trade.base_asset].available += trade.amount;
            } else { // sell
                calculatedBalances[trade.base_asset].available -= trade.amount;
                calculatedBalances[trade.quote_asset].available += trade.total;
            }
        });

        // 3. Contract Trades
        const { data: userContractTrades, error: contractError } = await supabase.from('contract_trades').select('*').eq('user_id', userId);
        if(contractError) throw contractError;
        userContractTrades.forEach(trade => {
             if (!calculatedBalances['USDT']) calculatedBalances['USDT'] = { available: 0, frozen: 0 };
             
             if (trade.status === 'active') {
                calculatedBalances['USDT'].available -= trade.amount;
                calculatedBalances['USDT'].frozen += trade.amount;
             }
             
             if (trade.status === 'settled' && trade.profit !== undefined && trade.profit !== null) {
                 calculatedBalances['USDT'].frozen -= trade.amount;
                 calculatedBalances['USDT'].available += (trade.amount + trade.profit);
             }
        });

        // 4. Investments
        const { data: userInvestments, error: invError } = await supabase.from('investments').select('*').eq('user_id', user.id);
        if(invError) throw invError;
        userInvestments.forEach(investment => {
             if (!calculatedBalances['USDT']) calculatedBalances['USDT'] = { available: 0, frozen: 0 };
             calculatedBalances['USDT'].available -= investment.amount;
        });

        // 5. Commissions
        const { data: userCommissions, error: commError } = await supabase.from('commission_logs').select('*').eq('upline_user_id', userId);
        if(commError) throw commError;
        userCommissions.forEach(log => {
             if (!calculatedBalances['USDT']) calculatedBalances['USDT'] = { available: 0, frozen: 0 };
             calculatedBalances['USDT'].available += log.commission_amount;
        })
        
        // This is a calculated value, so we don't save it back. We just update the state for the current user.
        if (user && user.id === userId) {
            setBalances(calculatedBalances);
        }
        return calculatedBalances;

    } catch (error) {
        console.error(`Error recalculating balance for ${userId}:`, error);
        return {};
    }
  }, [user]);


  useEffect(() => {
    // This effect runs when auth state changes (login/logout)
    setIsLoading(true);
    if (user) {
        recalculateBalanceForUser(user.id);
        loadUserTrades(user.id);
        const loadInvestments = async () => {
          const { data, error } = await supabase.from('investments').select('*').eq('user_id', user.id);
          if (error) console.error("Could not fetch investments", error);
          else setInvestments(data.map(i => ({...i, productName: i.product_name, date: new Date(i.created_at).toLocaleDateString()})) || []);
        }
        loadInvestments();
        setIsLoading(false);
    } else {
      // Not authenticated, clear balances
      setBalances(INITIAL_BALANCES_REAL_USER);
      setInvestments([]);
      setActiveContractTrades([]);
      setHistoricalTrades([]);
      setIsLoading(false);
    }
  }, [user, recalculateBalanceForUser, loadUserTrades]);


  useEffect(() => {
    // Contract settlement simulation
    if (!user || typeof window === 'undefined') return;

    const interval = setInterval(async () => {
        try {
            const { data: userActiveTrades, error } = await supabase
                .from('contract_trades')
                .select('*')
                .eq('user_id', user.id)
                .eq('status', 'active');
            
            if (error || !userActiveTrades || userActiveTrades.length === 0) return;

            let tradeSettled = false;
            const now = Date.now();

            for (const trade of userActiveTrades) {
                if (now >= new Date(trade.settlement_time).getTime()) {
                    // Settle this trade
                    const settlementPrice = trade.entry_price * (1 + (Math.random() - 0.5) * 0.001); // Tiny random fluctuation
                    let outcome: 'win' | 'loss';

                    if (trade.type === 'buy') {
                        outcome = settlementPrice > trade.entry_price ? 'win' : 'loss';
                    } else {
                        outcome = settlementPrice < trade.entry_price ? 'win' : 'loss';
                    }

                    const profit = outcome === 'win' ? trade.amount * trade.profit_rate : -trade.amount;
                    
                    const { error: updateError } = await supabase
                        .from('contract_trades')
                        .update({
                            status: 'settled',
                            settlement_price: settlementPrice,
                            outcome: outcome,
                            profit: profit
                        })
                        .eq('id', trade.id);

                    if (!updateError) {
                      tradeSettled = true;
                    }
                }
            }
            

            if (tradeSettled) {
                // Reload trades for the UI, then recalculate balance from the source of truth
                loadUserTrades(user.id);
                recalculateBalanceForUser(user.id);
            }

        } catch (error) {
            console.error("Error during settlement simulation:", error);
        }

    }, 2000); // Check for settlements every 2 seconds

    return () => clearInterval(interval);

  }, [user, recalculateBalanceForUser, loadUserTrades]);
  

  const addInvestment = async (productName: string, amount: number) => {
    if (!user) return false;
    if (balances.USDT.available < amount) {
        return false;
    }
    
    const newInvestment = {
        product_name: productName,
        amount,
        user_id: user.id
    }
    try {
        const { error } = await supabase.from('investments').insert(newInvestment);
        if (error) throw error;
        
        await recalculateBalanceForUser(user.id);
        const { data } = await supabase.from('investments').select('*').eq('user_id', user.id);
        setInvestments(data.map(i => ({...i, productName: i.product_name, date: new Date(i.created_at).toLocaleDateString()})) || []);
        return true;
    } catch (e) {
        console.error(e);
        return false;
    }
  }
  
    const handleCommissionDistribution = async (sourceUserId: string, tradeAmount: number) => {
        try {
            const { data: sourceUser, error: userError } = await supabase.from('users').select('inviter').eq('id', sourceUserId).single();
            if (userError || !sourceUser || !sourceUser.inviter) return;

            const { data: uplineUser, error: uplineError } = await supabase.from('users').select('id, username, is_admin').eq('username', sourceUser.inviter).single();
            if(uplineError || !uplineUser || !uplineUser.is_admin) return;


            const commissionRate = COMMISSION_RATES[1];
            const commissionAmount = tradeAmount * commissionRate;

            const newLog = {
                upline_user_id: uplineUser.id,
                source_user_id: sourceUserId,
                source_username: user?.username,
                source_level: 1,
                trade_amount: tradeAmount,
                commission_rate: commissionRate,
                commission_amount: commissionAmount,
            };
            
            const { error: insertError } = await supabase.from('commission_logs').insert(newLog);
            if (insertError) throw insertError;

            // Trigger balance update for the admin
            recalculateBalanceForUser(uplineUser.id);

        } catch (error) {
            console.error("Failed to distribute commissions:", error);
        }
    };


  const placeContractTrade = async (trade: ContractTradeParams, tradingPair: string) => {
    if (!user || !marketData) return;
    
    try {
        const now = Date.now();
        const fullTrade = {
            ...trade,
            user_id: user.id,
            trading_pair: tradingPair,
            order_type: 'contract',
            status: 'active',
            entry_price: marketData.summary.price,
            settlement_time: new Date(now + (trade.period * 1000)).toISOString(),
            profit_rate: trade.profitRate,
        }

        const { error } = await supabase.from('contract_trades').insert(fullTrade);
        if (error) throw error;


        await handleCommissionDistribution(user.id, trade.amount);
        await recalculateBalanceForUser(user.id);
        await loadUserTrades(user.id);

    } catch (error) {
        console.error("Failed to save contract trade to Supabase", error);
    }
  };
  
  const placeSpotTrade = async (trade: Omit<SpotTrade, 'id' | 'status' | 'user_id' | 'orderType' | 'tradingPair' | 'createdAt' | 'order_type' | 'trading_pair' | 'base_asset' | 'quote_asset'>, tradingPair: string) => {
     if (!user) return;
    
    try {
        const fullTrade = {
            ...trade,
            user_id: user.id,
            trading_pair: tradingPair,
            order_type: 'spot',
            status: 'filled',
            base_asset: trade.baseAsset,
            quote_asset: trade.quoteAsset,
        }
        delete (fullTrade as any).baseAsset;
        delete (fullTrade as any).quoteAsset;
        
        const { error } = await supabase.from('spot_trades').insert(fullTrade);
        if (error) throw error;


        await recalculateBalanceForUser(user.id);
        await loadUserTrades(user.id);
    } catch (error) {
        console.error("Failed to save spot trade to Supabase", error);
    }

  };
  
  const requestWithdrawal = async (asset: string, amount: number, address: string) => {
      if (!user) return false;
      const balance = balances[asset] as { available: number; frozen: number } | undefined;
      if (amount > (balance?.available || 0)) {
          return false;
      }
       try {
           const newTransaction = {
                user_id: user.id,
                type: 'withdrawal',
                asset: asset,
                amount: amount,
                address: address,
                status: 'pending',
            };

            const { error } = await supabase.from('transactions').insert(newTransaction);
            if (error) throw error;
            
            await recalculateBalanceForUser(user.id);
            return true;
       } catch (error) {
           console.error("Failed to save withdrawal request to Supabase", error);
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

    