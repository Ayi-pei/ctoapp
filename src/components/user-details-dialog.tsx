
"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { User, Transaction, DownlineMember } from '@/types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { useToast } from "@/hooks/use-toast";
import { Separator } from "./ui/separator";
import { Users } from "lucide-react";
import { useBalance } from "@/context/balance-context";
import { availablePairs } from "@/types";
import { Skeleton } from "./ui/skeleton";
import { Badge } from "./ui/badge";

type UserBalance = {
    [key: string]: {
        available: number;
        frozen: number;
    }
} | null;

type UserDetailsDialogProps = {
    isOpen: boolean;
    onOpenChange: (isOpen: boolean) => void;
    user: User | null;
    onUpdate: () => void;
};

type BalanceAdjustments = {
    [key: string]: string;
};

const allAssets = [...new Set(availablePairs.flatMap(p => p.split('/')))];

const DownlineTree = ({ userId }: { userId: string; }) => {
    const [downline, setDownline] = useState<DownlineMember[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (!userId) return;
        setIsLoading(true);
        // Mock data since Supabase is removed
        const mockDownline: DownlineMember[] = [
            { id: 'user2', username: 'testuser2', level: 1, created_at: new Date().toISOString() },
            { id: 'user3', username: 'testuser3', level: 2, created_at: new Date().toISOString() },
        ];
        setDownline(mockDownline);
        setIsLoading(false);
    }, [userId]);
    
    if (isLoading) {
        return (
            <div className="space-y-2 p-4">
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-6 w-1/2" />
            </div>
        )
    }

    if (!downline || downline.length === 0) {
        return <p className="text-sm text-muted-foreground p-4 text-center">无下级成员。</p>;
    }

    return (
        <ul className="space-y-2 p-2 max-h-48 overflow-y-auto">
            {downline.map(member => (
                 <li key={member.id} className="flex items-center gap-2 p-2 bg-muted/50 rounded-md">
                    <Badge variant="outline">LV {member.level}</Badge>
                    <span>{member.username}</span>
                </li>
            ))}
        </ul>
    );
};


export function UserDetailsDialog({ isOpen, onOpenChange, user, onUpdate }: UserDetailsDialogProps) {
    const [newPassword, setNewPassword] = useState("");
    const [balanceAdjustments, setBalanceAdjustments] = useState<BalanceAdjustments>({});
    const { toast } = useToast();
    const { recalculateBalanceForUser } = useBalance();
    const [calculatedBalances, setCalculatedBalances] = useState<UserBalance>({});


    useEffect(() => {
        if (isOpen && user) {
            setNewPassword("");
            setBalanceAdjustments({});
            
            const getBalances = async () => {
                const bal = await recalculateBalanceForUser(user.id);
                setCalculatedBalances(bal);
            }
            getBalances();

        }
    }, [isOpen, user, recalculateBalanceForUser]);


    if (!user) {
        return null;
    }

    const handleAdjustmentChange = (asset: string, value: string) => {
        setBalanceAdjustments(prev => ({ ...prev, [asset]: value }));
    };

    const handleAdjustBalance = async (asset: string) => {
        if (!user) return;
        const amountStr = balanceAdjustments[asset] || '0';
        const amount = parseFloat(amountStr);

        if (isNaN(amount) || amount === 0) {
            toast({ variant: "destructive", title: "错误", description: "请输入一个有效的、非零的调整值。" });
            return;
        }
        
        toast({ title: "成功 (Mock)", description: `${user.username} 的 ${asset} 余额已调整。` });
        setBalanceAdjustments(prev => ({ ...prev, [asset]: ''}));
        
        // This would be where you update balances, but it's mocked in the context now
        onUpdate(); 
    };


    const handlePasswordChange = async () => {
        if (!user || !newPassword.trim()) {
            toast({ variant: "destructive", title: "错误", description: "请输入新密码。" });
            return;
        }
        toast({ title: "成功 (Mock)", description: `用户 ${user.username} 的密码已更新。` });
        setNewPassword("");
    };
    
    const handleToggleFreeze = async (freeze: boolean) => {
        if (!user) return;
        toast({ title: "成功 (Mock)", description: `用户 ${user.username} 已被${freeze ? '冻结' : '解冻'}。` });
        onUpdate();
    }
    
    const registeredAtDate = user.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A';

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-2xl">
                <DialogHeader>
                    <DialogTitle>用户详情: {user.username}</DialogTitle>
                    <DialogDescription>
                        查看用户的详细信息、资产余额并管理用户。
                    </DialogDescription>
                </DialogHeader>
                <div className="py-4 space-y-6 max-h-[70vh] overflow-y-auto pr-4">
                    <div>
                        <h4 className="font-semibold mb-2">基本信息</h4>
                        <p className="text-sm"><strong>用户名:</strong> {user.username}</p>
                        <p className="text-sm"><strong>邀请码:</strong> {user.invitation_code || 'N/A'}</p>
                        <p className="text-sm"><strong>账户类型:</strong> {user.is_test_user ? '测试账户' : '真实账户'}</p>
                        <p className="text-sm"><strong>注册日期:</strong> {registeredAtDate}</p>
                        <p className="text-sm"><strong>邀请人ID:</strong> {user.inviter_id || '无'}</p>
                        <p className="text-sm"><strong>账户状态:</strong> {user.is_frozen ? <span className="text-red-500">已冻结</span> : <span className="text-green-500">正常</span>}</p>
                    </div>

                     <div>
                        <div className="flex justify-between items-center mb-2">
                           <h4 className="font-semibold">资产余额</h4>
                        </div>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>资产</TableHead>
                                    <TableHead>可用</TableHead>
                                    <TableHead>冻结</TableHead>
                                    <TableHead className="w-[250px]">调整可用余额</TableHead>
                                </TableRow>
                            </TableHeader>
                             <TableBody>
                                {allAssets.map(asset => {
                                    const balance = calculatedBalances?.[asset] || { available: 0, frozen: 0 };
                                    return (
                                        <TableRow key={asset}>
                                            <TableCell className="font-medium">{asset}</TableCell>
                                            <TableCell>{balance.available.toFixed(4)}</TableCell>
                                            <TableCell>{balance.frozen.toFixed(4)}</TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-2">
                                                    <Input
                                                        type="number"
                                                        placeholder="输入 +/- 调整值"
                                                        value={balanceAdjustments[asset] || ''}
                                                        onChange={(e) => handleAdjustmentChange(asset, e.target.value)}
                                                        className="h-8"
                                                        id={`balance-adjustment-${asset}`}
                                                        name={`balance-adjustment-${asset}`}
                                                    />
                                                    <Button size="sm" onClick={() => handleAdjustBalance(asset)}>调整</Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    )
                                })}
                            </TableBody>
                        </Table>
                    </div>

                    <div>
                        <h4 className="font-semibold mb-3 flex items-center gap-2"><Users className="w-5 h-5" />团队信息</h4>
                        <DownlineTree userId={user.id} />
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
                                name="new-password"
                                type="text"
                                placeholder="输入新密码"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                            />
                            <Button onClick={handlePasswordChange}>确认修改</Button>
                        </div>
                        <div className="flex items-center space-x-2">
                             <Label htmlFor="freeze-account-btn" className="flex-shrink-0">
                                账户状态:
                            </Label>
                             {user.is_frozen ? (
                                <Button id="freeze-account-btn" onClick={() => handleToggleFreeze(false)} variant="outline" className="text-green-600 border-green-600 hover:bg-green-500/10">
                                    解冻账户
                                </Button>
                            ) : (
                                <Button id="freeze-account-btn" onClick={() => handleToggleFreeze(true)} variant="destructive">
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
