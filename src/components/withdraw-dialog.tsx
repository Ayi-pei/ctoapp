
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/auth-context";
import { useBalance } from "@/context/balance-context";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { WithdrawalAddress } from "@/app/profile/payment/page";
import { useRequests } from "@/context/requests-context";
import { AlertCircle } from "lucide-react";


type WithdrawDialogProps = {
    isOpen: boolean;
    onOpenChange: (isOpen: boolean) => void;
};

export function WithdrawDialog({ isOpen, onOpenChange }: WithdrawDialogProps) {
    const { toast } = useToast();
    const { user } = useAuth();
    const { balances } = useBalance();
    const { addWithdrawalRequest } = useRequests();
    const [selectedAddress, setSelectedAddress] = useState("");
    const [amount, setAmount] = useState("");
    const [savedAddresses, setSavedAddresses] = useState<WithdrawalAddress[]>([]);

    useEffect(() => {
        if (user && isOpen) {
            // Mock data since Supabase is removed
            const mockAddresses: WithdrawalAddress[] = [
                { id: 'addr1', name: 'My Binance Wallet', address: 'Tabcdef1234567890', network: 'USDT-TRC20', user_id: user.id },
            ];
            setSavedAddresses(mockAddresses);
        }
    }, [user, isOpen]);


    const handleWithdraw = async () => {
        if (user?.is_test_user) {
            toast({
                variant: "destructive",
                title: "操作受限",
                description: "测试账户无法进行提现操作。",
            });
            return;
        }

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
        
        addWithdrawalRequest({
            asset: 'USDT',
            amount: numericAmount,
            address: selectedAddress
        });
        
        toast({
            title: "提币请求已提交",
            description: `您的 ${amount} USDT 提币请求已发送给管理员审核。`,
        });
        
        setSelectedAddress("");
        setAmount("");
        onOpenChange(false);
    };
    
    const handleOpenChange = (open: boolean) => {
        if (!open) {
            setSelectedAddress("");
            setAmount("");
        }
        onOpenChange(open);
    }
    
    const showCreditScoreWarning = user && user.credit_score < 90;

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
                     {showCreditScoreWarning && (
                        <div className="p-3 rounded-md bg-yellow-500/10 border border-yellow-500/20 text-yellow-700 flex items-center gap-3 text-xs">
                           <AlertCircle className="h-5 w-5 flex-shrink-0" />
                           您的信誉分较低，如遇审核峰值过高将延迟受理，感谢理解配合。
                        </div>
                    )}
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
                 <AlertDialog>
                    <AlertDialogTrigger asChild>
                        <Button variant="link" className="p-0 h-auto text-xs self-start text-muted-foreground">提现规则说明</Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>提现规则说明</AlertDialogTitle>
                        </AlertDialogHeader>
                        <div className="text-sm space-y-3">
                           <p><strong>RMB收款 (微信/支付宝/银行卡):</strong> 工作日3-12小时到账。如遇节假日峰值过高审核延迟≤24h。</p>
                           <p><strong>数字货币 (USDT/ETH):</strong> 15分钟-3小时到账。如遇节假日峰值过高审核延迟&lt;20h。</p>
                           <p className="text-xs text-muted-foreground">具体时间将根据当前待审核订单数（含安全审核、充/提审核、问题反馈审核），以及用户信誉分排序受理优先权。感谢您长久对我们的信任与支持。</p>
                        </div>
                        <AlertDialogFooter>
                           <AlertDialogAction>我明白了</AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
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
