
"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { InvestmentProduct } from "@/context/investment-settings-context";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { cn } from "@/lib/utils";

type HourlyInvestmentDialogProps = {
    isOpen: boolean;
    onOpenChange: (isOpen: boolean) => void;
    product: InvestmentProduct;
    balance: number;
    onConfirm: (amount: number, duration: number) => void;
};

export function HourlyInvestmentDialog({ 
    isOpen, 
    onOpenChange, 
    product,
    balance,
    onConfirm 
}: HourlyInvestmentDialogProps) {
    const { toast } = useToast();
    const [amount, setAmount] = useState("");
    const [selectedDuration, setSelectedDuration] = useState<number | undefined>(product.hourlyTiers?.[0]?.hours);

    useEffect(() => {
        if (isOpen) {
            setAmount("");
            setSelectedDuration(product.hourlyTiers?.[0]?.hours);
        }
    }, [isOpen, product.hourlyTiers]);

    const handleConfirm = () => {
        const numericAmount = parseFloat(amount);
        
        const now = new Date();
        const currentHour = now.getHours();
        
        const [startHour] = (product.activeStartTime || "00:00").split(':').map(Number);
        const [endHour] = (product.activeEndTime || "00:00").split(':').map(Number);
        
        const isActive = startHour > endHour 
            ? (currentHour >= startHour || currentHour < endHour) // Overnight case e.g. 18:00 - 06:00
            : (currentHour >= startHour && currentHour < endHour); // Same day case
            
        if (!isActive) {
             toast({
                variant: "destructive",
                title: "非开放时间",
                description: `此产品仅在 ${product.activeStartTime} - ${product.activeEndTime} 期间开放购买。`,
            });
            return;
        }

        if (!selectedDuration) {
            toast({ variant: "destructive", title: "无效操作", description: "请选择一个投资时长。" });
            return;
        }

        if (!numericAmount || numericAmount <= 0) {
            toast({ variant: "destructive", title: "无效金额", description: "请输入一个有效的投资金额。" });
            return;
        }
        
        if (numericAmount < product.price) {
             toast({ variant: "destructive", title: "金额过低", description: `最低投资金额为 ${product.price} USDT。` });
            return;
        }
       
        if (numericAmount > balance) {
             toast({ variant: "destructive", title: "余额不足", description: `您的可用余额不足。` });
            return;
        }
        
        onConfirm(numericAmount, selectedDuration);
    };
    
    const expectedProfit = () => {
        if (!selectedDuration || !amount) return "0.00";
        const tier = product.hourlyTiers?.find(t => t.hours === selectedDuration);
        if (!tier) return "0.00";
        return (parseFloat(amount) * tier.rate).toFixed(2);
    }

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>购买: {product.name}</DialogTitle>
                    <DialogDescription>
                       请选择投资时长并输入金额。您的可用余额是 {balance.toFixed(2)} USDT。
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label className="text-right">
                           投资时长
                        </Label>
                        <div className="col-span-3">
                             <RadioGroup
                                value={selectedDuration?.toString()}
                                onValueChange={(value) => setSelectedDuration(parseInt(value))}
                                className="flex space-x-2"
                             >
                                 {product.hourlyTiers?.map(tier => (
                                     <Label
                                        key={tier.hours}
                                        htmlFor={`tier-${tier.hours}`}
                                        className={cn(
                                            "flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-3 hover:bg-accent hover:text-accent-foreground cursor-pointer",
                                            selectedDuration === tier.hours && "border-primary"
                                        )}
                                    >
                                         <RadioGroupItem value={tier.hours.toString()} id={`tier-${tier.hours}`} className="sr-only" />
                                         <span className="font-bold">{tier.hours} 小时</span>
                                         <span className="text-xs text-green-500">+{(tier.rate * 100).toFixed(1)}%</span>
                                     </Label>
                                 ))}
                            </RadioGroup>
                        </div>
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="amount" className="text-right">
                            金额 (USDT)
                        </Label>
                        <Input
                            id="amount"
                            type="number"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            className="col-span-3"
                            placeholder={`最低 ${product.price}`}
                        />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label className="text-right">
                            预计收益
                        </Label>
                        <div className="col-span-3 font-semibold text-green-500">
                           {expectedProfit()} USDT
                        </div>
                    </div>
                </div>
                <DialogFooter>
                     <DialogClose asChild>
                        <Button type="button" variant="secondary">
                            取消
                        </Button>
                    </DialogClose>
                    <Button type="button" onClick={handleConfirm}>确定购买</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
