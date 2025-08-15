
"use client";

import { useState, useEffect, useCallback } from "react";
import DashboardLayout from "@/components/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useAuth } from "@/context/auth-context";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BarChart2, Users, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import type { CommissionLog, User as DownlineMember } from "@/types";


export default function PromotionPage() {
    const { user, getDownline, getUserById } = useAuth();
    const { toast } = useToast();
    const [commissions, setCommissions] = useState<CommissionLog[]>([]);
    const [downline, setDownline] = useState<DownlineMember[]>([]);

    const getLevel = useCallback((targetUser: DownlineMember, uplineId: string, allUsers: { [key: string]: DownlineMember }) => {
        let currentUser = targetUser;
        let level = 1;
        while(currentUser.inviter_id && currentUser.inviter_id !== uplineId && level < 4) {
            currentUser = allUsers[currentUser.inviter_id];
            if (!currentUser) return -1; // Should not happen
            level++;
        }
        return currentUser.inviter_id === uplineId ? level : -1;
    }, []);

    const loadData = useCallback(async () => {
        if (!user) return;
        
        // Mock data since we have no real trades
        const mockCommissions: CommissionLog[] = [
            { id: 'cl1', upline_user_id: user.id, source_user_id: 'user2', source_username: 'testuser2', source_level: 1, trade_amount: 1000, commission_rate: 0.08, commission_amount: 80, created_at: new Date().toISOString() },
            { id: 'cl2', upline_user_id: user.id, source_user_id: 'user3', source_username: 'testuser3', source_level: 2, trade_amount: 500, commission_rate: 0.05, commission_amount: 25, created_at: new Date().toISOString() },
        ];
        
        const allDownline = getDownline(user.id);
        setDownline(allDownline);
        setCommissions(mockCommissions);

    }, [user, getDownline]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const copyToClipboard = () => {
        if (user?.invitation_code) {
            navigator.clipboard.writeText(user.invitation_code);
            toast({
                title: "已复制",
                description: "您的邀请码已成功复制到剪贴板。",
            });
        }
    };

    const totalCommission = commissions.reduce((acc, curr) => acc + curr.commission_amount, 0);

    const getMemberLevel = (member: DownlineMember) => {
        if (!user || !user.id) return 0;
        if (member.inviter_id === user.id) return 1;
        
        const inviter = getUserById(member.inviter_id!);
        if (!inviter) return 0;

        if (inviter.inviter_id === user.id) return 2;

        const grandInviter = getUserById(inviter.inviter_id!);
        if (!grandInviter) return 0;
        
        if(grandInviter.inviter_id === user.id) return 3;

        return 0;
    }

    return (
        <DashboardLayout>
            <div className="p-4 md:p-8 space-y-6">
                <h1 className="text-2xl font-bold">推广中心</h1>

                <Card>
                    <CardHeader>
                        <CardTitle>我的邀请码</CardTitle>
                        <CardDescription>使用您的专属邀请码邀请新用户加入，并从他们的交易中赚取佣金。</CardDescription>
                    </CardHeader>
                    <CardContent className="flex flex-col md:flex-row items-center gap-4">
                        <div className="flex-1 w-full p-4 text-center border-2 border-dashed rounded-lg bg-muted">
                            <span className="text-3xl font-bold tracking-widest">{user?.invitation_code || '...'}</span>
                        </div>
                        <div className="flex gap-2">
                             <Button onClick={copyToClipboard} size="lg" variant="outline">
                                <Copy className="mr-2 h-5 w-5" />
                                复制
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <Card>
                         <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Users className="h-6 w-6 text-primary" />
                                <span>我的团队 (3级内)</span>
                            </CardTitle>
                            <CardDescription>
                                您邀请的直属与间接用户列表。
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="p-2">
                           <Table>
                               <TableHeader>
                                   <TableRow>
                                       <TableHead>用户名</TableHead>
                                       <TableHead>级别</TableHead>
                                       <TableHead>注册时间</TableHead>
                                   </TableRow>
                               </TableHeader>
                               <TableBody>
                                   {downline.length > 0 ? downline.map(member => (
                                       <TableRow key={member.id}>
                                           <TableCell className="font-medium">{member.username}</TableCell>
                                           <TableCell>
                                                <Badge variant="outline">LV {getMemberLevel(member)}</Badge>
                                           </TableCell>
                                           <TableCell>{new Date(member.created_at).toLocaleDateString()}</TableCell>
                                       </TableRow>
                                   )) : (
                                        <TableRow>
                                           <TableCell colSpan={3} className="text-center text-muted-foreground h-24">
                                               您还没有邀请任何用户。
                                           </TableCell>
                                       </TableRow>
                                   )}
                               </TableBody>
                           </Table>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                             <CardTitle className="flex items-center gap-2">
                                <BarChart2 className="h-6 w-6 text-primary" />
                                <span>佣金明细</span>
                            </CardTitle>
                             <CardDescription>
                                累计总佣金: <span className="font-bold text-green-500">{totalCommission.toFixed(4)} USDT</span>
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>来源用户</TableHead>
                                        <TableHead>级别</TableHead>
                                        <TableHead className="text-right">金额 (USDT)</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                   {commissions.length > 0 ? commissions.map(log => (
                                        <TableRow key={log.id}>
                                            <TableCell>{log.source_username}</TableCell>
                                            <TableCell>LV {log.source_level}</TableCell>
                                            <TableCell className="text-right text-green-500 font-semibold">+{log.commission_amount.toFixed(4)}</TableCell>
                                        </TableRow>
                                    )) : (
                                        <TableRow>
                                            <TableCell colSpan={3} className="text-center text-muted-foreground h-24">
                                                暂无佣金记录。
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </DashboardLayout>
    );
}
