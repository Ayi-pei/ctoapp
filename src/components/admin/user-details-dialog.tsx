
"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { MessageSquare, Send, Users, Repeat, Archive, LoaderCircle } from "lucide-react";
import { useBalance } from "@/context/balance-context";
import { useAuth } from "@/context/auth-context";
import { availablePairs } from "@/types";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useAnnouncements } from "@/context/announcements-context";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { Investment, User } from '@/types';
import { useLogs } from "@/context/logs-context";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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
} from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase, isSupabaseEnabled } from "@/lib/supabaseClient";


type UserDetailsDialogProps = {
    user: User;
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    onUserUpdate: () => void; // Callback to refresh user list
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
        const loadDownline = async () => {
             if (!userId) return;
            setIsLoading(true);
            const fetchedDownline = await getDownline(userId);
            setDownline(fetchedDownline);
            setIsLoading(false);
        }
       loadDownline();
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
        <ul className="space-y-2 p-2 max-h-64 overflow-y-auto">
            {downline.map(member => (
                 <li key={member.id} className="flex items-center gap-2 p-2 bg-muted/50 rounded-md text-sm">
                    <Badge variant="outline">LV {(member as any).level || 0}</Badge>
                    <span>{member.username}</span>
                    <span className="text-xs text-muted-foreground">{new Date(member.created_at).toLocaleDateString()}</span>
                </li>
            ))}
        </ul>
    );
};


export function UserDetailsDialog({ user, isOpen, onOpenChange, onUserUpdate }: UserDetailsDialogProps) {
    const { updateUser, getUserById } = useAuth();
    const { adjustBalance } = useBalance();
    const { addAnnouncement } = useAnnouncements();
    const { addLog } = useLogs();
    const { toast } = useToast();

    const [currentUser, setCurrentUser] = useState<User | null>(user);
    const [isLoading, setIsLoading] = useState(true);
    const [newPassword, setNewPassword] = useState("");
    const [balanceAdjustments, setBalanceAdjustments] = useState<BalanceAdjustments>({});
    const [calculatedBalances, setCalculatedBalances] = useState<any>({});
    const [userInvestments, setUserInvestments] = useState<Investment[]>([]);
    const [creditScore, setCreditScore] = useState("100");
    const [messageTitle, setMessageTitle] = useState("");
    const [messageContent, setMessageContent] = useState("");

    const loadUserData = useCallback(async () => {
        if (!user || !isSupabaseEnabled) return;
        setIsLoading(true);
        const fetchedUser = await getUserById(user.id);
        if (fetchedUser) {
            setCurrentUser(fetchedUser);
            setCreditScore((fetchedUser.credit_score ?? 100).toString());
            
            const { data: balances, error: balanceError } = await supabase.from('balances').select('*').eq('user_id', fetchedUser.id);
            if (balanceError) console.error("Error fetching user balances:", balanceError);
            else {
                const formattedBalances = balances.reduce((acc, b) => {
                    acc[b.asset] = { available: b.available_balance, frozen: b.frozen_balance };
                    return acc;
                }, {} as any);
                setCalculatedBalances(formattedBalances);
            }
            
            const { data: investments, error: investmentError } = await supabase.from('investments').select('*').eq('user_id', fetchedUser.id);
             if (investmentError) console.error("Error fetching user investments:", investmentError);
             else setUserInvestments(investments as Investment[]);

        }
        setIsLoading(false);
    }, [user, getUserById]);

    useEffect(() => {
        if (isOpen) {
           loadUserData();
        }
    }, [isOpen, loadUserData]);
    
    const handleSuccessfulUpdate = () => {
        onUserUpdate(); // Notify parent to refresh the list
        loadUserData(); // Reload data inside the dialog
    }

    const handleAdjustmentChange = (asset: string, value: string) => {
        setBalanceAdjustments(prev => ({ ...prev, [asset]: value }));
    };

    const handleAdjustBalance = async (asset: string) => {
        if (!currentUser) return;
        const amountStr = balanceAdjustments[asset] || '0';
        const amount = parseFloat(amountStr);

        if (isNaN(amount) || amount === 0) {
            toast({ variant: "destructive", title: "错误", description: "请输入一个有效的、非零的调整值。" });
            return;
        }
        
        await adjustBalance(currentUser.id, asset, amount);

        toast({ title: "成功", description: `为 ${currentUser.username} 的 ${asset} 余额调整了 ${amount}。` });
        addLog({
            entity_type: 'request',
            entity_id: currentUser.id,
            action: 'update',
            details: `Adjusted ${asset} balance for user ${currentUser.username} by ${amount > 0 ? '+' : ''}${amount}.`
        });
        setBalanceAdjustments(prev => ({ ...prev, [asset]: ''}));
        
        handleSuccessfulUpdate();
    };

    const handlePasswordChange = async () => {
        if (!currentUser || !newPassword.trim()) {
            toast({ variant: "destructive", title: "错误", description: "请输入新密码。" });
            return;
        }
        const success = await updateUser(currentUser.id, { password: newPassword.trim() });

        if (success) {
            toast({ title: "成功", description: `用户 ${currentUser.username} 的密码已更新。` });
            addLog({
                entity_type: 'request',
                entity_id: currentUser.id,
                action: 'update',
                details: `Reset password for user ${currentUser.username}.`
            });
            setNewPassword("");
        } else {
             toast({ variant: "destructive", title: "失败", description: "更新密码失败。" });
        }
    };
    
    const handleToggleFreeze = async (freeze: boolean) => {
        if (!currentUser) return;
        const success = await updateUser(currentUser.id, { is_frozen: freeze });
        if (success) {
            toast({ title: "成功", description: `用户 ${currentUser.username} 已被${freeze ? '冻结' : '解冻'}。` });
            addLog({
                entity_type: 'request',
                entity_id: currentUser.id,
                action: 'update',
                details: `Set user ${currentUser.username} account status to ${freeze ? 'Frozen' : 'Active'}.`
            });
            handleSuccessfulUpdate();
        } else {
            toast({ variant: "destructive", title: "失败", description: "操作失败。" });
        }
    }

    const handleToggleAccountType = async () => {
        if (!currentUser) return;
        const newType = !currentUser.is_test_user;
        const success = await updateUser(currentUser.id, { is_test_user: newType });
        if (success) {
            toast({ title: "成功", description: `用户类型已更新为 ${newType ? '测试账户' : '真实账户'}` });
             addLog({
                entity_type: 'request',
                entity_id: currentUser.id,
                action: 'update',
                details: `Set user ${currentUser.username} account type to ${newType ? 'Test' : 'Real'}.`
            });
            handleSuccessfulUpdate();
        } else {
            toast({ variant: "destructive", title: "失败", description: "操作失败。" });
        }
    }
    
    const handleCreditScoreSave = async () => {
        if (!currentUser) return;
        const score = parseInt(creditScore, 10);
        if (isNaN(score)) {
            toast({ variant: "destructive", title: "错误", description: "请输入有效的信誉分数值。" });
            return;
        }
        const success = await updateUser(currentUser.id, { credit_score: score });
         if (success) {
            toast({ title: "成功", description: `用户 ${currentUser.username} 的信誉分已更新。` });
            addLog({
                entity_type: 'request',
                entity_id: currentUser.id,
                action: 'update',
                details: `Updated credit score for user ${currentUser.username} to ${score}.`
            });
             handleSuccessfulUpdate();
        } else {
            toast({ variant: "destructive", title: "失败", description: "操作失败。" });
        }
    };

    const handleSendMessage = async () => {
        if (!currentUser || !messageTitle.trim() || !messageContent.trim()) {
            toast({ variant: "destructive", title: "错误", description: "标题和内容不能为空。" });
            return;
        }
        
        await addAnnouncement({
            title: messageTitle,
            content: messageContent,
            user_id: currentUser.id,
        });
        
         await addLog({
            entity_type: 'request',
            entity_id: currentUser.id,
            action: 'create',
            details: `Sent message to user ${currentUser.username}. Title: ${messageTitle}`
        });

        toast({ title: "成功", description: `消息已发送给用户 ${currentUser.username}。` });
        setMessageTitle("");
        setMessageContent("");
    };

    const BalanceTab = () => (
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
                    {isLoading ? [...Array(3)].map((_, i) => (
                        <TableRow key={i}>
                            <TableCell colSpan={4}><Skeleton className="h-8 w-full" /></TableCell>
                        </TableRow>
                    )) : allAssets.map(asset => {
                        const balance = calculatedBalances?.[asset] || { available: 0, frozen: 0 };
                        if(balance.available === 0 && balance.frozen === 0 && !balanceAdjustments[asset]) return null;
                        return (
                            <TableRow key={asset}>
                                <TableCell className="font-medium">{asset}</TableCell>
                                <TableCell>{balance.available.toFixed(4)}</TableCell>
                                <TableCell>{balance.frozen.toFixed(4)}</TableCell>
                                <TableCell>
                                    <div className="flex items-center gap-2">
                                         <AlertDialog>
                                            <AlertDialogTrigger asChild>
                                                <Button size="sm" disabled={!balanceAdjustments[asset] || parseFloat(balanceAdjustments[asset]) === 0}>调整</Button>
                                            </AlertDialogTrigger>
                                            <AlertDialogContent>
                                                <AlertDialogHeader>
                                                <AlertDialogTitle>确认资金调整？</AlertDialogTitle>
                                                <AlertDialogDescription>
                                                    您确定要为用户 {currentUser?.username} 的 {asset} 余额调整 
                                                    <span className={cn("font-bold", parseFloat(balanceAdjustments[asset] || '0') >= 0 ? "text-green-500" : "text-red-500")}>
                                                        {parseFloat(balanceAdjustments[asset] || '0').toFixed(2)}
                                                    </span> 吗？此操作无法撤销。
                                                </AlertDialogDescription>
                                                </AlertDialogHeader>
                                                <AlertDialogFooter>
                                                <AlertDialogCancel>取消</AlertDialogCancel>
                                                <AlertDialogAction onClick={() => handleAdjustBalance(asset)}>确定</AlertDialogAction>
                                                </AlertDialogFooter>
                                            </AlertDialogContent>
                                        </AlertDialog>
                                        <Input type="text" placeholder="+/-" value={balanceAdjustments[asset] || ''} onChange={(e) => handleAdjustmentChange(asset, e.target.value)} className="h-9 w-24" id={`balance-adjustment-${asset}`} name={`balance-adjustment-${asset}`} />
                                    </div>
                                </TableCell>
                            </TableRow>
                        )
                    })}
                </TableBody>
            </Table>
        </CardContent>
    );

    const InvestmentTab = () => (
         <CardContent>
            {isLoading ? <Skeleton className="h-48 w-full" /> : userInvestments.length > 0 ? (
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
    );

    const MessageTab = () => (
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
    );

    const InfoTab = () => (
        <CardContent className="space-y-6">
            <Card>
                <CardHeader><CardTitle className="text-base">基本信息</CardTitle></CardHeader>
                <CardContent className="space-y-2 text-sm">
                    <p><strong>用户名:</strong> {currentUser?.username}</p>
                    <p><strong>昵称:</strong> {currentUser?.nickname}</p>
                    <p><strong>邀请码:</strong> {currentUser?.invitation_code || 'N/A'}</p>
                    <p><strong>邀请人ID:</strong> {currentUser?.inviter_id || '无'}</p>
                    <p><strong>注册日期:</strong> {currentUser ? new Date(currentUser.created_at).toLocaleDateString() : ''}</p>
                </CardContent>
            </Card>
            <Card>
                <CardHeader><CardTitle className="text-base">管理操作</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                     <div className="flex items-center space-x-2">
                        <Label htmlFor="new-password" className="flex-shrink-0">重置密码:</Label>
                        <Input id="new-password" name="new-password" type="text" placeholder="输入新密码" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
                        <AlertDialog>
                            <AlertDialogTrigger asChild><Button disabled={!newPassword}>确认</Button></AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                    <AlertDialogTitle>确认重置密码？</AlertDialogTitle>
                                    <AlertDialogDescription>这将把用户 {currentUser?.username} 的密码设置为新输入的值。</AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel>取消</AlertDialogCancel>
                                    <AlertDialogAction onClick={handlePasswordChange}>确定重置</AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                    </div>
                     <div className="flex items-center space-x-2">
                        <Label htmlFor="credit-score" className="flex-shrink-0">信誉分:</Label>
                        <Input id="credit-score" name="credit-score" type="number" value={creditScore} onChange={(e) => setCreditScore(e.target.value)} />
                        <Button onClick={handleCreditScoreSave}>保存</Button>
                    </div>
                    <div className="flex items-center justify-between">
                        <Label>账户状态:</Label>
                        {currentUser?.is_frozen ? (
                            <Button onClick={() => handleToggleFreeze(false)} variant="outline" className="text-green-600 border-green-600 hover:bg-green-500/10">解冻账户</Button>
                        ) : (
                            <Button onClick={() => handleToggleFreeze(true)} variant="destructive">冻结账户</Button>
                        )}
                    </div>
                    <div className="flex items-center justify-between">
                        <Label>账户类型:</Label>
                        <Button onClick={handleToggleAccountType} variant="outline"><Repeat className="w-4 h-4 mr-2"/>切换为 {currentUser?.is_test_user ? '真实账户' : '测试账户'}</Button>
                    </div>
                </CardContent>
            </Card>
        </CardContent>
    );

    const TeamTab = () => (
        <CardContent>
            <DownlineTree userId={user.id} />
        </CardContent>
    );

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle>用户详情: {user.username}</DialogTitle>
                </DialogHeader>
                {isLoading ? (
                     <div className="flex justify-center items-center h-96">
                        <LoaderCircle className="h-12 w-12 animate-spin text-primary" />
                    </div>
                ) : (
                    <Tabs defaultValue="balance" className="flex-grow flex flex-col overflow-hidden">
                        <TabsList className="grid w-full grid-cols-5">
                            <TabsTrigger value="balance">资产余额</TabsTrigger>
                            <TabsTrigger value="investments">理财订单</TabsTrigger>
                            <TabsTrigger value="message">发送消息</TabsTrigger>
                            <TabsTrigger value="info">账户管理</TabsTrigger>
                            <TabsTrigger value="team">团队信息</TabsTrigger>
                        </TabsList>
                        <div className="flex-grow overflow-y-auto mt-4">
                            <TabsContent value="balance"><BalanceTab /></TabsContent>
                            <TabsContent value="investments"><InvestmentTab /></TabsContent>
                            <TabsContent value="message"><MessageTab /></TabsContent>
                            <TabsContent value="info"><InfoTab /></TabsContent>
                            <TabsContent value="team"><TeamTab /></TabsContent>
                        </div>
                    </Tabs>
                )}
            </DialogContent>
        </Dialog>
    )
}
