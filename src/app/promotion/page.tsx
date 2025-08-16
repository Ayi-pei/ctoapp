

"use client";

import { useState, useEffect, useRef } from "react";
import DashboardLayout from "@/components/dashboard-layout";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/context/auth-context";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Copy, Users, BarChart2, Download, Archive } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import type { User as DownlineMember } from "@/types";
import { useBalance } from "@/context/balance-context";
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
    const { toast } = useToast();
    const [downline, setDownline] = useState<DownlineMember[]>([]);
    const [invitationLink, setInvitationLink] = useState('');
    const qrCodeRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (user) {
            const allDownline = getDownline(user.id);
            setDownline(allDownline);
            
            if (typeof window !== 'undefined') {
                 const link = `${window.location.origin}/register?code=${user.invitation_code}`;
                 setInvitationLink(link);
            }
        }
    }, [user, getDownline]);

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


    const totalCommission = commissionLogs.reduce((acc, curr) => acc + curr.commission_amount, 0);

    const stats = {
        totalMembers: downline.length,
        effectiveMembers: 0, // Placeholder
        todayEffectiveMembers: 0, // Placeholder
        totalWithdrawals: 0.00, // Placeholder
        totalEarnings: totalCommission.toFixed(2),
        todayEarnings: 0.00, // Placeholder
        yesterdayEarnings: 0.00, // Placeholder
        totalDeposits: 0.00, // Placeholder
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
                    <TabsContent value="team" className="mt-4">
                         {downline.length > 0 ? (
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
                                           {downline.map(member => (
                                               <TableRow key={member.id}>
                                                   <TableCell className="font-medium">{member.username}</TableCell>
                                                   <TableCell>LV {(member as any).level}</TableCell>
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
                        {renderEmptyState("团队贡献数据即将推出")}
                    </TabsContent>
                </Tabs>
            </div>
        </DashboardLayout>
    );
}
