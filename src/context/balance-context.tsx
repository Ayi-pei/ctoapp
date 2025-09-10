"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
  useCallback,
} from "react";
import {
  ContractTrade,
  SpotTrade,
  Investment,
  RewardLog,
  User,
  InvestmentTier,
  SecureUser,
} from "@/types";
import { useSimpleAuth } from "./simple-custom-auth";
import { useEnhancedMarket } from "./enhanced-market-data-context";
import { useToast } from "@/hooks/use-toast";
import { useSimpleEnhancedLogs } from "./simple-enhanced-logs-context";
import { supabase, isSupabaseEnabled } from "@/lib/supabaseClient";

export type DailyInvestmentParams = {
  productName: string;
  amount: number;
  dailyRate: number;
  period: number;
  category: "staking" | "finance";
  stakingAsset?: string;
  stakingAmount?: number;
};

export type HourlyInvestmentParams = {
  productName: string;
  amount: number;
  durationHours: number;
  tiers: InvestmentTier[];
  category: "staking" | "finance";
};

export type BalanceRow = {
  asset: string;
  available_balance: number;
  frozen_balance: number;
};
export type TradeRow = SpotTrade | ContractTrade;

interface BalanceContextType {
  balances: { [key: string]: { available: number; frozen: number } };
  investments: Investment[];
  rewardLogs: RewardLog[];
  addDailyInvestment: (params: DailyInvestmentParams) => Promise<boolean>;
  addHourlyInvestment: (params: HourlyInvestmentParams) => Promise<boolean>;
  placeContractTrade: (
    trade: Pick<ContractTrade, "type" | "amount" | "period" | "profit_rate">,
    tradingPair: string
  ) => void;
  placeSpotTrade: (
    trade: Pick<SpotTrade, "type" | "amount" | "total" | "trading_pair">
  ) => void;
  isLoading: boolean;
  activeContractTrades: ContractTrade[];
  historicalTrades: (SpotTrade | ContractTrade)[];
  handleCheckIn: () => Promise<{
    success: boolean;
    reward: number;
    message?: string;
  }>;
  lastCheckInDate?: string;
  consecutiveCheckIns: number;
  creditReward: (params: {
    userId: string;
    amount: number;
    asset: string;
    type: RewardLog["type"];
    sourceId: string;
    description: string;
  }) => Promise<void>;
  adjustBalance: (
    userId: string,
    asset: string,
    amount: number,
    isFrozen?: boolean,
    isDebitFrozen?: boolean
  ) => Promise<void>;
}

const BalanceContext = createContext<BalanceContextType | undefined>(undefined);

export function BalanceProvider({ children }: { children: ReactNode }) {
  const { user, updateUser } = useSimpleAuth();
  const { getLatestPrice } = useEnhancedMarket();
  const { toast } = useToast();
  const { addLog } = useSimpleEnhancedLogs();

  const [balances, setBalances] = useState<{
    [key: string]: { available: number; frozen: number };
  }>({});
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [rewardLogs, setRewardLogs] = useState<RewardLog[]>([]);
  const [activeContractTrades, setActiveContractTrades] = useState<
    ContractTrade[]
  >([]);
  const [historicalTrades, setHistoricalTrades] = useState<
    (SpotTrade | ContractTrade)[]
  >([]);
  const [isLoading, setIsLoading] = useState(true);

  const [lastCheckInDate, setLastCheckInDate] = useState<string | undefined>();
  const [consecutiveCheckIns, setConsecutiveCheckIns] = useState(0);

  const fetchUserBalanceData = useCallback(async (userId: string) => {
    if (!isSupabaseEnabled) return;
    const { data, error } = await supabase
      .from("balances")
      .select("asset, available_balance, frozen_balance")
      .eq("user_id", userId);
    if (error) console.error("Error fetching balances:", error);
    else {
      const formattedBalances: {
        [key: string]: { available: number; frozen: number };
      } = {};
      (data as BalanceRow[] | undefined)?.forEach((b: BalanceRow) => {
        formattedBalances[b.asset] = {
          available: b.available_balance,
          frozen: b.frozen_balance,
        };
      });
      setBalances(formattedBalances);
    }
  }, []);

  const fetchUserTradeData = useCallback(async (userId: string) => {
    if (!isSupabaseEnabled) return;
    const { data, error } = await supabase
      .from("trades")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    if (error) console.error("Error fetching trades:", error);
    else {
      setActiveContractTrades(
        (data as TradeRow[] | undefined)?.filter(
          (t: TradeRow) => t.orderType === "contract" && t.status === "active"
        ) as ContractTrade[]
      );
      setHistoricalTrades(
        (data as TradeRow[] | undefined)?.filter(
          (t: TradeRow) => t.status !== "active"
        ) as (SpotTrade | ContractTrade)[]
      );
    }
  }, []);

  const fetchUserInvestmentData = useCallback(async (userId: string) => {
    if (!isSupabaseEnabled) return;
    const { data, error } = await supabase
      .from("investments")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    if (error) console.error("Error fetching investments:", error);
    else setInvestments(data as Investment[]);
  }, []);

  const fetchUserRewardLogs = useCallback(async (userId: string) => {
    if (!isSupabaseEnabled) return;
    const { data, error } = await supabase
      .from("reward_logs")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    if (error) console.error("Error fetching reward logs:", error);
    else setRewardLogs(data as RewardLog[]);
  }, []);

  const fetchUserCheckInStatus = useCallback(async (userId: string) => {
    if (!isSupabaseEnabled) return;
    
    const { data, error } = await supabase
      .from('daily_check_ins')
      .select('checked_in_at, streak_day')
      .eq('user_id', userId)
      .order('checked_in_at', { ascending: false })
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows found
        console.error("Error fetching user check-in status:", error);
        return;
    }

    if (!data) {
        setLastCheckInDate(undefined);
        setConsecutiveCheckIns(0);
        return;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const lastCheckIn = new Date(data.checked_in_at);
    lastCheckIn.setHours(0, 0, 0, 0);

    setLastCheckInDate(lastCheckIn.toISOString().split('T')[0]);

    const isToday = today.getTime() === lastCheckIn.getTime();
    if (isToday) {
        setConsecutiveCheckIns(data.streak_day);
        return;
    }

    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    const isYesterday = yesterday.getTime() === lastCheckIn.getTime();

    // If streak was 7, it resets. If last check-in was before yesterday, it resets.
    if (data.streak_day === 7 || !isYesterday) {
        setConsecutiveCheckIns(0);
    } else {
        // Last check-in was yesterday, and streak is not over.
        setConsecutiveCheckIns(data.streak_day);
    }
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
          fetchUserCheckInStatus(user.id), // Use new function
        ]);
      } else {
        // Clear data on logout
        setBalances({});
        setInvestments([]);
        setRewardLogs([]);
        setActiveContractTrades([]);
        setHistoricalTrades([]);
        setLastCheckInDate(undefined);
        setConsecutiveCheckIns(0);
      }
      setIsLoading(false);
    };
    loadAllData();
  }, [
    user,
    isSupabaseEnabled,
    fetchUserBalanceData,
    fetchUserTradeData,
    fetchUserInvestmentData,
    fetchUserRewardLogs,
    fetchUserCheckInStatus, // Add new function to dependency array
  ]);

  // Realtime Subscriptions
  useEffect(() => {
    if (!user || !isSupabaseEnabled) return;

    const handleBalanceChange = () => user && fetchUserBalanceData(user.id);
    const handleTradeChange = () => user && fetchUserTradeData(user.id);
    const handleInvestmentChange = () => user && fetchUserInvestmentData(user.id);
    const handleCheckInChange = () => {
        if (user) {
            fetchUserCheckInStatus(user.id);
            fetchUserBalanceData(user.id); // Also refresh balance after check-in
        }
    }

    const tradesChannel = supabase.channel(`trades-channel-${user.id}`).on('postgres_changes', { event: '*', schema: 'public', table: 'trades', filter: `user_id=eq.${user.id}`}, handleTradeChange).subscribe();
    const investmentsChannel = supabase.channel(`investments-channel-${user.id}`).on('postgres_changes', { event: '*', schema: 'public', table: 'investments', filter: `user_id=eq.${user.id}`}, handleInvestmentChange).subscribe();
    const balancesChannel = supabase.channel(`balances-channel-${user.id}`).on('postgres_changes', { event: '*', schema: 'public', table: 'balances', filter: `user_id=eq.${user.id}`}, handleBalanceChange).subscribe();
    
    // Subscribe to new daily_check_ins table
    const checkInChannel = supabase.channel(`check-in-channel-${user.id}`).on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'daily_check_ins', filter: `user_id=eq.${user.id}`}, handleCheckInChange).subscribe();

    return () => {
      supabase.removeChannel(tradesChannel);
      supabase.removeChannel(investmentsChannel);
      supabase.removeChannel(balancesChannel);
      supabase.removeChannel(checkInChannel); // Unsubscribe from new channel
    };
  }, [user, isSupabaseEnabled, fetchUserTradeData, fetchUserInvestmentData, fetchUserBalanceData, fetchUserCheckInStatus]);

  const adjustBalance = useCallback(
    async (
      userId: string,
      asset: string,
      amount: number,
      isFrozen: boolean = false,
      isDebitFrozen: boolean = false
    ) => {
      if (!isSupabaseEnabled) return;
      const { error } = await supabase.rpc("adjust_balance", {
        p_user_id: userId,
        p_asset: asset,
        p_amount: amount,
        p_is_frozen: isFrozen,
        p_is_debit_frozen: isDebitFrozen,
      });
      if (error) {
        console.error("Error adjusting balance:", error);
        if (user?.id === userId) {
          toast({
            variant: "destructive",
            title: "Balance Update Failed",
            description: error.message,
          });
        }
      } else {
        if (user?.id === userId) {
          fetchUserBalanceData(userId);
        }
      }
    },
    [toast, user?.id, fetchUserBalanceData]
  );

  const creditReward = useCallback(
    async (params: {
      userId: string;
      amount: number;
      asset: string;
      type: RewardLog["type"];
      sourceId: string;
      description: string;
    }) => {
      if (!isSupabaseEnabled) return;
      const { error } = await supabase.rpc("credit_reward", {
        p_user_id: params.userId,
        p_amount: params.amount,
        p_asset: params.asset,
        p_reward_type: params.type,
        p_source_id: params.sourceId,
        p_description: params.description,
      });
      if (error) {
        console.error("Error crediting reward:", error);
      }
    },
    []
  );

  const placeContractTrade = useCallback(
    async (
      trade: Pick<ContractTrade, "type" | "amount" | "period" | "profit_rate">,
      tradingPair: string
    ) => {
      if (!user || !isSupabaseEnabled) return;

      if (user.is_frozen) {
        toast({
          variant: "destructive",
          title: "Action Failed",
          description: "Your account is frozen.",
        });
        return;
      }

      const quoteAsset = tradingPair.split("/")[1];
      const currentPrice = getLatestPrice(tradingPair);

      if ((balances[quoteAsset]?.available || 0) < trade.amount) {
        toast({
          variant: "destructive",
          title: "下单失败",
          description: `可用 ${quoteAsset} 余额不足。`,
        });
        return;
      }

      const newTrade: Omit<ContractTrade, "id" | "created_at"> = {
        user_id: user.id,
        trading_pair: tradingPair,
        type: trade.type,
        amount: trade.amount,
        entry_price: currentPrice,
        settlement_time: new Date(
          Date.now() + trade.period * 1000
        ).toISOString(),
        period: trade.period,
        profit_rate: trade.profit_rate,
        status: "active",
        orderType: "contract",
      };

      const { data: insertedTrade, error } = await supabase
        .from("trades")
        .insert(newTrade)
        .select()
        .single();

      if (error || !insertedTrade) {
        console.error("Failed to place contract trade:", error);
        toast({
          variant: "destructive",
          title: "下单失败",
          description: "无法保存交易记录，请重试。",
        });
        return;
      }

      toast({ title: "下单成功", description: "您的合约订单已成功建立。" });
    },
    [user, balances, getLatestPrice, toast]
  );

  const placeSpotTrade = useCallback(
    async (
      trade: Pick<SpotTrade, "type" | "amount" | "total" | "trading_pair">
    ) => {
      if (!user || !isSupabaseEnabled) return;

      if (user.is_frozen) {
        toast({
          variant: "destructive",
          title: "Action Failed",
          description: "Your account is frozen.",
        });
        return;
      }

      const [baseAsset, quoteAsset] = trade.trading_pair.split("/");

      if (
        trade.type === "buy" &&
        (balances[quoteAsset]?.available || 0) < trade.total
      ) {
        toast({
          variant: "destructive",
          title: "下单失败",
          description: `可用 ${quoteAsset} 余额不足。`,
        });
        return;
      }
      if (
        trade.type === "sell" &&
        (balances[baseAsset]?.available || 0) < trade.amount
      ) {
        toast({
          variant: "destructive",
          title: "下单失败",
          description: `可用 ${baseAsset} 余额不足。`,
        });
        return;
      }

      const currentPrice = getLatestPrice(trade.trading_pair);
      const newTrade: Omit<SpotTrade, "id" | "created_at"> = {
        type: trade.type,
        amount: trade.amount,
        total: trade.total,
        price: currentPrice,
        user_id: user.id,
        trading_pair: trade.trading_pair,
        base_asset: baseAsset,
        quote_asset: quoteAsset,
        status: "filled",
        orderType: "spot",
      };

      const { data: insertedTrade, error } = await supabase
        .from("trades")
        .insert(newTrade)
        .select()
        .single();
      if (error || !insertedTrade) {
        console.error("Failed to place spot trade:", error);
        toast({
          variant: "destructive",
          title: "下单失败",
          description: "无法保存交易记录，请联系客服。",
        });
        return;
      }

      toast({ title: "交易成功", description: "您的币币交易已完成。" });
    },
    [user, balances, getLatestPrice, toast]
  );

  const addDailyInvestment = async (params: DailyInvestmentParams) => {
    if (!user || !isSupabaseEnabled) return false;

    const { error } = await supabase.rpc("create_daily_investment", {
      p_user_id: user.id,
      p_product_name: params.productName,
      p_amount: params.amount,
      p_daily_rate: params.dailyRate,
      p_period: params.period,
      p_category: "staking",
      p_staking_asset: params.stakingAsset,
      p_staking_amount: params.stakingAmount,
    });

    if (error) {
      console.error("Failed to add daily investment:", error);
      toast({
        variant: "destructive",
        title: "购买失败",
        description: error.message,
      });
      return false;
    }
    return true;
  };

  const addHourlyInvestment = async (params: HourlyInvestmentParams) => {
    if (!user || !isSupabaseEnabled) return false;

    const selectedTier = params.tiers.find(
      (t) => t.hours === params.durationHours
    );
    if (!selectedTier) return false;

    const { error } = await supabase.rpc("create_hourly_investment", {
      p_user_id: user.id,
      p_product_name: params.productName,
      p_amount: params.amount,
      p_duration_hours: params.durationHours,
      p_hourly_rate: selectedTier.rate,
    });

    if (error) {
      console.error("Failed to add hourly investment:", error);
      toast({
        variant: "destructive",
        title: "购买失败",
        description: error.message,
      });
      return false;
    }
    return true;
  };

  const handleCheckIn = async (): Promise<{
    success: boolean;
    reward: number;
    message?: string;
  }> => {
    if (!user) {
      return { success: false, reward: 0, message: "User not logged in." };
    }

    try {
        const response = await fetch('/api/rewards/check-in', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
        });

        const data = await response.json();

        if (!response.ok) {
            return { success: false, reward: 0, message: data.error || '签到失败，请稍后再试。' };
        }
        
        // On successful check-in, immediately refresh user's state
        fetchUserCheckInStatus(user.id);
        fetchUserBalanceData(user.id);

        return {
            success: data.success,
            reward: data.reward,
            message: data.message,
        };

    } catch (error: any) {
        console.error("Check-in API call failed:", error);
        return { success: false, reward: 0, message: '网络请求失败，请检查您的连接。' };
    }
  };

  const value: BalanceContextType = {
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
    handleCheckIn,
    lastCheckInDate,
    consecutiveCheckIns,
    creditReward,
    adjustBalance,
  };

  return (
    <BalanceContext.Provider value={value}>{children}</BalanceContext.Provider>
  );
}

export function useBalance() {
  const context = useContext(BalanceContext);
  if (context === undefined) {
    throw new Error("useBalance must be used within an BalanceProvider");
  }
  return context;
}
