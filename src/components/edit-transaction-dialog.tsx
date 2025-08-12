
"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Transaction } from "@/types";
import { availablePairs } from "@/types";

type EditTransactionDialogProps = {
    isOpen: boolean;
    onOpenChange: (isOpen: boolean) => void;
    transaction: Transaction | null;
    onSave: (updatedTransaction: Transaction) => void;
};

const availableAssets = [...new Set(availablePairs.flatMap(p => p.split('/')))];

export function EditTransactionDialog({ isOpen, onOpenChange, transaction, onSave }: EditTransactionDialogProps) {
    const [formData, setFormData] = useState<Transaction | null>(transaction);

    useEffect(() => {
        setFormData(transaction);
    }, [transaction]);

    if (!formData) return null;

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { id, value } = e.target;
        setFormData(prev => prev ? { ...prev, [id]: id === 'amount' ? parseFloat(value) : value } : null);
    };
    
    const handleSelectChange = (name: string, value: string) => {
        setFormData(prev => prev ? { ...prev, [name]: value } : null);
    }

    const handleDateTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { value } = e.target;
        setFormData(prev => prev ? { ...prev, createdAt: new Date(value).toISOString() } : null);
    }
    
    const handleSubmit = () => {
        if (formData) {
            onSave(formData);
        }
        onOpenChange(false);
    }

    const formatDateTimeLocal = (isoString: string) => {
        const date = new Date(isoString);
        if (isNaN(date.getTime())) {
            return '';
        }
        const tzoffset = (new Date()).getTimezoneOffset() * 60000;
        const localISOTime = (new Date(date.getTime() - tzoffset)).toISOString().slice(0, 16);
        return localISOTime;
    };


    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>修改交易记录</DialogTitle>
                    <DialogDescription>
                        为用户 <span className="font-semibold">{transaction?.userId}</span> 修改交易详情。
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="type" className="text-right">
                            类型
                        </Label>
                        <Select value={formData.type} onValueChange={(value) => handleSelectChange('type', value)}>
                            <SelectTrigger className="col-span-3">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="deposit">充值</SelectItem>
                                <SelectItem value="withdrawal">提现</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                     <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="asset" className="text-right">
                            币种
                        </Label>
                        <Select value={formData.asset} onValueChange={(value) => handleSelectChange('asset', value)}>
                            <SelectTrigger className="col-span-3">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {availableAssets.map(asset => (
                                    <SelectItem key={asset} value={asset}>{asset}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="amount" className="text-right">
                            金额
                        </Label>
                        <Input
                            id="amount"
                            type="number"
                            value={formData.amount}
                            onChange={handleInputChange}
                            className="col-span-3"
                        />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="status" className="text-right">
                            状态
                        </Label>
                         <Select value={formData.status} onValueChange={(value) => handleSelectChange('status', value)}>
                            <SelectTrigger className="col-span-3">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="pending">待审核</SelectItem>
                                <SelectItem value="approved">已批准</SelectItem>
                                <SelectItem value="rejected">已拒绝</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                     <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="proof" className="text-right">
                            凭证/地址
                        </Label>
                        <Input
                            id={formData.type === 'deposit' ? 'transactionHash' : 'address'}
                            value={formData.type === 'deposit' ? formData.transactionHash : formData.address}
                            onChange={handleInputChange}
                            className="col-span-3"
                        />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="createdAt" className="text-right">
                            时间
                        </Label>
                         <Input
                            id="createdAt"
                            type="datetime-local"
                            value={formatDateTimeLocal(formData.createdAt)}
                            onChange={handleDateTimeChange}
                            className="col-span-3"
                        />
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>取消</Button>
                    <Button onClick={handleSubmit}>保存更改</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
