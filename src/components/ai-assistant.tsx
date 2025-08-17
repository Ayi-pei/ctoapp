
"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { PriceDataPoint } from "@/types";
import { Play, Square, Bot, Activity } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useBalance } from "@/context/balance-context";

type AIAssistantProps = {
    priceHistory: PriceDataPoint[];
    tradingPair: string;
};

// Simple automated trading strategy logic
const decideTrade = (priceHistory: PriceDataPoint[]): 'buy' | 'sell' | null => {
    if (priceHistory.length < 5) {
        return null; // Not enough data
    }
    const recentPrices = priceHistory.slice(-5).map(p => p.price);
    const startPrice = recentPrices[0];
    const endPrice = recentPrices[4];

    if (endPrice > startPrice) {
        return 'buy'; // Trend is up
    } else if (endPrice < startPrice) {
        return 'sell'; // Trend is down
    }
    return null; // No clear trend
};


export function AIAssistant({ priceHistory, tradingPair }: AIAssistantProps) {
  const [isAutoTrading, setIsAutoTrading] = useState(false);
  const [status, setStatus] = useState("未运行");
  const { toast } = useToast();
  const { placeContractTrade, balances } = useBalance();
  const quoteAsset = tradingPair.split('/')[1];

  const tradeIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const executeAutoTrade = useCallback(() => {
    setStatus("正在分析市场...");
    const decision = decideTrade(priceHistory);
    
    if (decision) {
        const tradeAmount = 10; // Fixed amount for auto-trade for now
        if ((balances[quoteAsset]?.available || 0) < tradeAmount) {
            setStatus(`余额不足，无法执行交易。`);
            setIsAutoTrading(false);
            if(tradeIntervalRef.current) clearInterval(tradeIntervalRef.current);
            return;
        }

        placeContractTrade({
            type: decision,
            amount: tradeAmount, // Example: trade 10 USDT each time
            period: 30, // Example: 30s contracts
            profitRate: 0.85, // Example: 85% profit rate
        }, tradingPair);
        
        setStatus(`趋势分析: ${decision === 'buy' ? '看涨' : '看跌'}。已自动下单 ${tradeAmount} ${quoteAsset}。`);
    } else {
        setStatus("无明显交易信号，跳过此次操作。");
    }
  }, [priceHistory, placeContractTrade, tradingPair, balances, quoteAsset]);


  useEffect(() => {
    if (isAutoTrading) {
      setStatus("自动交易已启动，等待下一个决策点...");
      tradeIntervalRef.current = setInterval(() => {
        executeAutoTrade();
      }, 10000); // Trade every 10 seconds
    } else {
      if (tradeIntervalRef.current) {
        clearInterval(tradeIntervalRef.current);
        tradeIntervalRef.current = null;
      }
      setStatus("未运行");
    }

    return () => {
      if (tradeIntervalRef.current) {
        clearInterval(tradeIntervalRef.current);
      }
    };
  }, [isAutoTrading, executeAutoTrade]);

  const handleStart = () => {
    toast({ title: "启动成功", description: "AI自动交易已启动。" });
    setIsAutoTrading(true);
  }

  const handleStop = () => {
     toast({ title: "已停止", description: "AI自动交易已停止。" });
    setIsAutoTrading(false);
  }

  return (
    <Card>
        <CardHeader>
            <CardTitle>AI 交易助手 (自动策略)</CardTitle>
            <CardDescription>启动后，系统将根据K线趋势自动执行秒合约交易。</CardDescription>
        </CardHeader>
        <CardContent>
            <div className="grid grid-cols-2 gap-4">
                 <Button onClick={handleStart} disabled={isAutoTrading}>
                    <Play className="mr-2 h-4 w-4" />
                    开始自动交易
                </Button>
                <Button onClick={handleStop} disabled={!isAutoTrading} variant="destructive">
                    <Square className="mr-2 h-4 w-4" />
                    停止自动交易
                </Button>
            </div>
            <div className="mt-4 p-3 bg-muted rounded-md text-sm text-center">
                <p className="flex items-center justify-center gap-2">
                    <Activity className="h-4 w-4" />
                    <span className="font-semibold">当前状态:</span>
                    <span className="text-muted-foreground">{status}</span>
                </p>
            </div>
        </CardContent>
    </Card>
  );
}
