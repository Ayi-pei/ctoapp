
"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { User as AuthUser } from '@/context/auth-context';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";

type UserData = AuthUser & {
    registeredAt: string;
};

type UserBalance = {
    [key: string]: {
        available: number;
        frozen: number;
    }
} | null;

type UserDetailsDialogProps = {
    isOpen: boolean;
    onOpenChange: (isOpen: boolean) => void;
    user: UserData | null;
    balances: UserBalance;
};

export function UserDetailsDialog({ isOpen, onOpenChange, user, balances }: UserDetailsDialogProps) {
    if (!user) {
        return null;
    }

    const balanceEntries = balances ? Object.entries(balances) : [];

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>用户详情: {user.username}</DialogTitle>
                    <DialogDescription>
                        查看用户的详细信息和资产余额。
                    </DialogDescription>
                </DialogHeader>
                <div className="py-4 space-y-4">
                    <div>
                        <h4 className="font-semibold mb-2">基本信息</h4>
                        <p className="text-sm"><strong>用户名:</strong> {user.username}</p>
                        <p className="text-sm"><strong>账户类型:</strong> {user.isTestUser ? '测试账户' : '真实账户'}</p>
                         <p className="text-sm"><strong>注册日期:</strong> {user.registeredAt}</p>
                    </div>
                     <div>
                        <h4 className="font-semibold mb-2">资产余额</h4>
                        {balanceEntries.length > 0 ? (
                             <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>资产</TableHead>
                                        <TableHead className="text-right">可用</TableHead>
                                        <TableHead className="text-right">冻结</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {balanceEntries.map(([asset, balance]) => (
                                        <TableRow key={asset}>
                                            <TableCell className="font-medium">{asset}</TableCell>
                                            <TableCell className="text-right">{balance.available.toFixed(6)}</TableCell>
                                            <TableCell className="text-right">{balance.frozen.toFixed(6)}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        ) : (
                            <p className="text-sm text-muted-foreground">该用户暂无余额信息。</p>
                        )}
                       
                    </div>
                </div>
                <DialogFooter>
                    <Button onClick={() => onOpenChange(false)}>关闭</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
