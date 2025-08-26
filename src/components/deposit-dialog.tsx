
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
import { useSimpleAuth } from '@/context/simple-custom-auth';
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { useEnhancedSystemSettings } from "@/context/enhanced-system-settings-context";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useRequests } from "@/context/requests-context";

type DepositDialogProps = {
    isOpen: boolean;
    onOpenChange: (isOpen: boolean) => void;
};

const supportedAssets: (keyof ReturnType<typeof useEnhancedSystemSettings>['systemSettings']['depositAddresses'])[] = ["USDT", "ETH", "BTC", "USD"];

export function DepositDialog({ isOpen, onOpenChange }: DepositDialogProps) {
    const { toast } = useToast();
    const { user } = useSimpleAuth();
    const { addDepositRequest } = useRequests();
    const { systemSettings } = useEnhancedSystemSettings();
    const [selectedAsset, setSelectedAsset] = useState<keyof typeof systemSettings.depositAddresses>("USDT");
    const [amount, setAmount] = useState("");
    const [transactionHash, setTransactionHash] = useState("");

    const walletAddress = systemSettings.depositAddresses[selectedAsset];

    const handleCopy = () => {
        if (!walletAddress) {
             toast({
                variant: "destructive",
                title: "无法复制",
                description: "管理员尚未配置该资产的充值地址。",
            });
            return;
        }
        navigator.clipboard.writeText(walletAddress);
        toast({
            title: "已复制",
            description: "地址已复制到剪贴板。",
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

        addDepositRequest({
            asset: selectedAsset,
            amount: numericAmount,
            transaction_hash: transactionHash
        });
        
        toast({
            title: "充值请求已提交",
            description: `您的 ${amount} ${selectedAsset} 充值请求已发送给管理员审核，请耐心等待。`,
        });
        
        resetAndClose();
    }

    const resetAndClose = () => {
        setAmount("");
        setTransactionHash("");
        setSelectedAsset("USDT");
        onOpenChange(false);
    }
    
    const onOpenChangeWrapper = (open: boolean) => {
        if(!open) {
            resetAndClose();
        }
        onOpenChange(open);
    }

    return (
        <AlertDialog open={isOpen} onOpenChange={onOpenChangeWrapper}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>充币/充值</AlertDialogTitle>
                    <AlertDialogDescription>
                       请选择您要充值的资产，向下方地址充值，然后填写您的充值金额和链上交易哈希/ID以供管理员审核。
                    </AlertDialogDescription>
                </AlertDialogHeader>

                <div className="space-y-4 pt-2">
                    <div className="space-y-2">
                        <Label htmlFor="deposit-asset">选择资产</Label>
                        <Select value={selectedAsset} onValueChange={(value) => setSelectedAsset(value as any)}>
                            <SelectTrigger id="deposit-asset">
                                <SelectValue placeholder="选择一个资产" />
                            </SelectTrigger>
                            <SelectContent>
                                {supportedAssets.map(asset => (
                                    <SelectItem key={asset} value={asset}>{asset}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

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
                                    <Label htmlFor="deposit-amount">充值金额 ({selectedAsset})</Label>
                                    <Input 
                                        id="deposit-amount"
                                        type="number"
                                        placeholder={`请输入您充值的${selectedAsset}数量`}
                                        value={amount}
                                        onChange={(e) => setAmount(e.target.value)}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="tx-hash">交易哈希/ID (凭证)</Label>
                                    <Input 
                                        id="tx-hash"
                                        type="text"
                                        placeholder="请输入链上交易哈希或转账截图ID"
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
                                <p className="text-xs">系统管理员尚未配置 {selectedAsset} 的充值地址。请选择其他资产或联系客服。</p>
                            </div>
                        </div>
                    )}
                </div>


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
