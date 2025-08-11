
"use client";

import { useState } from "react";
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

type WithdrawDialogProps = {
    isOpen: boolean;
    onOpenChange: (isOpen: boolean) => void;
};

export function WithdrawDialog({ isOpen, onOpenChange }: WithdrawDialogProps) {
    const { toast } = useToast();
    const { user } = useAuth();
    const { balances, freezeBalance } = useBalance();
    const [address, setAddress] = useState("");
    const [amount, setAmount] = useState("");

    const handleWithdraw = () => {
        const numericAmount = parseFloat(amount);
        if (!address || !numericAmount || numericAmount <= 0) {
            toast({
                variant: "destructive",
                title: "提币失败",
                description: "请输入有效的地址和金额。",
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
            address: address,
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
            setAddress("");
            setAmount("");
            onOpenChange(false);
        } catch (error) {
             console.error("Failed to save transaction to localStorage", error);
            toast({ variant: "destructive", title: "错误", description: "无法提交请求，请重试。" });
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>提币 (USDT)</DialogTitle>
                    <DialogDescription>
                        输入您要提币到的地址和金额。您的请求将由管理员审核。可用余额: {(balances['USDT']?.available || 0).toFixed(2)} USDT
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="address" className="text-right">
                            地址
                        </Label>
                        <Input
                            id="address"
                            value={address}
                            onChange={(e) => setAddress(e.target.value)}
                            className="col-span-3"
                            placeholder="请输入提币地址"
                        />
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
