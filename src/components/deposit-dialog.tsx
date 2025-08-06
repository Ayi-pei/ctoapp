
"use client";

import {
  AlertDialog,
  AlertDialogAction,
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
import { Transaction } from "@/types";

type DepositDialogProps = {
    isOpen: boolean;
    onOpenChange: (isOpen: boolean) => void;
};

export function DepositDialog({ isOpen, onOpenChange }: DepositDialogProps) {
    const { toast } = useToast();
    const { user } = useAuth();
    const walletAddress = "TAsimulatedAddressForU12345XYZ";

    const handleCopy = () => {
        navigator.clipboard.writeText(walletAddress);
        toast({
            title: "已复制",
            description: "钱包地址已复制到剪贴板。",
        });
    };

    const handleDepositRequest = () => {
        if (!user) return;

        // In a real app, this would be triggered by a webhook from the payment processor
        // Here, we simulate it with a button.
        const amount = parseFloat(prompt("模拟操作：请输入您已充值的USDT数量：", "1000") || "0");
        if (isNaN(amount) || amount <= 0) {
            toast({ variant: "destructive", title: "无效操作", description: "请输入有效的数量。" });
            return;
        }

        const newTransaction: Transaction = {
            id: `txn_${Date.now()}`,
            userId: user.username,
            type: 'deposit',
            asset: 'USDT',
            amount: amount,
            status: 'pending',
            createdAt: new Date().toISOString(),
        };

        try {
            const existingTransactions = JSON.parse(localStorage.getItem('transactions') || '[]') as Transaction[];
            existingTransactions.push(newTransaction);
            localStorage.setItem('transactions', JSON.stringify(existingTransactions));
            
            toast({
                title: "充值请求已提交",
                description: "您的充值请求已发送给管理员审核，请耐心等待。",
            });
            onOpenChange(false);

        } catch (error) {
            console.error("Failed to save transaction to localStorage", error);
            toast({ variant: "destructive", title: "错误", description: "无法提交请求，请重试。" });
        }
    }

    return (
        <AlertDialog open={isOpen} onOpenChange={onOpenChange}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>充币 (USDT - TRC20)</AlertDialogTitle>
                    <AlertDialogDescription>
                       这是一个模拟的充币地址。请不要向此地址发送任何真实资金。复制地址后，请使用下面的按钮提交您的充值请求以供审核。
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <div className="my-4 p-4 bg-muted rounded-md text-center break-all">
                    <p className="font-mono text-sm">{walletAddress}</p>
                </div>
                 <div className="flex justify-center gap-4">
                    <Button onClick={handleCopy} variant="outline">
                        <Copy className="mr-2 h-4 w-4" />
                        复制地址
                    </Button>
                    <Button onClick={handleDepositRequest} className="bg-blue-600 hover:bg-blue-700">
                        <Send className="mr-2 h-4 w-4" />
                        提交充值请求
                    </Button>
                </div>
                <AlertDialogFooter>
                    <AlertDialogAction asChild>
                       <Button onClick={() => onOpenChange(false)} variant="ghost">关闭</Button>
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}
