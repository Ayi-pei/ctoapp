
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
import type { User as AuthUser } from '@/context/auth-context';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { useToast } from "@/hooks/use-toast";
import { Separator } from "./ui/separator";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "./ui/accordion";
import { Users } from "lucide-react";
import { useBalance } from "@/context/balance-context";
import { availablePairs } from "@/types";


type UserBalance = {
    [key: string]: {
        available: number;
        frozen: number;
    }
} | null;

type DownlineMember = AuthUser & {
    level: number;
    children?: DownlineMember[];
};

type UserDetailsDialogProps = {
    isOpen: boolean;
    onOpenChange: (isOpen: boolean) => void;
    user: AuthUser | null;
    balances: UserBalance;
    onUpdate: () => void;
};

type BalanceAdjustments = {
    [key: string]: string;
};

const allAssets = [...new Set(availablePairs.flatMap(p => p.split('/')))];

export function UserDetailsDialog({ isOpen, onOpenChange, user, balances, onUpdate }: UserDetailsDialogProps) {
    const [newPassword, setNewPassword] = useState("");
    const [balanceAdjustments, setBalanceAdjustments] = useState<BalanceAdjustments>({});
    const [downlineTree, setDownlineTree] = useState<DownlineMember[]>([]);
    const { toast } = useToast();
    const { updateUser, user: currentUser } = useAuth();
    const balanceContext = useBalance();


    useEffect(() => {
        if (isOpen && user) {
            setBalanceAdjustments({}); // Reset adjustments on open
            try {
                const allUsers: AuthUser[] = JSON.parse(localStorage.getItem('users') || '[]');
                const userMap = new Map(allUsers.map(u => [u.username, u]));

                const getDownlineRecursive = (username: string, level: number): DownlineMember[] => {
                    if (level > 3) return []; // Limit to 3 levels

                    const directUpline = userMap.get(username);
                    if (!directUpline || !directUpline.downline) return [];

                    return directUpline.downline.map(downlineName => {
                        const downlineUser = userMap.get(downlineName);
                        if (!downlineUser) return null;
                        return {
                            ...downlineUser,
                            level,
                            children: getDownlineRecursive(downlineName, level + 1),
                        };
                    }).filter((member): member is DownlineMember => member !== null);
                };
                
                const tree = getDownlineRecursive(user.username, 1);
                setDownlineTree(tree);

            } catch (error) {
                console.error("Failed to build downline tree:", error);
                setDownlineTree([]);
            }
        }
    }, [isOpen, user]);


    if (!user) {
        return null;
    }

    const handleAdjustmentChange = (asset: string, value: string) => {
        setBalanceAdjustments(prev => ({ ...prev, [asset]: value }));
    };

    const handleAdjustBalance = (asset: string) => {
        if (!user) return;
        const amountStr = balanceAdjustments[asset] || '0';
        const amount = parseFloat(amountStr);

        if (isNaN(amount)) {
            toast({ variant: "destructive", title: "错误", description: "请输入有效的数字。" });
            return;
        }

        balanceContext.updateBalance(user.username, asset, amount, 'available');
        toast({ title: "成功", description: `${user.username} 的 ${asset} 余额已调整。` });
        
        setBalanceAdjustments(prev => ({ ...prev, [asset]: ''}));
        onUpdate(); // Trigger data reload in parent component
    };


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
                
                if(currentUser?.username === user.username) {
                    updateUser({ password: newPassword.trim() });
                }

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

                if (currentUser?.username === user.username) {
                    updateUser({ isFrozen: freeze });
                }
                
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

    const renderDownline = (members: DownlineMember[]) => {
        if (!members || members.length === 0) {
            return <p className="text-sm text-muted-foreground pl-4">无下级成员。</p>;
        }
        return (
             <Accordion type="multiple" className="w-full">
                {members.map(member => (
                    <AccordionItem value={member.username} key={member.username} className="border-b-0">
                         <AccordionTrigger className="py-2 hover:no-underline">
                            <div className="flex items-center gap-2">
                                <span className={`text-xs font-semibold px-2 py-1 rounded-md bg-muted text-muted-foreground`}>
                                    LV {member.level}
                                </span>
                                <span>{member.username}</span>
                            </div>
                        </AccordionTrigger>
                        <AccordionContent className="pl-6 border-l border-dashed ml-3">
                            {renderDownline(member.children || [])}
                        </AccordionContent>
                    </AccordionItem>
                ))}
            </Accordion>
        )
    }
    
    const registeredAtDate = user.registeredAt ? new Date(user.registeredAt).toLocaleDateString() : 'N/A';

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
                        <p className="text-sm"><strong>账户类型:</strong> {user.isTestUser ? '测试账户' : '真实账户'}</p>
                        <p className="text-sm"><strong>注册日期:</strong> {registeredAtDate}</p>
                        <p className="text-sm"><strong>邀请人:</strong> {user.inviter || '无'}</p>
                        <p className="text-sm"><strong>邀请码:</strong> {user.invitationCode}</p>
                        <p className="text-sm"><strong>账户状态:</strong> {user.isFrozen ? <span className="text-red-500">已冻结</span> : <span className="text-green-500">正常</span>}</p>
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
                                    const balance = balances?.[asset] || { available: 0, frozen: 0 };
                                    return (
                                        <TableRow key={asset}>
                                            <TableCell className="font-medium">{asset}</TableCell>
                                            <TableCell>{balance.available.toFixed(4)}</TableCell>
                                            <TableCell>{balance.frozen.toFixed(4)}</TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-2">
                                                    <Input
                                                        type="number"
                                                        placeholder="输入调整值"
                                                        value={balanceAdjustments[asset] || ''}
                                                        onChange={(e) => handleAdjustmentChange(asset, e.target.value)}
                                                        className="h-8"
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
                        <h4 className="font-semibold mb-3 flex items-center gap-2"><Users className="w-5 h-5" />团队信息 (三级代理)</h4>
                        {renderDownline(downlineTree)}
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
