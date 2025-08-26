

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
import { useTasks } from "@/context/tasks-context";

type InvestmentDialogProps = {
    isOpen: boolean;
    onOpenChange: (isOpen: boolean) => void;
    product: {
        name: string;
        minInvestment: number;
        maxInvestment: number;
    };
    balance: number;
    onConfirm: (amount: number) => void;
};

export function InvestmentDialog({ 
    isOpen, 
    onOpenChange, 
    product,
    balance,
    onConfirm 
}: InvestmentDialogProps) {
    const { toast } = useToast();
    const { triggerTaskCompletion } = useTasks();
    const [amount, setAmount] = useState("");
    const isFixedAmount = product.minInvestment === product.maxInvestment;


    useEffect(() => {
        if (isOpen) {
            setAmount(product.minInvestment.toString());
        }
    }, [isOpen, product.minInvestment])

    const handleConfirm = () => {
        const numericAmount = parseFloat(amount);
        if (!numericAmount || numericAmount <= 0) {
            toast({
                variant: "destructive",
                title: "无效金额",
                description: "请输入一个有效的投资金额。",
            });
            return;
        }
        if (numericAmount < product.minInvestment) {
             toast({
                variant: "destructive",
                title: "金额过低",
                description: `最低投资金额为 ${product.minInvestment} USDT。`,
            });
            return;
        }
        if (numericAmount > product.maxInvestment) {
             toast({
                variant: "destructive",
                title: "金额过高",
                description: `最高投资金额为 ${product.maxInvestment} USDT。`,
            });
            return;
        }
        if (numericAmount > balance) {
             toast({
                variant: "destructive",
                title: "余额不足",
                description: `您的可用余额不足。`,
            });
            return;
        }
        
        onConfirm(numericAmount);
        triggerTaskCompletion('investment');
    };

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>购买: {product.name}</DialogTitle>
                    <DialogDescription>
                       请确认您的购买。您的可用余额是 {balance.toFixed(2)} USDT。
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
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
                            placeholder={`最低 ${product.minInvestment}`}
                            disabled={isFixedAmount}
                        />
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
