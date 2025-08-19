
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
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import type { Investment, User } from '@/types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { useToast } from "@/hooks/use-toast";
import { MessageSquare, Send, Users, Repeat, Archive } from "lucide-react";
import { useBalance } from "@/context/balance-context";
import { useAuth } from "@/context/auth-context";
import { availablePairs } from "@/types";
import { Skeleton } from "./ui/skeleton";
import { Badge } from "./ui/badge";
import { useRequests } from "@/context/requests-context";
import { useAnnouncements } from "@/context/announcements-context";
import { Textarea } from "./ui/textarea";
import { cn } from "@/lib/utils";
import { getUserData } from "@/lib/user-data";

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
    const { getDownline } = useAuth();
    const [downline, setDownline] = useState<User[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (!userId) return;
        setIsLoading(true);
        const fetchedDownline = getDownline(userId);
        setDownline(fetchedDownline);
        setIsLoading(false);
    }, [userId, getDownline]);
    
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
                    <Badge variant="outline">LV {(member as any).level || 0}</Badge>
                    <span>{member.username}</span>
                </li>
            ))}
        </ul>
    );
};


export function UserDetailsDialog({ isOpen, onOpenChange, user: initialUser, onUpdate }: UserDetailsDialogProps) {
    const [user, setUser] = useState<User | null>(initialUser);
    const [newPassword, setNewPassword] = useState("");
    const [balanceAdjustments, setBalanceAdjustments] = useState<BalanceAdjustments>({});
    const { toast } = useToast();
    const { recalculateBalanceForUser, adjustBalance } = useBalance();
    const { updateUser } = useAuth();
    const { addAnnouncement } = useAnnouncements();
    const [calculatedBalances, setCalculatedBalances] = useState<UserBalance>({});
    const [userInvestments, setUserInvestments] = useState<Investment[]>([]);
    const [creditScore, setCreditScore] = useState((initialUser?.credit_score ?? 100).toString());
    const [messageTitle, setMessageTitle] = useState("");
    const [messageContent, setMessageContent] = useState("");


    useEffect(() => {
        setUser(initialUser);
        if (isOpen && initialUser) {
            setNewPassword("");
            setBalanceAdjustments({});
            setCreditScore((initialUser.credit_score ?? 100).toString());
            setMessageTitle("");
            setMessageContent("");
            
            const loadUserData = async () => {
                const bal = await recalculateBalanceForUser(initialUser.id);
                setCalculatedBalances(bal);
                const data = getUserData(initialUser.id);
                setUserInvestments(data.investments);
            }
            loadUserData();

        }
    }, [isOpen, initialUser, recalculateBalanceForUser]);


    if (!user) {
        return null;
    }
    
    const handleSuccessfulUpdate = (updatedUser: User) => {
        setUser(updatedUser);
        onUpdate();
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
        
        adjustBalance(user.id, asset, amount);

        toast({ title: "成功", description: `为 ${user.username} 的 ${asset} 余额调整了 ${amount}。` });
        setBalanceAdjustments(prev => ({ ...prev, [asset]: ''}));
        
        const bal = await recalculateBalanceForUser(user.id);
        setCalculatedBalances(bal);
        onUpdate(); 
    };


    const handlePasswordChange = async () => {
        if (!user || !newPassword.trim()) {
            toast({ variant: "destructive", title: "错误", description: "请输入新密码。" });
            return;
        }
        const success = await updateUser(user.id, { password: newPassword.trim() });

        if (success) {
            toast({ title: "成功", description: `用户 ${user.username} 的密码已更新。` });
            setNewPassword("");
        } else {
             toast({ variant: "destructive", title: "失败", description: "更新密码失败。" });
        }
    };
    
    const handleToggleFreeze = async (freeze: boolean) => {
        if (!user) return;
        const success = await updateUser(user.id, { is_frozen: freeze });
        if (success) {
            toast({ title: "成功", description: `用户 ${user.username} 已被${freeze ? '冻结' : '解冻'}。` });
            handleSuccessfulUpdate({ ...user, is_frozen: freeze });
        } else {
            toast({ variant: "destructive", title: "失败", description: "操作失败。" });
        }
    }

    const handleToggleAccountType = async () => {
        if (!user) return;
        const newType = !user.is_test_user;
        const success = await updateUser(user.id, { is_test_user: newType });
        if (success) {
            toast({ title: "成功", description: `用户类型已更新为 ${newType ? '测试账户' : '真实账户'}` });
            handleSuccessfulUpdate({ ...user, is_test_user: newType });
        } else {
            toast({ variant: "destructive", title: "失败", description: "操作失败。" });
        }
    }
    
    const handleCreditScoreSave = async () => {
        if (!user) return;
        const score = parseInt(creditScore, 10);
        if (isNaN(score)) {
            toast({ variant: "destructive", title: "错误", description: "请输入有效的信誉分数值。" });
            return;
        }
        const success = await updateUser(user.id, { credit_score: score });
         if (success) {
            toast({ title: "成功", description: `用户 ${user.username} 的信誉分已更新。` });
        } else {
            toast({ variant: "destructive", title: "失败", description: "操作失败。" });
        }
    };

    const handleSendMessage = async () => {
        if (!user || !messageTitle.trim() || !messageContent.trim()) {
            toast({ variant: "destructive", title: "错误", description: "标题和内容不能为空。" });
            return;
        }
        
        addAnnouncement({
            title: messageTitle,
            content: messageContent,
            user_id: user.id,
        });

        toast({ title: "成功", description: `消息已发送给用户 ${user.username}。` });
        setMessageTitle("");
        setMessageContent("");
    };

    const registeredAtDate = user.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A';

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-3xl">
                <DialogHeader>
                    <DialogTitle>用户详情: {user.username}</DialogTitle>
                    <DialogDescription>
                        查看用户的详细信息、资产余额并管理用户。
                    </DialogDescription>
                </DialogHeader>
                <div className="py-4 max-h-[70vh] overflow-y-auto pr-4">
                    <Accordion type="multiple" defaultValue={['item-1']} className="w-full">
                        <AccordionItem value="item-1">
                            <AccordionTrigger>基本信息</AccordionTrigger>
                            <AccordionContent>
                                <div className="space-y-1 text-sm p-2">
                                    <p><strong>用户名:</strong> {user.username}</p>
                                    <p><strong>昵称:</strong> {user.nickname}</p>
                                    <p><strong>邀请码:</strong> {user.invitation_code || 'N/A'}</p>
                                    <p><strong>信誉分:</strong> {user.credit_score}</p>
                                    <p><strong>账户类型:</strong> {user.is_test_user ? '测试账户' : '真实账户'}</p>
                                    <p><strong>注册日期:</strong> {registeredAtDate}</p>
                                    <p><strong>邀请人ID:</strong> {user.inviter_id || '无'}</p>
                                    <p><strong>账户状态:</strong> {user.is_frozen ? <span className="text-red-500">已冻结</span> : <span className="text-green-500">正常</span>}</p>
                                </div>
                            </AccordionContent>
                        </AccordionItem>

                        <AccordionItem value="item-2">
                            <AccordionTrigger>资产余额</AccordionTrigger>
                            <AccordionContent>
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
                                                                type="text"
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
                            </AccordionContent>
                        </AccordionItem>

                        <AccordionItem value="item-3">
                            <AccordionTrigger>理财订单</AccordionTrigger>
                            <AccordionContent>
                                {userInvestments.length > 0 ? (
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>产品名称</TableHead>
                                                <TableHead>投资金额 (USDT)</TableHead>
                                                <TableHead>状态</TableHead>
                                                <TableHead>结算日期</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {userInvestments.map(inv => (
                                                <TableRow key={inv.id}>
                                                    <TableCell>{inv.product_name}</TableCell>
                                                    <TableCell>{inv.amount.toFixed(2)}</TableCell>
                                                    <TableCell>
                                                        <Badge variant="outline" className={cn(inv.status === 'active' ? 'text-yellow-500' : 'text-green-500')}>
                                                            {inv.status === 'active' ? '进行中' : `已结算 (+${(inv.profit || 0).toFixed(2)})`}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell className="text-xs">{new Date(inv.settlement_date).toLocaleDateString()}</TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                ) : (
                                    <div className="text-center py-10 text-muted-foreground bg-muted/50 rounded-md">
                                        <Archive className="mx-auto h-12 w-12" />
                                        <p className="mt-4">该用户暂无理财记录。</p>
                                    </div>
                                )}
                            </AccordionContent>
                        </AccordionItem>
                        
                        <AccordionItem value="item-4">
                            <AccordionTrigger>团队信息</AccordionTrigger>
                             <AccordionContent>
                                <DownlineTree userId={user.id} />
                            </AccordionContent>
                        </AccordionItem>

                        <AccordionItem value="item-5">
                            <AccordionTrigger>管理操作</AccordionTrigger>
                            <AccordionContent>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6 p-2">
                                    <div className="space-y-4">
                                       <h5 className="text-sm font-medium">账户操作</h5>
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
                                            <Button onClick={handlePasswordChange}>确认</Button>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            <Label htmlFor="credit-score" className="flex-shrink-0">
                                                信誉分:
                                            </Label>
                                            <Input
                                                id="credit-score"
                                                name="credit-score"
                                                type="number"
                                                value={creditScore}
                                                onChange={(e) => setCreditScore(e.target.value)}
                                            />
                                            <Button onClick={handleCreditScoreSave}>保存</Button>
                                        </div>
                                         <div className="flex items-center justify-between">
                                            <Label>账户状态:</Label>
                                             {user.is_frozen ? (
                                                <Button onClick={() => handleToggleFreeze(false)} variant="outline" className="text-green-600 border-green-600 hover:bg-green-500/10">
                                                    解冻账户
                                                </Button>
                                            ) : (
                                                <Button onClick={() => handleToggleFreeze(true)} variant="destructive">
                                                    冻结账户
                                                </Button>
                                            )}
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <Label>账户类型:</Label>
                                            <Button onClick={handleToggleAccountType} variant="outline">
                                                <Repeat className="w-4 h-4 mr-2"/>
                                                切换为 {user.is_test_user ? '真实账户' : '测试账户'}
                                            </Button>
                                        </div>
                                    </div>

                                     <div className="space-y-4">
                                        <h5 className="text-sm font-medium flex items-center gap-2"><MessageSquare className="w-4 h-4" /> 发送专属公告</h5>
                                         <div className="space-y-2">
                                            <Label htmlFor="message-title">标题</Label>
                                            <Input 
                                                id="message-title"
                                                value={messageTitle}
                                                onChange={(e) => setMessageTitle(e.target.value)}
                                                placeholder="输入消息标题"
                                            />
                                         </div>
                                          <div className="space-y-2">
                                            <Label htmlFor="message-content">内容</Label>
                                            <Textarea
                                                id="message-content"
                                                value={messageContent}
                                                onChange={(e) => setMessageContent(e.target.value)}
                                                placeholder="输入消息内容..."
                                            />
                                         </div>
                                         <Button onClick={handleSendMessage} className="w-full">
                                            <Send className="w-4 h-4 mr-2"/>
                                            发送消息
                                         </Button>
                                    </div>
                                </div>
                            </AccordionContent>
                        </AccordionItem>
                    </Accordion>
                </div>
                <DialogFooter>
                    <Button onClick={() => onOpenChange(false)} variant="outline">关闭</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
