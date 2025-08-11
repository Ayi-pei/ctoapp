
"use client";

import { useState, useEffect, useCallback } from "react";
import DashboardLayout from "@/components/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Copy, Users, BarChart2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth, User } from "@/context/auth-context";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CommissionLog } from "@/types";

type FullUser = User & {
    invitationCode: string;
    inviter: string | null;
    downline: string[];
    registeredAt?: string;
};

type DownlineMember = {
    username: string;
    level: number;
    registeredAt: string;
};

export default function PromotionPage() {
    const { toast } = useToast();
    const { user } = useAuth();
    const [downline, setDownline] = useState<DownlineMember[]>([]);
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

            // Fetch full downline details
            try {
                const allUsers: FullUser[] = JSON.parse(localStorage.getItem('users') || '[]') as FullUser[];
                const userMap = new Map(allUsers.map(u => [u.username, u]));
                
                const getDownline = (username: string, level: number, maxLevel: number): DownlineMember[] => {
                    if (level > maxLevel) return [];
                    
                    const directDownlineUser = userMap.get(username);
                    if (!directDownlineUser || !directDownlineUser.downline) return [];
                    
                    let members: DownlineMember[] = [];
                    for (const downlineName of directDownlineUser.downline) {
                        const downlineUserObject = userMap.get(downlineName);
                        if (downlineUserObject) {
                            members.push({
                                username: downlineUserObject.username,
                                level: level,
                                registeredAt: downlineUserObject.registeredAt || new Date().toISOString(),
                            });
                            // Recursively get the next level
                            members = members.concat(getDownline(downlineName, level + 1, maxLevel));
                        }
                    }
                    return members;
                };

                const userDownline = getDownline(user.username, 1, 3);
                setDownline(userDownline);

            } catch (error) {
                 console.error("Failed to load user downline:", error);
                 setDownline([]);
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
                            <span className="text-3xl font-bold tracking-widest">{user?.invitationCode || '...'}</span>
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
                        <CardContent>
                             <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>用户名</TableHead>
                                        <TableHead>代理级别</TableHead>
                                        <TableHead className="text-right">注册时间</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {downline.length > 0 ? downline.map(member => (
                                        <TableRow key={member.username}>
                                            <TableCell>{member.username}</TableCell>
                                            <TableCell>LV {member.level}</TableCell>
                                            <TableCell className="text-right text-xs">{new Date(member.registeredAt || Date.now()).toLocaleDateString()}</TableCell>
                                        </TableRow>
                                    )) : (
                                         <TableRow>
                                            <TableCell colSpan={3} className="text-center text-muted-foreground">
                                                您还没有邀请任何成员。
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
                                            <TableCell colSpan={3} className="text-center text-muted-foreground">
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
