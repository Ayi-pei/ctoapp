
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { Trade } from "@/types";

type SpotOrderFormProps = {
  tradingPair: string;
  balance: number;
  onPlaceTrade: (trade: Omit<Trade, 'id' | 'time' | 'price'>) => void;
  baseAsset: string;
  quoteAsset: string;
  currentPrice: number;
};

export function SpotOrderForm({ 
    tradingPair, 
    balance, 
    onPlaceTrade, 
    baseAsset, 
    quoteAsset,
    currentPrice 
}: SpotOrderFormProps) {
  const [orderType, setOrderType] = useState<"buy" | "sell">("buy");
  const [tradeType, setTradeType] = useState("market");
  const [price, setPrice] = useState("");
  const [amount, setAmount] = useState("");
  const [total, setTotal] = useState("");
  const [sliderValue, setSliderValue] = useState(0);
  const { toast } = useToast();

  const handleSliderChange = (value: number[]) => {
    setSliderValue(value[0]);
    const newTotal = (balance * value[0]) / 100;
    setTotal(newTotal.toFixed(2));
    if (currentPrice > 0) {
        setAmount((newTotal / currentPrice).toFixed(6));
    }
  };

  const handleTotalChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const newTotal = e.target.value;
      setTotal(newTotal);
      if(balance > 0) {
        const percentage = (parseFloat(newTotal) / balance) * 100;
        setSliderValue(Math.min(100, Math.max(0, percentage)));
      }
       if (currentPrice > 0) {
        setAmount((parseFloat(newTotal) / currentPrice).toFixed(6));
    }
  }
  
  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const newAmount = e.target.value;
      setAmount(newAmount);
      const newTotal = parseFloat(newAmount) * currentPrice;
      setTotal(newTotal.toFixed(2));
      if(balance > 0) {
        const percentage = (newTotal / balance) * 100;
        setSliderValue(Math.min(100, Math.max(0, percentage)));
      }
  }


  const handleSubmit = () => {
    const numericAmount = parseFloat(amount);
    if (!numericAmount || numericAmount <= 0) {
      toast({
        variant: "destructive",
        title: "下单失败",
        description: "请输入有效的数量。",
      });
      return;
    }

    const numericTotal = parseFloat(total);
    if (orderType === 'buy' && numericTotal > balance) {
        toast({
            variant: "destructive",
            title: "下单失败",
            description: `可用余额不足 (${balance.toFixed(2)} ${quoteAsset})。`,
        });
        return;
    }
    
    // In a real app, you would also check base asset balance for selling
    
    onPlaceTrade({ type: orderType, amount: numericAmount });

    toast({
      title: "下单成功",
      description: `您的 ${tradeType === 'market' ? '市价' : '限价'} ${orderType === 'buy' ? '买入' : '卖出'} 订单已提交。`,
    });
    
    setAmount("");
    setTotal("");
    setPrice("");
    setSliderValue(0);
  };


  return (
    <Card>
      <CardContent className="p-4">
        <Tabs defaultValue="buy" onValueChange={(value) => setOrderType(value as "buy" | "sell")}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="buy" className="data-[state=active]:bg-green-600/80 data-[state=active]:text-white">买入</TabsTrigger>
            <TabsTrigger value="sell" className="data-[state=active]:bg-red-600/80 data-[state=active]:text-white">卖出</TabsTrigger>
          </TabsList>
          <div className="pt-4 space-y-4">
            <Select value={tradeType} onValueChange={setTradeType}>
                <SelectTrigger>
                    <SelectValue placeholder="选择订单类型" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="market">市价委托</SelectItem>
                    <SelectItem value="limit">限价委托</SelectItem>
                </SelectContent>
            </Select>

            <div className="space-y-1">
                <Label htmlFor="price">价格 ({quoteAsset})</Label>
                <Input 
                    id="price" 
                    placeholder={tradeType === 'market' ? '市价' : '请输入价格'}
                    disabled={tradeType === 'market'}
                    value={tradeType === 'market' ? '' : price}
                    onChange={(e) => setPrice(e.target.value)}
                />
            </div>
            
             <div className="space-y-1">
                <Label htmlFor="amount">数量 ({baseAsset})</Label>
                <Input 
                    id="amount" 
                    placeholder="请输入数量"
                    value={amount}
                    onChange={handleAmountChange}
                />
            </div>

            <Slider value={[sliderValue]} onValueChange={handleSliderChange} />
            <div className="flex justify-between text-xs text-muted-foreground">
                <span>0%</span>
                <span>25%</span>
                <span>50%</span>
                <span>75%</span>
                <span>100%</span>
            </div>

             <div className="space-y-1">
                <Label htmlFor="total">交易额 ({quoteAsset})</Label>
                <Input 
                    id="total" 
                    placeholder="请输入交易额"
                    value={total}
                    onChange={handleTotalChange}
                />
            </div>

            <div className="text-xs text-muted-foreground">
                可用: {balance.toFixed(2)} {quoteAsset}
            </div>

            <Button onClick={handleSubmit} className={cn("w-full text-white", orderType === 'buy' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700')}>
                {orderType === 'buy' ? `买入 ${baseAsset}` : `卖出 ${baseAsset}`}
            </Button>
          </div>
        </Tabs>
      </CardContent>
    </Card>
  );
}
