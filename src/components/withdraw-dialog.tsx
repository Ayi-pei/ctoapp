
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
import { useAuth } from "@/context/auth-context";
import { Transaction } from "@/types";
import { useBalance } from "@/context/balance-context";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { WithdrawalAddress } from "@/app/profile/payment/page";

type WithdrawDialogProps = {
    isOpen: boolean;
    onOpenChange: (isOpen: boolean) => void;
};

export function WithdrawDialog({ isOpen, onOpenChange }: WithdrawDialogProps) {
    const { toast } = useToast();
    const { user } = useAuth();
    const { balances, freezeBalance } = useBalance();
    const [selectedAddress, setSelectedAddress] = useState("");
    const [amount, setAmount] = useState("");
    const [savedAddresses, setSavedAddresses] = useState<WithdrawalAddress[]>([]);

    useEffect(() => {
        if (user && isOpen) {
            try {
                const storedAddresses = localStorage.getItem(`withdrawalAddresses_${user.username}`);
                if (storedAddresses) {
                    setSavedAddresses(JSON.parse(storedAddresses));
                }
            } catch (error) {
                console.error("Failed to load addresses from localStorage", error);
                setSavedAddresses([]);
            }
        }
    }, [user, isOpen]);


    const handleWithdraw = () => {
        const numericAmount = parseFloat(amount);
        if (!selectedAddress || !numericAmount || numericAmount <= 0) {
            toast({
                variant: "destructive",
                title: "提币失败",
                description: "请选择一个地址并输入有效的金额。",
            });
            return;
        }

        if (numericAmount > (balances['USDT']?.available || 0)) {
            toast({
                variant: "destructive",
                title: "提币失败",
                description: "您的USDT可用余额不足。",
            });
            return;
        }

        if (!user) return;

        const newTransaction: Transaction = {
            id: `txn_${Date.now()}`,
            userId: user.username,
            type: 'withdrawal',
            asset: 'USDT',
            amount: numericAmount,
            address: selectedAddress,
            status: 'pending',
            createdAt: new Date().toISOString(),
        };

        try {
            // First, freeze the balance
            freezeBalance('USDT', numericAmount);
            
            // Then, add the transaction request
            const existingTransactions = JSON.parse(localStorage.getItem('transactions') || '[]') as Transaction[];
            existingTransactions.push(newTransaction);
            localStorage.setItem('transactions', JSON.stringify(existingTransactions));

            toast({
                title: "提币请求已提交",
                description: `您的 ${amount} USDT 提币请求已发送给管理员审核。`,
            });
            setSelectedAddress("");
            setAmount("");
            onOpenChange(false);
        } catch (error) {
             console.error("Failed to save transaction to localStorage", error);
            toast({ variant: "destructive", title: "错误", description: "无法提交请求，请重试。" });
        }
    };
    
    const handleOpenChange = (open: boolean) => {
        if (!open) {
            setSelectedAddress("");
            setAmount("");
        }
        onOpenChange(open);
    }

    return (
        <Dialog open={isOpen} onOpenChange={handleOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>提币 (USDT)</DialogTitle>
                    <DialogDescription>
                        选择您的提现地址并输入金额。您的请求将由管理员审核。可用余额: {(balances['USDT']?.available || 0).toFixed(2)} USDT
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="address" className="text-right">
                            地址
                        </Label>
                        <div className="col-span-3">
                             <Select value={selectedAddress} onValueChange={setSelectedAddress}>
                                <SelectTrigger>
                                    <SelectValue placeholder="选择一个已保存的地址" />
                                </SelectTrigger>
                                <SelectContent>
                                    {savedAddresses.map((addr) => (
                                        <SelectItem key={addr.id} value={addr.address}>
                                            <div className="flex flex-col">
                                                <span className="font-medium">{addr.name}</span>
                                                <span className="text-xs text-muted-foreground">{addr.address}</span>
                                            </div>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="amount" className="text-right">
                            金额
                        </Label>
                        <Input
                            id="amount"
                            type="number"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            className="col-span-3"
                            placeholder="请输入提币金额"
                        />
                    </div>
                </div>
                <DialogFooter>
                     <DialogClose asChild>
                        <Button type="button" variant="secondary">
                            取消
                        </Button>
                    </DialogClose>
                    <Button type="button" onClick={handleWithdraw}>确定</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
