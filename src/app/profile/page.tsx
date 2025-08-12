
"use client";

import { useState, useCallback, useEffect } from "react";
import DashboardLayout from "@/components/dashboard-layout";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/auth-context";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ChevronRight, Clock, Shield, BarChart, Bell, LogOut, ArrowDownToLine, ArrowUpFromLine, FileText, Share2, Settings, Globe, MessageSquare, CreditCard } from "lucide-react";
import { DepositDialog } from "@/components/deposit-dialog";
import { WithdrawDialog } from "@/components/withdraw-dialog";
import { useBalance } from "@/context/balance-context";
import type { Transaction } from "@/types";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const ProfileHeader = () => {
    const { user } = useAuth();
    const { balances } = useBalance();
    const [isDepositOpen, setIsDepositOpen] = useState(false);
    const [isWithdrawOpen, setIsWithdrawOpen] = useState(false);

    const totalBalance = Object.values(balances).reduce((acc, b) => acc + b.available, 0);

     return (
        <div className="relative bg-gradient-to-b from-blue-400 to-blue-600 p-6 text-white text-center rounded-b-3xl -mx-4 -mt-4 mb-6">
            <div className="absolute top-4 right-4">
                 <Bell className="w-6 h-6" />
            </div>
            <div className="flex flex-col items-center">
                <Avatar className="h-20 w-20 mb-3 border-2 border-white">
                    <AvatarImage src={user?.avatar} alt={user?.username} />
                    <AvatarFallback>{user?.username?.charAt(0).toUpperCase()}</AvatarFallback>
                </Avatar>
                <h2 className="font-semibold text-lg">{user?.username}</h2>
                <p className="text-sm">余额: {totalBalance.toFixed(2)} USDT</p>
                <p className="text-sm mt-1"><Badge variant="secondary">信誉分: 100</Badge></p>

                 <div className="flex gap-4 mt-4">
                    <Button onClick={() => setIsDepositOpen(true)} className="bg-white/20 hover:bg-white/30 text-white">充值</Button>
                    <Button onClick={() => setIsWithdrawOpen(true)} className="bg-white/20 hover:bg-white/30 text-white">提现</Button>
                </div>
            </div>
            <DepositDialog isOpen={isDepositOpen} onOpenChange={setIsDepositOpen} />
            <WithdrawDialog isOpen={isWithdrawOpen} onOpenChange={setIsWithdrawOpen} />
        </div>
    );
};


const ListItem = ({ icon, label, href, onClick }: { icon: React.ElementType, label: string, href?: string, onClick?: () => void }) => {
    const content = (
         <div className="flex items-center justify-between p-4 bg-card rounded-lg hover:bg-muted cursor-pointer">
            <div className="flex items-center gap-4">
                {React.createElement(icon, { className: "w-6 h-6 text-primary" })}
                <span className="font-medium">{label}</span>
            </div>
            <ChevronRight className="w-5 h-5 text-muted-foreground" />
        </div>
    );

    if (href) {
        return <Link href={href}>{content}</Link>;
    }
    return <div onClick={onClick}>{content}</div>;
};


const TransactionHistory = () => {
    const { user } = useAuth();
    const [transactions, setTransactions] = useState<Transaction[]>([]);

     const statusVariant: { [key: string]: "default" | "secondary" | "destructive" } = {
        'pending': 'secondary',
        'approved': 'default',
        'rejected': 'destructive'
    }

    const statusText: { [key: string]: string } = {
        'pending': '待审核',
        'approved': '已批准',
        'rejected': '已拒绝'
    }

    const loadUserTransactions = useCallback(() => {
        if (user) {
            try {
                const allTransactions = JSON.parse(localStorage.getItem('transactions') || '[]') as Transaction[];
                const userTransactions = allTransactions
                    .filter(t => t.userId === user.username)
                    .sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
                setTransactions(userTransactions.slice(0, 5)); // Only show latest 5
            } catch (error) {
                console.error("Failed to fetch transactions from localStorage", error);
            }
        }
    }, [user]);

    useEffect(() => {
        loadUserTransactions();
        
        const handleStorageChange = (event: StorageEvent) => {
            if (event.key === 'transactions') {
                loadUserTransactions();
            }
        };

        window.addEventListener('storage', handleStorageChange);
        return () => window.removeEventListener('storage', handleStorageChange);
    }, [loadUserTransactions]);

    return (
         <Card>
            <CardHeader>
                <CardTitle className="text-lg">最近记录</CardTitle>
            </CardHeader>
            <CardContent>
                {transactions.length > 0 ? (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>类型</TableHead>
                                <TableHead>资产</TableHead>
                                <TableHead>金额</TableHead>
                                <TableHead>状态</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {transactions.map(t => (
                                <TableRow key={t.id}>
                                    <TableCell>
                                        <span className={cn("font-semibold", t.type === 'deposit' ? 'text-green-500' : 'text-orange-500')}>
                                            {t.type === 'deposit' ? '充币' : '提币'}
                                        </span>
                                    </TableCell>
                                    <TableCell>{t.asset}</TableCell>
                                    <TableCell>{t.amount.toFixed(2)}</TableCell>
                                    <TableCell>
                                        <Badge variant={statusVariant[t.status]} className={cn(
                                            t.status === 'approved' && 'bg-green-500/20 text-green-500',
                                            t.status === 'pending' && 'bg-yellow-500/20 text-yellow-500',
                                            t.status === 'rejected' && 'bg-red-500/20 text-red-500',
                                        )}>
                                            {statusText[t.status]}
                                        </Badge>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                ) : (
                    <p className="text-muted-foreground text-center py-4">暂无记录</p>
                )}
            </CardContent>
        </Card>
    )
}

export default function ProfilePage() {
    const { logout } = useAuth();
    
    const menuItems = [
        { label: "交易订单", icon: FileText, href: "/coming-soon" },
        { label: "支付方式", icon: CreditCard, href: "/coming-soon" },
        { label: "推广分享海报", icon: Share2, href: "/promotion" },
        { label: "安全设置", icon: Shield, href: "/profile/settings" },
        { label: "更换语言", icon: Globe, href: "/coming-soon" },
        { label: "用户消息", icon: MessageSquare, href: "/coming-soon" },
        { label: "平台公告", icon: Bell, href: "/coming-soon" },
    ]

    return (
        <DashboardLayout>
            <div className="p-4 space-y-6">
                <ProfileHeader />
                <TransactionHistory />

                <div className="space-y-2">
                    {menuItems.map(item => (
                        <ListItem key={item.label} {...item} />
                    ))}
                    <ListItem icon={LogOut} label="退出登陆" onClick={logout} />
                </div>
            </div>
        </DashboardLayout>
    );
}
