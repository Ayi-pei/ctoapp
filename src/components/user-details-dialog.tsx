
"use client";

import { useState } from "react";
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
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { useToast } from "@/hooks/use-toast";
import { Separator } from "./ui/separator";

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
    onUpdate: () => void;
};

export function UserDetailsDialog({ isOpen, onOpenChange, user, balances, onUpdate }: UserDetailsDialogProps) {
    const [newPassword, setNewPassword] = useState("");
    const { toast } = useToast();

    if (!user) {
        return null;
    }

    const handlePasswordChange = () => {
        if (!user || !newPassword.trim()) {
            toast({ variant: "destructive", title: "错误", description: "请输入新密码。" });
            return;
        }
        try {
            const users = JSON.parse(localStorage.getItem('users') || '[]');
            const userIndex = users.findIndex((u: any) => u.username === user.username);
            if (userIndex !== -1) {
                users[userIndex].password = newPassword.trim();
                localStorage.setItem('users', JSON.stringify(users));
                toast({ title: "成功", description: `用户 ${user.username} 的密码已更新。` });
                setNewPassword("");
                onUpdate(); // Refresh the user list in the parent component
            } else {
                 toast({ variant: "destructive", title: "错误", description: "未找到该用户。" });
            }
        } catch (error) {
            console.error("Failed to update password:", error);
            toast({ variant: "destructive", title: "错误", description: "更新密码失败。" });
        }
    };


    const balanceEntries = balances ? Object.entries(balances) : [];

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[525px]">
                <DialogHeader>
                    <DialogTitle>用户详情: {user.username}</DialogTitle>
                    <DialogDescription>
                        查看用户的详细信息、资产余额并管理用户。
                    </DialogDescription>
                </DialogHeader>
                <div className="py-4 space-y-6">
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

                    <Separator />
                    
                    <div>
                        <h4 className="font-semibold mb-2">管理操作</h4>
                        <div className="flex items-center space-x-2">
                             <Label htmlFor="new-password" className="flex-shrink-0">
                                重置密码:
                            </Label>
                            <Input 
                                id="new-password"
                                type="text"
                                placeholder="输入新密码"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                            />
                            <Button onClick={handlePasswordChange}>确认修改</Button>
                        </div>
                    </div>
                </div>
                <DialogFooter>
                    <Button onClick={() => onOpenChange(false)} variant="outline">关闭</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
