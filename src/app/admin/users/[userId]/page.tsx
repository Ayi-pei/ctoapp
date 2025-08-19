
"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { MessageSquare, Send, Users, Repeat, Archive, ChevronLeft } from "lucide-react";
import { useBalance } from "@/context/balance-context";
import { useAuth } from "@/context/auth-context";
import { availablePairs } from "@/types";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useAnnouncements } from "@/context/announcements-context";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { getUserData } from "@/lib/user-data";
import type { Investment, User } from '@/types';
import DashboardLayout from "@/components/dashboard-layout";
import { useRouter, useParams } from "next/navigation";

type UserBalance = {
    [key: string]: {
        available: number;
        frozen: number;
    }
} | null;

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

export default function UserDetailsPage() {
    const params = useParams();
    const userId = params.userId as string;
    const router = useRouter();
    const { getUserById, updateUser } = useAuth();
    const { recalculateBalanceForUser, adjustBalance } = useBalance();
    const { addAnnouncement } = useAnnouncements();
    const { toast } = useToast();

    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [newPassword, setNewPassword] = useState("");
    const [balanceAdjustments, setBalanceAdjustments] = useState<BalanceAdjustments>({});
    const [calculatedBalances, setCalculatedBalances] = useState<UserBalance>({});
    const [userInvestments, setUserInvestments] = useState<Investment[]>([]);
    const [creditScore, setCreditScore] = useState("100");
    const [messageTitle, setMessageTitle] = useState("");
    const [messageContent, setMessageContent] = useState("");

    const loadUserData = useCallback(async () => {
        if (!userId) return;
        setIsLoading(true);
        const fetchedUser = getUserById(userId);
        if (fetchedUser) {
            setUser(fetchedUser);
            setCreditScore((fetchedUser.credit_score ?? 100).toString());
            const bal = await recalculateBalanceForUser(fetchedUser.id);
            setCalculatedBalances(bal);
            const data = getUserData(fetchedUser.id);
            setUserInvestments(data.investments);
        }
        setIsLoading(false);
    }, [userId, getUserById, recalculateBalanceForUser]);

    useEffect(() => {
        loadUserData();
    }, [loadUserData]);

    if (isLoading) {
        return (
            <DashboardLayout>
                <div className="p-8 space-y-6">
                    <Skeleton className="h-8 w-64" />
                    <Card><CardContent className="p-6"><Skeleton className="h-64 w-full" /></CardContent></Card>
                    <Card><CardContent className="p-6"><Skeleton className="h-64 w-full" /></CardContent></Card>
                </div>
            </DashboardLayout>
        );
    }
    
    if (!user) {
        return (
            <DashboardLayout>
                <div className="p-8 text-center">用户不存在。</div>
            </DashboardLayout>
        )
    }
    
    const handleSuccessfulUpdate = (updatedUser: User) => {
        setUser(updatedUser);
        loadUserData(); // Reload all data after an update
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

    return (
        <DashboardLayout>
            <div className="p-4 md:p-8 space-y-6">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={() => router.back()}>
                        <ChevronLeft className="h-6 w-6" />
                    </Button>
                    <div>
                         <h1 className="text-2xl font-bold">用户详情: {user.username}</h1>
                         <p className="text-sm text-muted-foreground">查看和管理用户的详细信息</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2 space-y-6">
                        <Card>
                            <CardHeader><CardTitle>资产余额</CardTitle></CardHeader>
                            <CardContent>
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
                                                            <Input type="text" placeholder="输入 +/- 调整值" value={balanceAdjustments[asset] || ''} onChange={(e) => handleAdjustmentChange(asset, e.target.value)} className="h-8" id={`balance-adjustment-${asset}`} name={`balance-adjustment-${asset}`} />
                                                            <Button size="sm" onClick={() => handleAdjustBalance(asset)}>调整</Button>
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            )
                                        })}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader><CardTitle>理财订单</CardTitle></CardHeader>
                            <CardContent>
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
                            </CardContent>
                        </Card>
                         <Card>
                            <CardHeader><CardTitle className="flex items-center gap-2"><MessageSquare className="w-5 h-5"/> 发送专属公告</CardTitle></CardHeader>
                            <CardContent className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="message-title">标题</Label>
                                    <Input id="message-title" value={messageTitle} onChange={(e) => setMessageTitle(e.target.value)} placeholder="输入消息标题" />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="message-content">内容</Label>
                                    <Textarea id="message-content" value={messageContent} onChange={(e) => setMessageContent(e.target.value)} placeholder="输入消息内容..." />
                                </div>
                                <Button onClick={handleSendMessage} className="w-full"><Send className="w-4 h-4 mr-2"/>发送消息</Button>
                            </CardContent>
                        </Card>
                    </div>
                    <div className="space-y-6">
                        <Card>
                            <CardHeader><CardTitle>基本信息</CardTitle></CardHeader>
                            <CardContent className="space-y-2 text-sm">
                                <p><strong>用户名:</strong> {user.username}</p>
                                <p><strong>昵称:</strong> {user.nickname}</p>
                                <p><strong>邀请码:</strong> {user.invitation_code || 'N/A'}</p>
                                <p><strong>邀请人ID:</strong> {user.inviter_id || '无'}</p>
                                <p><strong>注册日期:</strong> {new Date(user.created_at).toLocaleDateString()}</p>
                            </CardContent>
                        </Card>
                         <Card>
                            <CardHeader><CardTitle>管理操作</CardTitle></CardHeader>
                            <CardContent className="space-y-4">
                                <div className="flex items-center space-x-2">
                                    <Label htmlFor="new-password" className="flex-shrink-0">重置密码:</Label>
                                    <Input id="new-password" name="new-password" type="text" placeholder="输入新密码" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
                                    <Button onClick={handlePasswordChange}>确认</Button>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <Label htmlFor="credit-score" className="flex-shrink-0">信誉分:</Label>
                                    <Input id="credit-score" name="credit-score" type="number" value={creditScore} onChange={(e) => setCreditScore(e.target.value)} />
                                    <Button onClick={handleCreditScoreSave}>保存</Button>
                                </div>
                                <div className="flex items-center justify-between">
                                    <Label>账户状态:</Label>
                                    {user.is_frozen ? (
                                        <Button onClick={() => handleToggleFreeze(false)} variant="outline" className="text-green-600 border-green-600 hover:bg-green-500/10">解冻账户</Button>
                                    ) : (
                                        <Button onClick={() => handleToggleFreeze(true)} variant="destructive">冻结账户</Button>
                                    )}
                                </div>
                                <div className="flex items-center justify-between">
                                    <Label>账户类型:</Label>
                                    <Button onClick={handleToggleAccountType} variant="outline"><Repeat className="w-4 h-4 mr-2"/>切换为 {user.is_test_user ? '真实账户' : '测试账户'}</Button>
                                </div>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader><CardTitle className="flex items-center gap-2"><Users className="w-5 h-5" /> 团队信息</CardTitle></CardHeader>
                            <CardContent><DownlineTree userId={user.id} /></CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}
