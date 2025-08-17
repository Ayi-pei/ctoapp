
"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useBalance } from "@/context/balance-context";
import { Clock, ListTodo, Trash2 } from "lucide-react";

type ScheduledTrade = {
    id: string;
    type: 'buy' | 'sell';
    amount: number;
    executionTime: Date;
    tradingPair: string;
    timeoutId: NodeJS.Timeout;
};

type AIAssistantProps = {
    tradingPair: string;
};

export function AIAssistant({ tradingPair }: AIAssistantProps) {
  const { toast } = useToast();
  const { placeContractTrade, balances } = useBalance();
  const quoteAsset = tradingPair.split('/')[1];

  const [amount, setAmount] = useState("");
  const [executionTime, setExecutionTime] = useState("");
  const [scheduledTrades, setScheduledTrades] = useState<ScheduledTrade[]>([]);

  useEffect(() => {
    // Cleanup timeouts when component unmounts
    return () => {
      scheduledTrades.forEach(trade => clearTimeout(trade.timeoutId));
    };
  }, [scheduledTrades]);

  const handleScheduleTrade = (type: 'buy' | 'sell') => {
    const numericAmount = parseFloat(amount);
    if (isNaN(numericAmount) || numericAmount <= 0) {
      toast({ variant: "destructive", title: "设置失败", description: "请输入有效的交易金额。" });
      return;
    }

    if (!executionTime) {
      toast({ variant: "destructive", title: "设置失败", description: "请选择一个有效的执行时间。" });
      return;
    }
    
    const executionDate = new Date(executionTime);
    if (executionDate <= new Date()) {
      toast({ variant: "destructive", title: "设置失败", description: "执行时间必须在未来。" });
      return;
    }

    if (numericAmount > (balances[quoteAsset]?.available || 0)) {
        toast({ variant: "destructive", title: "设置失败", description: `您的可用${quoteAsset}余额不足。` });
        return;
    }
    
    const timeUntilExecution = executionDate.getTime() - new Date().getTime();
    
    const timeoutId = setTimeout(() => {
        placeContractTrade({
            type: type,
            amount: numericAmount,
            period: 30, // Default period for scheduled trade
            profitRate: 0.85, // Default profit rate
        }, tradingPair);
        
        toast({
          title: "计划交易已执行",
          description: `您设置的 ${numericAmount} ${quoteAsset} ${type === 'buy' ? '买涨' : '买跌'} 计划已在 ${executionDate.toLocaleString()} 执行。`
        });

        setScheduledTrades(prev => prev.filter(t => t.id !== newTrade.id));

    }, timeUntilExecution);

    const newTrade: ScheduledTrade = {
        id: `trade-${Date.now()}`,
        type,
        amount: numericAmount,
        executionTime: executionDate,
        tradingPair,
        timeoutId
    };

    setScheduledTrades(prev => [...prev, newTrade]);

    toast({
        title: "计划交易已设置",
        description: `将在 ${executionDate.toLocaleString()} 为您执行一笔 ${type === 'buy' ? '买涨' : '买跌'} 交易。`
    });

    setAmount("");
    setExecutionTime("");
  };

  const cancelScheduledTrade = (tradeId: string) => {
    const tradeToCancel = scheduledTrades.find(t => t.id === tradeId);
    if (tradeToCancel) {
        clearTimeout(tradeToCancel.timeoutId);
        setScheduledTrades(prev => prev.filter(t => t.id !== tradeId));
        toast({ title: "已取消", description: "计划交易已成功取消。" });
    }
  }
  
  // Set default time to 5 minutes in the future
  const getdefaultTime = () => {
    const now = new Date();
    now.setMinutes(now.getMinutes() + 5);
    // Format for datetime-local input: YYYY-MM-DDTHH:mm
    const year = now.getFullYear();
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    const day = now.getDate().toString().padStart(2, '0');
    const hours = now.getHours().toString().padStart(2, '0');
    const minutes = now.getMinutes().toString().padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  }
  
  useEffect(() => {
      setExecutionTime(getdefaultTime());
  }, []);

  return (
    <Card>
        <CardHeader>
            <CardTitle>计划交易</CardTitle>
            <CardDescription>设定一个未来的精确时间点，系统将自动为您执行秒合约交易。</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
            <div>
                <Label htmlFor="trade-amount">交易金额 ({quoteAsset})</Label>
                <Input
                    id="trade-amount"
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder={`可用余额: ${(balances[quoteAsset]?.available || 0).toFixed(2)}`}
                />
            </div>
            <div>
                <Label htmlFor="execution-time">执行时间</Label>
                <Input
                    id="execution-time"
                    type="datetime-local"
                    value={executionTime}
                    onChange={(e) => setExecutionTime(e.target.value)}
                />
            </div>
            <div className="grid grid-cols-2 gap-4">
                 <Button onClick={() => handleScheduleTrade('buy')} className="bg-green-600 hover:bg-green-700">
                    <Clock className="mr-2 h-4 w-4" />
                    定时买涨
                </Button>
                <Button onClick={() => handleScheduleTrade('sell')} className="bg-red-600 hover:bg-red-700">
                    <Clock className="mr-2 h-4 w-4" />
                    定时买跌
                </Button>
            </div>
            {scheduledTrades.length > 0 && (
                <div className="pt-4 space-y-2">
                    <h4 className="font-semibold text-sm flex items-center gap-2"><ListTodo className="h-4 w-4" /> 待执行计划</h4>
                    <div className="p-2 border rounded-md max-h-40 overflow-y-auto space-y-2">
                        {scheduledTrades.map(trade => (
                            <div key={trade.id} className="flex items-center justify-between p-2 bg-muted/50 rounded-md text-sm">
                                <div>
                                    <p>
                                        <span className={`font-bold ${trade.type === 'buy' ? 'text-green-500' : 'text-red-500'}`}>
                                            {trade.type === 'buy' ? '买涨' : '买跌'}
                                        </span>
                                        <span className="ml-2">{trade.amount} {trade.tradingPair.split('/')[1]}</span>
                                    </p>
                                    <p className="text-xs text-muted-foreground">{trade.executionTime.toLocaleString()}</p>
                                </div>
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => cancelScheduledTrade(trade.id)}>
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </CardContent>
    </Card>
  );
}
