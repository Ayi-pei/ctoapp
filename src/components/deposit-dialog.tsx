
"use client";

import { useState } from "react";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Copy, Send } from "lucide-react";
import { useAuth } from "@/context/auth-context";
import type { Transaction } from "@/types";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { supabase } from "@/lib/supabase";
import { useBalance } from "@/context/balance-context";


type DepositDialogProps = {
    isOpen: boolean;
    onOpenChange: (isOpen: boolean) => void;
};

export function DepositDialog({ isOpen, onOpenChange }: DepositDialogProps) {
    const { toast } = useToast();
    const { user } = useAuth();
    const { recalculateBalanceForUser } = useBalance();
    const walletAddress = "TAsimulatedAddressForU12345XYZ";
    const [amount, setAmount] = useState("");
    const [transactionHash, setTransactionHash] = useState("");

    const handleCopy = () => {
        navigator.clipboard.writeText(walletAddress);
        toast({
            title: "已复制",
            description: "钱包地址已复制到剪贴板。",
        });
    };

    const handleDepositRequest = async () => {
        if (!user) return;
        
        const numericAmount = parseFloat(amount);

        if (isNaN(numericAmount) || numericAmount <= 0) {
            toast({ variant: "destructive", title: "无效操作", description: "请输入有效的充值数量。" });
            return;
        }

        if (!transactionHash.trim()) {
            toast({ variant: "destructive", title: "无效操作", description: "请输入交易哈希/ID作为凭证。" });
            return;
        }

        const newTransaction: Omit<Transaction, 'id' | 'created_at' | 'createdAt'> = {
            user_id: user.id,
            type: 'deposit',
            asset: 'USDT',
            amount: numericAmount,
            status: 'pending',
            transaction_hash: transactionHash.trim(),
        };

        try {
            const { error } = await supabase.from('transactions').insert(newTransaction);
            if (error) throw error;
            
            toast({
                title: "充值请求已提交",
                description: "您的充值请求已发送给管理员审核，请耐心等待。",
            });

            if (user) {
                recalculateBalanceForUser(user.id);
            }
            
            // Reset state and close dialog
            setAmount("");
            setTransactionHash("");
            onOpenChange(false);

        } catch (error) {
            console.error("Failed to save transaction to Supabase", error);
            toast({ variant: "destructive", title: "错误", description: "无法提交请求，请重试。" });
        }
    }
    
    // Reset state when dialog is closed
    const onOpenChangeWrapper = (open: boolean) => {
        if(!open) {
            setAmount("");
            setTransactionHash("");
        }
        onOpenChange(open);
    }

    return (
        <AlertDialog open={isOpen} onOpenChange={onOpenChangeWrapper}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>充币 (USDT - TRC20)</AlertDialogTitle>
                    <AlertDialogDescription>
                       请向下方地址充值，然后填写您的充值金额和链上交易哈希/ID以供管理员审核。
                    </AlertDialogDescription>
                </AlertDialogHeader>
                
                <div className="my-2 p-3 bg-muted rounded-md text-center">
                    <p className="font-mono text-sm break-all">{walletAddress}</p>
                </div>
                <div className="flex justify-center">
                    <Button onClick={handleCopy} variant="outline" size="sm">
                        <Copy className="mr-2 h-4 w-4" />
                        复制地址
                    </Button>
                </div>

                <div className="space-y-4 pt-4">
                     <div className="space-y-2">
                        <Label htmlFor="deposit-amount">充值金额 (USDT)</Label>
                        <Input 
                            id="deposit-amount"
                            type="number"
                            placeholder="请输入您充值的USDT数量"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                        />
                     </div>
                     <div className="space-y-2">
                         <Label htmlFor="tx-hash">交易哈希/ID (凭证)</Label>
                        <Input 
                            id="tx-hash"
                            type="text"
                            placeholder="请输入链上交易哈希/ID"
                            value={transactionHash}
                            onChange={(e) => setTransactionHash(e.target.value)}
                        />
                     </div>
                </div>

                <AlertDialogFooter className="mt-4">
                    <Button onClick={() => onOpenChangeWrapper(false)} variant="ghost">取消</Button>
                    <Button onClick={handleDepositRequest} className="bg-blue-600 hover:bg-blue-700">
                        <Send className="mr-2 h-4 w-4" />
                        提交充值请求
                    </Button>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}
