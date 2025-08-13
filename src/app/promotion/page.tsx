
"use client";

import { useState, useEffect } from "react";
import DashboardLayout from "@/components/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Copy, Users, BarChart2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth, User } from "@/context/auth-context";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CommissionLog } from "@/types";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";


type DownlineMember = User & {
    level: number;
    children?: DownlineMember[];
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
                const allUsers: User[] = JSON.parse(localStorage.getItem('users') || '[]') as User[];
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

                const userDownline = getDownlineRecursive(user.username, 1);
                setDownline(userDownline);

            } catch (error) {
                 console.error("Failed to load user downline:", error);
                 setDownline([]);
            }
        }
    }, [user]);

    const renderDownline = (members: DownlineMember[]) => {
        if (!members || members.length === 0) {
            return <p className="text-sm text-muted-foreground p-4 text-center">您还没有邀请任何成员。</p>;
        }
        return (
             <Accordion type="multiple" className="w-full">
                {members.map(member => (
                    <AccordionItem value={member.username} key={member.username} className="border-b-0">
                         <AccordionTrigger className="py-2 hover:no-underline px-4">
                            <div className="flex items-center gap-2">
                                <span className={`text-xs font-semibold px-2 py-1 rounded-md bg-muted text-muted-foreground`}>
                                    LV {member.level}
                                </span>
                                <span>{member.username}</span>
                            </div>
                        </AccordionTrigger>
                        <AccordionContent className="pl-6 border-l border-dashed ml-5">
                            {renderDownline(member.children || [])}
                        </AccordionContent>
                    </AccordionItem>
                ))}
            </Accordion>
        )
    }

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
                        <CardContent className="p-0">
                             {renderDownline(downline)}
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
