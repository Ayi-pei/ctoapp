
"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode, useRef } from 'react';
import useTrades from '@/hooks/useTrades';
import { useBalance } from '@/context/balance-context';
import { useToast } from '@/hooks/use-toast';

// Type definitions
type TradeRaw = { price: number; quantity: number; time: number };
type OHLC = { open: number; high: number; low: number; close: number; time: number };

// Context Type
interface TradeDataContextType {
  displayedTrades: Record<string, TradeRaw>;
  klineData: Record<string, OHLC[]>;
  handleTrade: (type: 'buy' | 'sell', stream: string, amount: number) => void;
}

const TradeDataContext = createContext<TradeDataContextType | undefined>(undefined);

// Provider Component
export function TradeDataProvider({ children }: { children: ReactNode }) {
  const tradesMap = useTrades();
  const { placeContractTrade, balances } = useBalance();
  const { toast } = useToast();

  const [displayedTrades, setDisplayedTrades] = useState<Record<string, TradeRaw>>({});
  const [klineData, setKlineData] = useState<Record<string, OHLC[]>>({});
  
  useEffect(() => {
    setDisplayedTrades(tradesMap)
  }, [tradesMap]);
  
  const handleTrade = (type: 'buy' | 'sell', stream: string, amount: number) => {
    const fullStreamName = `${stream.toLowerCase()}@trade`;
    const candles = klineData[fullStreamName];
    const price = candles?.length ? candles[candles.length - 1].close : displayedTrades[fullStreamName]?.price;

    if (!price) {
      toast({ variant: "destructive", title: "交易失败", description: "未能获取当前交易对价格。" });
      return;
    }
    const quoteAsset = 'USDT';
    if (balances[quoteAsset]?.available < (amount * price)) {
      toast({ variant: "destructive", title: "交易失败", description: `${quoteAsset} 余额不足。` });
      return;
    }

    placeContractTrade({
        type: type,
        amount: amount * price, // Pass total cost for contract trade
        period: 30, // Default to 30s contract trade
        profitRate: 0.85,
    }, `${stream.toUpperCase()}/USDT`);

    toast({
        title: "交易成功",
        description: `${type === 'buy' ? '买入' : '卖出'} ${amount} ${stream} @ ${price.toFixed(2)}`
    });
  };

  const value = {
    displayedTrades,
    klineData,
    handleTrade,
  };

  return (
    <TradeDataContext.Provider value={value}>
      {children}
    </TradeDataContext.Provider>
  );
}

// Custom Hook
export function useTradeData() {
  const context = useContext(TradeDataContext);
  if (context === undefined) {
    throw new Error('useTradeData must be used within a TradeDataProvider');
  }
  return context;
}
