
"use client";

import { useState, useEffect } from "react";
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
import { useSettings } from "@/context/settings-context";

type ContractTradeParams = {
  type: 'buy' | 'sell';
  amount: number;
  period: number;
  profitRate: number;
}


type ContractOrderSheetProps = {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  orderType: 'buy' | 'sell';
  tradingPair: string;
  balance: number;
  onPlaceTrade: (trade: ContractTradeParams) => void;
};

const periods = [
    { label: "30s", value: 30 },
    { label: "60s", value: 60 },
    { label: "300s", value: 300 },
    { label: "3600s", value: 3600 },
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
  const { settings } = useSettings();
  const [selectedPeriod, setSelectedPeriod] = useState(periods[0]);
  const [amount, setAmount] = useState("");
  const [isConfirming, setIsConfirming] = useState(false);
  const [currentProfitRate, setCurrentProfitRate] = useState(0.85);

  const pairSettings = settings[tradingPair];
  
  useEffect(() => {
    if (!pairSettings) return;

    const now = new Date();
    const currentTime = now.getHours() * 60 + now.getMinutes();
    
    let activeProfitRate = pairSettings.baseProfitRate;
    let isInSpecialFrame = false;

    for (const frame of pairSettings.specialTimeFrames) {
        const [startH, startM] = frame.startTime.split(':').map(Number);
        const startTime = startH * 60 + startM;
        const [endH, endM] = frame.endTime.split(':').map(Number);
        const endTime = endH * 60 + endM;
        
        if (currentTime >= startTime && currentTime <= endTime) {
            activeProfitRate = frame.profitRate;
            isInSpecialFrame = true;
            break; 
        }
    }

    if (pairSettings.tradingDisabled && !isInSpecialFrame) {
      // If limited trading is on AND we are outside a special frame,
      // the profit rate doesn't matter as much, but we can reflect the base.
      setCurrentProfitRate(pairSettings.baseProfitRate);
    } else {
      setCurrentProfitRate(activeProfitRate);
    }

  }, [pairSettings, isOpen]); // Rerun when settings change or dialog opens


  const asset = tradingPair.split('/')[0];
  const orderTypeText = orderType === 'buy' ? "买涨" : "买跌";
  const orderTypeColor = orderType === 'buy' ? "text-green-500" : "text-red-500";

  const handleAmountClick = (value: number) => {
    setAmount(value.toString());
  };

  const handleInitialConfirm = () => {
    // Check for trading restrictions
    if (pairSettings?.tradingDisabled) {
        const now = new Date();
        const currentTime = now.getHours() * 60 + now.getMinutes();
        
        const isInSpecialFrame = pairSettings.specialTimeFrames.some(frame => {
            const [startH, startM] = frame.startTime.split(':').map(Number);
            const startTime = startH * 60 + startM;
            const [endH, endM] = frame.endTime.split(':').map(Number);
            const endTime = endH * 60 + endM;
            return currentTime >= startTime && currentTime <= endTime;
        });

        // If trading is generally disabled, it's only allowed INSIDE special frames.
        // So, if trading is disabled AND we are NOT in a special frame, block the trade.
        if (!isInSpecialFrame) {
             toast({
                variant: "destructive",
                title: "交易受限",
                description: "该币种当前不在可交易时间段内。",
            });
            return;
        }
    }

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
    setIsConfirming(true);
  };
  
  const handleFinalConfirm = () => {
    const numericAmount = parseFloat(amount);
    onPlaceTrade({ 
        type: orderType, 
        amount: numericAmount,
        period: selectedPeriod.value,
        profitRate: currentProfitRate,
    });

    toast({
        title: "下单成功",
        description: `您已成功下单 ${numericAmount} USDT 进行 ${orderTypeText}。`
    });
    
    resetState();
  };

  const resetState = () => {
    setAmount("");
    setSelectedPeriod(periods[0]);
    setIsConfirming(false);
    onOpenChange(false);
  }

  const handleBack = () => {
    setIsConfirming(false);
  }

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      resetState();
    }
    onOpenChange(open);
  }
  
  const renderConfirmationView = () => (
    <>
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2 text-lg">
            <span>订单确认</span>
          </SheetTitle>
        </SheetHeader>
        <div className="py-6 space-y-4 text-sm">
            <div className="flex justify-between">
                <span className="text-muted-foreground">订单类型</span>
                <span className={cn("font-semibold", orderTypeColor)}>{asset} {orderTypeText}</span>
            </div>
            <div className="flex justify-between">
                <span className="text-muted-foreground">买入量</span>
                <span className="font-semibold">{amount} USDT</span>
            </div>
            <div className="flex justify-between">
                <span className="text-muted-foreground">周期</span>
                <span className="font-semibold">{selectedPeriod.label}</span>
            </div>
            <div className="flex justify-between">
                <span className="text-muted-foreground">预估收益</span>
                <span className="font-semibold text-green-500">{(parseFloat(amount) * currentProfitRate).toFixed(2)} USDT ({(currentProfitRate * 100).toFixed(0)}%)</span>
            </div>
        </div>
        <SheetFooter className="flex-col space-y-4">
            <Button onClick={handleFinalConfirm} size="lg" className="w-full">确定</Button>
            <Button onClick={handleBack} variant="outline" size="lg" className="w-full">返回</Button>
        </SheetFooter>
    </>
  );

  const renderOrderCreationView = () => (
    <>
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
                          variant={selectedPeriod.value === p.value ? "default" : "secondary"}
                          onClick={() => setSelectedPeriod(p)}
                          className="flex flex-col h-16"
                      >
                          <span>{p.label}</span>
                          <span className="text-xs text-green-400">+{(currentProfitRate*100).toFixed(0)}%</span>
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
        <Button onClick={handleInitialConfirm} size="lg" className="w-full">确定</Button>
      </SheetFooter>
    </>
  );


  return (
    <Sheet open={isOpen} onOpenChange={handleOpenChange}>
      <SheetContent side="bottom" className="rounded-t-lg">
        {isConfirming ? renderConfirmationView() : renderOrderCreationView()}
         <SheetClose className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-secondary">
          <X className="h-5 w-5" />
          <span className="sr-only">Close</span>
        </SheetClose>
      </SheetContent>
    </Sheet>
  );
}
