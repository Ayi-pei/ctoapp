
"use client";

import { useState, useEffect, useCallback } from "react";
import DashboardLayout from "@/components/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useAuth } from "@/context/auth-context";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BarChart2, Users, Copy } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";

type CommissionLog = {
    id: string;
    source_username: string;
    source_level: number;
    commission_amount: number;
    created_at: string;
};

type DownlineMember = {
    username: string;
    level: number;
    created_at: string;
};


export default function PromotionPage() {
    const { user } = useAuth();
    const { toast } = useToast();
    const [commissions, setCommissions] = useState<CommissionLog[]>([]);
    const [downline, setDownline] = useState<DownlineMember[]>([]);

    const loadData = useCallback(async () => {
        if (!user) return;
        try {
            // Load commission logs
            const { data: commissionData, error: commissionError } = await supabase
                .from('commission_logs')
                .select('*')
                .eq('upline_user_id', user.id)
                .order('created_at', { ascending: false });

            if (commissionError) throw commissionError;
            setCommissions(commissionData as CommissionLog[]);

            // Load downline team
            const { data: downlineData, error: downlineError } = await supabase
                .rpc('get_user_downline', { p_user_id: user.id });
            
            if (downlineError) throw downlineError;
            setDownline(downlineData as DownlineMember[]);
        } catch (error) {
            console.error("Error loading promotion data:", error);
            toast({ variant: "destructive", title: "错误", description: "加载推广数据失败。" });
        }
    }, [user, toast]);

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
                                       <TableRow key={member.username}>
                                           <TableCell className="font-medium">{member.username}</TableCell>
                                           <TableCell>
                                                <Badge variant="outline">LV {member.level}</Badge>
                                           </TableCell>
                                           <TableCell>{new Date(member.created_at!).toLocaleDateString()}</TableCell>
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
    