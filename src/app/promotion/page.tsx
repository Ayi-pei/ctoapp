
"use client";

import { useState, useEffect } from "react";
import DashboardLayout from "@/components/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/auth-context";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CommissionLog } from "@/types";
import { BarChart2, Users } from "lucide-react";


export default function PromotionPage() {
    const { toast } = useToast();
    const { user } = useAuth();
    const [commissions, setCommissions] = useState<CommissionLog[]>([]);
    const [downline, setDownline] = useState<string[]>([]);

    useEffect(() => {
        if (user?.username) {
            // Load commission logs for the current user
            try {
                const allCommissions = JSON.parse(localStorage.getItem('commissionLogs') || '[]') as CommissionLog[];
                const userCommissions = allCommissions
                    .filter(c => c.uplineUsername === user.username)
                    .sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
                setCommissions(userCommissions);
            } catch(e) {
                console.error("Error loading commission logs:", e);
                setCommissions([]);
            }

            // Load direct downline for the current user
            try {
                const allUsers = JSON.parse(localStorage.getItem('users') || '[]') as any[];
                const currentUser = allUsers.find(u => u.username === user.username);
                if (currentUser && currentUser.inviter) {
                    // Regular users can only see their direct inviter
                    const inviter = allUsers.find(u => u.username === currentUser.inviter);
                    if (inviter) {
                         setDownline([inviter.username]);
                    }
                } else if (currentUser && currentUser.isAdmin) {
                    // Admin sees all users they invited
                    const adminDownline = allUsers.filter(u => u.inviter === user.username).map(u => u.username);
                    setDownline(adminDownline);
                }

            } catch(e) {
                console.error("Error loading downline:", e);
                setDownline([]);
            }

        }
    }, [user]);

    return (
        <DashboardLayout>
            <div className="p-4 md:p-8 space-y-6">
                <h1 className="text-2xl font-bold">推广中心</h1>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <Card>
                         <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Users className="h-6 w-6 text-primary" />
                                <span>我的团队</span>
                            </CardTitle>
                            <CardDescription>
                                {user?.isAdmin ? '您邀请的直属用户列表。' : '您的邀请人。'}
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="p-2">
                           <Table>
                               <TableHeader>
                                   <TableRow>
                                       <TableHead>{user?.isAdmin ? '用户名' : '邀请人'}</TableHead>
                                   </TableRow>
                               </TableHeader>
                               <TableBody>
                                   {downline.length > 0 ? downline.map(username => (
                                       <TableRow key={username}>
                                           <TableCell className="font-medium">{username}</TableCell>
                                       </TableRow>
                                   )) : (
                                        <TableRow>
                                           <TableCell className="text-center text-muted-foreground h-24">
                                               {user?.isAdmin ? '您还没有邀请任何用户。' : '您没有邀请人信息。'}
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

    