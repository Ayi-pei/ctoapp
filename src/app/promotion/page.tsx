
"use client";

import { useState, useEffect } from "react";
import DashboardLayout from "@/components/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useAuth, User } from "@/context/auth-context";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BarChart2, Users } from "lucide-react";
import { supabase } from "@/lib/supabase";

type CommissionLog = {
    id: string;
    source_username: string;
    source_level: number;
    commission_amount: number;
    created_at: string;
};

export default function PromotionPage() {
    const { user } = useAuth();
    const [commissions, setCommissions] = useState<CommissionLog[]>([]);
    const [downline, setDownline] = useState<User[]>([]);

    useEffect(() => {
        if (user) {
            const loadData = async () => {
                // Load commission logs for the current user
                const { data: commissionData, error: commissionError } = await supabase
                    .from('commission_logs')
                    .select('*')
                    .eq('upline_user_id', user.id)
                    .order('created_at', { ascending: false });

                if (commissionError) {
                    console.error("Error loading commission logs:", commissionError);
                } else {
                    setCommissions(commissionData as CommissionLog[]);
                }

                // Load direct downline for the current user
                const { data: downlineData, error: downlineError } = await supabase
                    .from('users')
                    .select('*')
                    .eq('inviter', user.username);
                
                if (downlineError) {
                     console.error("Error loading downline:", downlineError);
                } else {
                    setDownline(downlineData as User[]);
                }
            };
            loadData();
        }
    }, [user]);

    const totalCommission = commissions.reduce((acc, curr) => acc + curr.commission_amount, 0);

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
                                您邀请的直属用户列表。
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="p-2">
                           <Table>
                               <TableHeader>
                                   <TableRow>
                                       <TableHead>用户名</TableHead>
                                       <TableHead>注册时间</TableHead>
                                   </TableRow>
                               </TableHeader>
                               <TableBody>
                                   {downline.length > 0 ? downline.map(member => (
                                       <TableRow key={member.id}>
                                           <TableCell className="font-medium">{member.username}</TableCell>
                                           <TableCell>{new Date(member.registered_at!).toLocaleDateString()}</TableCell>
                                       </TableRow>
                                   )) : (
                                        <TableRow>
                                           <TableCell colSpan={2} className="text-center text-muted-foreground h-24">
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
