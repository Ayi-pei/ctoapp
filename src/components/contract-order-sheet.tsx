
"use client";

import { useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
  SheetClose,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { X } from "lucide-react";
import { Trade } from "@/types";

type ContractOrderSheetProps = {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  orderType: 'buy' | 'sell';
  tradingPair: string;
  balance: number;
  onPlaceTrade: (trade: Omit<Trade, 'id' | 'time' | 'price'>) => void;
};

const periods = [
    { label: "30s", value: 30, rate: "100%" },
    { label: "60s", value: 60, rate: "15%" },
    { label: "300s", value: 300, rate: "20%" },
    { label: "3600s", value: 3600, rate: "30%" },
];

const amounts = [10, 20, 50, 100, 500, 1000, 2000];

export function ContractOrderSheet({
  isOpen,
  onOpenChange,
  orderType,
  tradingPair,
  balance,
  onPlaceTrade,
}: ContractOrderSheetProps) {
  const { toast } = useToast();
  const [selectedPeriod, setSelectedPeriod] = useState(periods[0].value);
  const [amount, setAmount] = useState("");
  
  const asset = tradingPair.split('/')[0];
  const orderTypeText = orderType === 'buy' ? "买涨" : "买跌";
  const orderTypeColor = orderType === 'buy' ? "text-green-500" : "text-red-500";

  const handleAmountClick = (value: number) => {
    setAmount(value.toString());
  };

  const handleConfirm = () => {
    const numericAmount = parseFloat(amount);
    if (!numericAmount || numericAmount <= 0) {
        toast({
            variant: "destructive",
            title: "下单失败",
            description: "请输入有效的买入量。",
        });
        return;
    }
     if (numericAmount > balance) {
        toast({
            variant: "destructive",
            title: "下单失败",
            description: "可用余额不足。",
        });
        return;
    }
    
    onPlaceTrade({ type: orderType, amount: numericAmount });

    toast({
        title: "下单成功",
        description: `您已成功下单 ${numericAmount} USDT 进行 ${orderTypeText}。`
    });
    
    setAmount("");
    onOpenChange(false);
  };


  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-lg">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2 text-lg">
            <span>{asset}</span>
            <span className={orderTypeColor}>{orderTypeText}</span>
          </SheetTitle>
        </SheetHeader>
        
        <div className="py-6 space-y-6">
            <div>
                <h4 className="text-sm font-medium mb-2">选择周期</h4>
                <div className="grid grid-cols-4 gap-2">
                    {periods.map(p => (
                        <Button
                            key={p.value}
                            variant={selectedPeriod === p.value ? "default" : "secondary"}
                            onClick={() => setSelectedPeriod(p.value)}
                            className="flex flex-col h-16"
                        >
                            <span>{p.label}</span>
                            <span className="text-xs">{p.rate}</span>
                        </Button>
                    ))}
                </div>
            </div>

            <div>
                <h4 className="text-sm font-medium mb-2">买入量</h4>
                <Input 
                    type="number"
                    placeholder="最少 1 USDT"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="mb-2"
                />
                <div className="grid grid-cols-4 gap-2">
                     {amounts.map(a => (
                        <Button
                            key={a}
                            variant="secondary"
                            onClick={() => handleAmountClick(a)}
                        >
                            {a}
                        </Button>
                    ))}
                </div>
            </div>
        </div>

        <SheetFooter className="flex-col space-y-4">
            <p className="text-sm text-muted-foreground text-center">
                可用余额: {balance.toFixed(2)} USDT
            </p>
          <Button onClick={handleConfirm} size="lg" className="w-full">确定</Button>
        </SheetFooter>
         <SheetClose className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-secondary">
          <X className="h-5 w-5" />
          <span className="sr-only">Close</span>
        </SheetClose>
      </SheetContent>
    </Sheet>
  );
}
