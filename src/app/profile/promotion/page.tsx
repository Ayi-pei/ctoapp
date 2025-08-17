
"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import DashboardLayout from "@/components/dashboard-layout";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/context/auth-context";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Copy, Users, Download, Archive } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import type { User as DownlineMember, AnyRequest } from "@/types";
import { useBalance } from "@/context/balance-context";
import { useRequests } from "@/context/requests-context";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import QRCode from "qrcode.react";

const StatCard = ({ label, value }: { label: string, value: string | number }) => (
    <div className="text-center">
        <p className="text-2xl font-bold text-primary">{value}</p>
        <p className="text-xs text-muted-foreground">{label}</p>
    </div>
);

export default function PromotionPage() {
    const { user, getDownline } = useAuth();
    const { commissionLogs } = useBalance();
    const { requests } = useRequests();
    const { toast } = useToast();

    const [teamMembers, setTeamMembers] = useState<DownlineMember[]>([]);
    const [invitationLink, setInvitationLink] = useState('');
    const [teamStats, setTeamStats] = useState({
        totalDeposits: 0,
        totalWithdrawals: 0,
    });
    const qrCodeRef = useRef<HTMLDivElement>(null);

    const calculateTeamStats = useCallback((team: DownlineMember[], allRequests: AnyRequest[]) => {
        const teamIds = team.map(m => m.id);
        let totalDeposits = 0;
        let totalWithdrawals = 0;

        allRequests.forEach(req => {
            if (teamIds.includes(req.user_id) && req.status === 'approved') {
                if (req.type === 'deposit') {
                    totalDeposits += req.amount;
                } else if (req.type === 'withdrawal') {
                    totalWithdrawals += req.amount;
                }
            }
        });
        
        return { totalDeposits, totalWithdrawals };
    }, []);

    useEffect(() => {
        if (user) {
            // "团队人员"：代理团队包括自己不含上级代理的总注册人数
            const downline = getDownline(user.id);
            const fullTeam = [user, ...downline];
            setTeamMembers(fullTeam);
            
            if (typeof window !== 'undefined') {
                 const link = `${window.location.origin}/register?code=${user.invitation_code}`;
                 setInvitationLink(link);
            }
            
            // "总充值" / "总提现"
            const stats = calculateTeamStats(fullTeam, requests);
            setTeamStats(stats);
        }
    }, [user, getDownline, requests, calculateTeamStats]);

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        toast({
            title: "已复制",
            description: "内容已成功复制到剪贴板。",
        });
    };

    const downloadQRCode = () => {
        const canvas = qrCodeRef.current?.querySelector('canvas');
        if (canvas) {
            const link = document.createElement('a');
            link.download = `invitation-qrcode.png`;
            link.href = canvas.toDataURL('image/png');
            link.click();
        } else {
             toast({
                variant: 'destructive',
                title: "下载失败",
                description: "无法找到二维码图像。",
            });
        }
    };

    // "团队贡献": 代理线下级给自己带来的佣金总数
    const totalCommission = commissionLogs.reduce((acc, curr) => acc + curr.commission_amount, 0);

    const stats = {
        totalMembers: teamMembers.length,
        effectiveMembers: 0, // Placeholder
        todayEffectiveMembers: 0, // Placeholder
        totalWithdrawals: teamStats.totalWithdrawals.toFixed(2), 
        totalEarnings: totalCommission.toFixed(2), // This is Team Contribution
        todayEarnings: 0.00, // Placeholder
        yesterdayEarnings: 0.00, // Placeholder
        totalDeposits: teamStats.totalDeposits.toFixed(2),
    };

    const renderEmptyState = (text: string) => (
         <Card>
            <CardContent className="pt-6 flex flex-col items-center justify-center text-center h-48">
                 <Archive className="h-16 w-16 text-muted-foreground" />
                <p className="mt-4 text-muted-foreground">{text}</p>
            </CardContent>
        </Card>
    );


    return (
        <DashboardLayout>
            <div className="p-4 md:p-8 space-y-6">
                <Card className="bg-card/50">
                    <CardContent className="p-4 grid grid-cols-4 gap-y-4">
                        <StatCard label="总人数" value={stats.totalMembers} />
                        <StatCard label="团队有效人数" value={stats.effectiveMembers} />
                        <StatCard label="今日有效人数" value={stats.todayEffectiveMembers} />
                        <StatCard label="总提现" value={`$${stats.totalWithdrawals}`} />
                        <StatCard label="总收益" value={`$${stats.totalEarnings}`} />
                        <StatCard label="今日收益" value={`$${stats.todayEarnings}`} />
                        <StatCard label="昨日收益" value={`$${stats.yesterdayEarnings}`} />
                        <StatCard label="总充值" value={`$${stats.totalDeposits}`} />
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-4 space-y-4">
                        <div>
                            <p className="text-sm font-medium mb-2">邀请链接</p>
                            <div className="flex items-center gap-2 p-2 pl-4 border rounded-md bg-muted">
                                <span className="flex-1 text-sm text-muted-foreground truncate">{invitationLink}</span>
                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => copyToClipboard(invitationLink)}>
                                    <Copy className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>

                         <div className="flex items-center gap-4">
                             <div ref={qrCodeRef} className="p-2 border rounded-md bg-white">
                                <QRCode value={invitationLink || 'loading'} size={80} />
                             </div>
                             <div className="flex-1 space-y-2">
                                <div className="flex items-center gap-2 p-2 pl-4 border rounded-md bg-muted">
                                    <span className="flex-1 text-sm text-muted-foreground">邀请码: {user?.invitation_code}</span>
                                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => copyToClipboard(user?.invitation_code || '')}>
                                        <Copy className="h-4 w-4" />
                                    </Button>
                                </div>
                                <Button className="w-full" variant="outline" onClick={downloadQRCode}>
                                    <Download className="mr-2 h-4 w-4" />
                                    保存二维码
                                </Button>
                             </div>
                         </div>

                    </CardContent>
                </Card>

                <Tabs defaultValue="rewards">
                    <TabsList className="grid w-full grid-cols-3 bg-card">
                        <TabsTrigger value="rewards">奖励详情</TabsTrigger>
                        <TabsTrigger value="team">团队人员</TabsTrigger>
                        <TabsTrigger value="contribution">团队贡献</TabsTrigger>
                    </TabsList>
                    <TabsContent value="rewards" className="mt-4">
                        {renderEmptyState("暂无其他奖励记录")}
                    </TabsContent>
                    <TabsContent value="team" className="mt-4">
                         {teamMembers.length > 0 ? (
                           <Card>
                               <CardContent className="p-0">
                                   <Table>
                                       <TableHeader>
                                           <TableRow>
                                               <TableHead>用户名</TableHead>
                                               <TableHead>级别</TableHead>
                                               <TableHead>注册时间</TableHead>
                                           </TableRow>
                                       </TableHeader>
                                       <TableBody>
                                           {teamMembers.map(member => (
                                               <TableRow key={member.id}>
                                                   <TableCell className="font-medium">{member.username}</TableCell>
                                                   <TableCell>LV {(member as any).level || 0}</TableCell>
                                                   <TableCell>{new Date(member.created_at).toLocaleDateString()}</TableCell>
                                               </TableRow>
                                           ))}
                                       </TableBody>
                                   </Table>
                               </CardContent>
                           </Card>
                       ) : renderEmptyState("您还没有邀请任何用户")}
                    </TabsContent>
                     <TabsContent value="contribution" className="mt-4">
                        {commissionLogs.length > 0 ? (
                             <Card>
                                <CardContent className="p-0">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>来源用户</TableHead>
                                                <TableHead>级别</TableHead>
                                                <TableHead className="text-right">金额 (USDT)</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {commissionLogs.map(log => (
                                                <TableRow key={log.id}>
                                                    <TableCell>{log.source_username}</TableCell>
                                                    <TableCell>LV {log.source_level}</TableCell>
                                                    <TableCell className="text-right text-green-500 font-semibold">+{log.commission_amount.toFixed(4)}</TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </CardContent>
                            </Card>
                        ) : renderEmptyState("暂无佣金记录")}
                    </TabsContent>
                </Tabs>
            </div>
        </DashboardLayout>
    );
}
