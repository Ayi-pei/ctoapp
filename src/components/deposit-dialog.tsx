
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
import { Copy, Send, AlertTriangle } from "lucide-react";
import { useAuth } from "@/context/auth-context";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { useSystemSettings } from "@/context/system-settings-context";


type DepositDialogProps = {
    isOpen: boolean;
    onOpenChange: (isOpen: boolean) => void;
};

export function DepositDialog({ isOpen, onOpenChange }: DepositDialogProps) {
    const { toast } = useToast();
    const { user } = useAuth();
    const { systemSettings } = useSystemSettings();
    const walletAddress = systemSettings.depositAddress;
    const [amount, setAmount] = useState("");
    const [transactionHash, setTransactionHash] = useState("");

    const handleCopy = () => {
        if (!walletAddress) {
             toast({
                variant: "destructive",
                title: "无法复制",
                description: "管理员尚未配置充币地址。",
            });
            return;
        }
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
        
        toast({
            title: "充值请求已提交 (Mock)",
            description: "您的充值请求已发送给管理员审核，请耐心等待。",
        });
        
        // Reset state and close dialog
        setAmount("");
        setTransactionHash("");
        onOpenChange(false);
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
                
                {walletAddress ? (
                    <>
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
                    </>
                ) : (
                    <div className="my-4 p-4 bg-destructive/10 border border-destructive/20 rounded-lg flex items-center gap-4 text-destructive">
                        <AlertTriangle className="h-8 w-8" />
                        <div>
                            <h4 className="font-bold">功能暂不可用</h4>
                            <p className="text-xs">系统管理员尚未配置在线充币地址。请稍后再试或联系客服。</p>
                        </div>
                    </div>
                )}


                <AlertDialogFooter className="mt-4">
                    <Button onClick={() => onOpenChangeWrapper(false)} variant="ghost">取消</Button>
                    {walletAddress && (
                        <Button onClick={handleDepositRequest} className="bg-blue-600 hover:bg-blue-700">
                            <Send className="mr-2 h-4 w-4" />
                            提交充值请求
                        </Button>
                    )}
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}
