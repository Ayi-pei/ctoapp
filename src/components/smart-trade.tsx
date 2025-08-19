"use client";

import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useBalance } from "@/context/balance-context";
import { Clock, ListTodo, Trash2 } from "lucide-react";
import { useSettings } from "@/context/settings-context";
import { useMarket } from "@/context/market-data-context";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { availablePairs as allAvailablePairs } from "@/types"; // Renamed to avoid conflict

type ScheduledTrade = {
    id: string;
    type: 'buy' | 'sell';
    quantity: number; 
    amountInQuote: number; 
    executionTime: Date;
    tradingPair: string;
    timeoutId: NodeJS.Timeout;
};

type SmartTradeProps = {
    tradingPair: string;
};

export function SmartTrade({ tradingPair: initialTradingPair }: SmartTradeProps) {
  const { toast } = useToast();
  const { balances, placeContractTrade } = useBalance();
  const { settings } = useSettings();
  const { summaryData } = useMarket();

  const marketData = useMemo(() => {
    return summaryData.reduce((acc: any, curr: any) => {
        acc[curr.pair] = { price: curr.price };
        return acc;
    }, {});
  }, [summaryData]);

  const [selectedPair, setSelectedPair] = useState(initialTradingPair);
  const [quantity, setQuantity] = useState("");
  const [executionTime, setExecutionTime] = useState("");
  const [scheduledTrades, setScheduledTrades] = useState<ScheduledTrade[]>([]);

  const availablePairs = Object.keys(settings);
  const baseAsset = selectedPair.split('/')[0];
  const quoteAsset = selectedPair.split('/')[1];
  const pairSettings = settings[selectedPair];

  useEffect(() => {
    // Cleanup timeouts when component unmounts
    return () => {
      scheduledTrades.forEach(trade => clearTimeout(trade.timeoutId));
    };
  }, [scheduledTrades]);
  
  // Reset quantity when pair changes
  useEffect(() => {
    setQuantity("");
  }, [selectedPair]);

  const getdefaultTime = () => {
    const now = new Date();
    now.setMinutes(now.getMinutes() + 5);
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  }
  
  useEffect(() => {
      setExecutionTime(getdefaultTime());
  }, []);

  const handleScheduleTrade = (type: 'buy' | 'sell') => {
    const numericQuantity = parseFloat(quantity);
    if (isNaN(numericQuantity) || numericQuantity <= 0) {
      toast({ variant: "destructive", title: "设置失败", description: "请输入有效的交易数量。" });
      return;
    }

    const currentPrice = marketData[selectedPair]?.price;
    if (!currentPrice) {
        toast({ variant: "destructive", title: "设置失败", description: "无法获取当前市场价格，请稍后再试。" });
        return;
    }

    const amountInQuoteAsset = numericQuantity * currentPrice;

    if (amountInQuoteAsset > (balances[quoteAsset]?.available || 0)) {
        toast({ 
            variant: "destructive", 
            title: "余额不足", 
            description: `预估需要 ${amountInQuoteAsset.toFixed(2)} ${quoteAsset}，但您的可用余额不足。` 
        });
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

    const timeUntilExecution = executionDate.getTime() - new Date().getTime();
    
    const timeoutId = setTimeout(() => {
        const defaultPeriod = 30;
        const profitRate = pairSettings?.baseProfitRate || 0.85;

        // Re-fetch the latest price at execution time for more accuracy
        const latestPriceOnExecution = marketData[selectedPair]?.price || currentPrice;
        const finalAmountInQuote = numericQuantity * latestPriceOnExecution;

        placeContractTrade({
            type,
            amount: finalAmountInQuote, // Use the more current amount
            period: defaultPeriod,
            profitRate: profitRate
        }, selectedPair);
        
        toast({
          title: "智能交易已执行",
          description: `您设置的 ${numericQuantity} ${baseAsset} ${type === 'buy' ? '买涨' : '买跌'} 计划已在 ${executionDate.toLocaleString()} 成功下单。`
        });

        setScheduledTrades(prev => prev.filter(t => t.timeoutId !== timeoutId));

    }, timeUntilExecution);

    const newTrade: ScheduledTrade = {
        id: `trade-${Date.now()}`,
        type,
        quantity: numericQuantity,
        amountInQuote: amountInQuoteAsset,
        executionTime: executionDate,
        tradingPair: selectedPair,
        timeoutId
    };

    setScheduledTrades(prev => [...prev, newTrade]);

    toast({
        title: "智能交易已设置",
        description: `将在 ${executionDate.toLocaleString()} 为您执行一笔 ${type === 'buy' ? '买涨' : '买跌'} 交易。`
    });

    setQuantity("");
    setExecutionTime(getdefaultTime());
  };

  const cancelScheduledTrade = (tradeId: string) => {
    const tradeToCancel = scheduledTrades.find(t => t.id === tradeId);
    if (tradeToCancel) {
        clearTimeout(tradeToCancel.timeoutId);
        setScheduledTrades(prev => prev.filter(t => t.id !== tradeId));
        toast({ title: "已取消", description: "计划交易已成功取消。" });
    }
  }

  return (
    <Card className="bg-card/50">
        <CardHeader>
            <CardTitle>智能交易</CardTitle>
            <CardDescription>在24小时内预设币种、数量及时间，系统将自动执行买入或卖出操作。</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
             <div>
                <Label htmlFor="trade-pair">交易币种</Label>
                 <Select value={selectedPair} onValueChange={setSelectedPair}>
                    <SelectTrigger>
                        <SelectValue placeholder="选择一个交易对" />
                    </SelectTrigger>
                    <SelectContent>
                        {allAvailablePairs.map(pair => (
                            <SelectItem key={pair} value={pair}>{pair}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
            <div>
                <Label htmlFor="trade-quantity">交易数量 ({baseAsset})</Label>
                <Input
                    id="trade-quantity"
                    type="number"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    placeholder={`可用余额: ${(balances[quoteAsset]?.available || 0).toFixed(2)} ${quoteAsset}`}
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
                 <Button onClick={() => handleScheduleTrade('buy')} className="bg-green-600/60 hover:bg-green-700">
                    <Clock className="mr-2 h-4 w-4" />
                    智投预购
                </Button>
                <Button onClick={() => handleScheduleTrade('sell')} className="bg-red-600/60 hover:bg-red-700">
                    <Clock className="mr-2 h-4 w-4" />
                    审时抛售
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
                                        <span className="ml-2 font-mono">{trade.quantity} {trade.tradingPair.split('/')[0]}</span>
                                        <span className="ml-1 text-xs text-muted-foreground">
                                            (≈{trade.amountInQuote.toFixed(2)} {trade.tradingPair.split('/')[1]})
                                        </span>
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
