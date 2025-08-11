
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

type UserBalance = {
    [key: string]: {
        available: number;
        frozen: number;
    }
} | null;

type UserDetailsDialogProps = {
    isOpen: boolean;
    onOpenChange: (isOpen: boolean) => void;
    user: AuthUser | null;
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
                onUpdate(); 
            } else {
                 toast({ variant: "destructive", title: "错误", description: "未找到该用户。" });
            }
        } catch (error) {
            console.error("Failed to update password:", error);
            toast({ variant: "destructive", title: "错误", description: "更新密码失败。" });
        }
    };
    
    const handleToggleFreeze = (freeze: boolean) => {
        if (!user) return;
        try {
             const users = JSON.parse(localStorage.getItem('users') || '[]');
            const userIndex = users.findIndex((u: any) => u.username === user.username);
             if (userIndex !== -1) {
                users[userIndex].isFrozen = freeze;
                localStorage.setItem('users', JSON.stringify(users));
                toast({ title: "成功", description: `用户 ${user.username} 已被${freeze ? '冻结' : '解冻'}。` });
                onUpdate();
            } else {
                 toast({ variant: "destructive", title: "错误", description: "未找到该用户。" });
            }
        } catch (error) {
            console.error("Failed to update user freeze state:", error);
            toast({ variant: "destructive", title: "错误", description: "操作失败。" });
        }
    }


    const balanceEntries = balances ? Object.entries(balances) : [];
    const registeredAtDate = user.registeredAt ? new Date(user.registeredAt).toLocaleDateString() : 'N/A';

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
                        <p className="text-sm"><strong>注册日期:</strong> {registeredAtDate}</p>
                        <p className="text-sm"><strong>邀请人:</strong> {user.inviter || '无'}</p>
                        <p className="text-sm"><strong>邀请码:</strong> {user.invitationCode}</p>
                        <p className="text-sm"><strong>账户状态:</strong> {user.isFrozen ? <span className="text-red-500">已冻结</span> : <span className="text-green-500">正常</span>}</p>
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
                    
                    <div className="space-y-4">
                        <h4 className="font-semibold">管理操作</h4>
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
                        <div className="flex items-center space-x-2">
                             <Label className="flex-shrink-0">
                                账户状态:
                            </Label>
                             {user.isFrozen ? (
                                <Button onClick={() => handleToggleFreeze(false)} variant="outline" className="text-green-600 border-green-600 hover:bg-green-500/10">
                                    解冻账户
                                </Button>
                            ) : (
                                <Button onClick={() => handleToggleFreeze(true)} variant="destructive">
                                    冻结账户
                                </Button>
                            )}
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
