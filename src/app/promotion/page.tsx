
"use client";

import { useState, useEffect } from "react";
import DashboardLayout from "@/components/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Copy, Users, BarChart2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/auth-context";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CommissionLog } from "@/types";
import { DownlineTree } from "@/components/downline-tree";


export default function PromotionPage() {
    const { toast } = useToast();
    const { user } = useAuth();
    const [commissions, setCommissions] = useState<CommissionLog[]>([]);

    const copyToClipboard = () => {
        if (user?.invitationCode) {
            navigator.clipboard.writeText(user.invitationCode);
            toast({
                title: "已复制",
                description: "您的邀请码已成功复制到剪贴板。",
            });
        }
    };
    
    useEffect(() => {
        if (user?.username) {
            // Load commission logs
            try {
                const allCommissions = JSON.parse(localStorage.getItem('commissionLogs') || '[]') as CommissionLog[];
                const userCommissions = allCommissions
                    .filter(c => c.uplineUsername === user.username)
                    .sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
                setCommissions(userCommissions);
            } catch(e) {
                console.error(e);
                setCommissions([]);
            }
        }
    }, [user]);

    return (
        <DashboardLayout>
            <div className="p-4 md:p-8 space-y-6">
                <h1 className="text-2xl font-bold">推广中心</h1>

                <Card>
                    <CardHeader>
                        <CardTitle>我的邀请码</CardTitle>
                        <CardDescription>邀请好友加入，获取丰厚交易佣金返利。</CardDescription>
                    </CardHeader>
                    <CardContent className="flex flex-col md:flex-row items-center gap-4">
                        <div className="flex-1 w-full p-4 text-center border-2 border-dashed rounded-lg bg-muted">
                            <span className="text-3xl font-bold tracking-widest">{user?.invitationCode || '加载中...'}</span>
                        </div>
                        <Button onClick={copyToClipboard} size="lg">
                            <Copy className="mr-2 h-5 w-5" />
                            复制邀请码
                        </Button>
                    </CardContent>
                </Card>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <Card>
                         <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Users className="h-6 w-6 text-primary" />
                                <span>我的团队</span>
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-2">
                             {user && <DownlineTree username={user.username} />}
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                             <CardTitle className="flex items-center gap-2">
                                <BarChart2 className="h-6 w-6 text-primary" />
                                <span>佣金明细</span>
                            </CardTitle>
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
                                            <TableCell>{log.sourceUsername}</TableCell>
                                            <TableCell>LV {log.sourceLevel}</TableCell>
                                            <TableCell className="text-right text-green-500 font-semibold">+{log.commissionAmount.toFixed(4)}</TableCell>
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
