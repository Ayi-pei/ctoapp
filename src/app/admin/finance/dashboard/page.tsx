
"use client";

import { useEffect, useState, useMemo } from 'react';
import { useAuth } from '@/context/auth-context';
import { useRequests } from '@/context/requests-context';
import DashboardLayout from '@/components/dashboard-layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { User, Users, UserCheck, UserX, ArrowUpCircle, ArrowDownCircle, Briefcase, CalendarDays, ClipboardList } from 'lucide-react';
import { User as UserType, AnyRequest } from '@/types';
import { isToday, isThisMonth, parseISO } from 'date-fns';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from 'recharts';


const StatCard = ({ title, value, icon: Icon, description }: { title: string, value: string | number, icon: React.ElementType, description?: string }) => (
    <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{title}</CardTitle>
            <Icon className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
            <div className="text-2xl font-bold">{value}</div>
            {description && <p className="text-xs text-muted-foreground">{description}</p>}
        </CardContent>
    </Card>
);

const getAllUsers = (): UserType[] => {
    if (typeof window === 'undefined') return [];
    const storedUsers = localStorage.getItem('tradeflow_users');
    return storedUsers ? Object.values(JSON.parse(storedUsers)) : [];
};


export default function AdminFinanceDashboardPage() {
    const { getDownline } = useAuth();
    const { requests } = useRequests();
    const [allUsers, setAllUsers] = useState<UserType[]>([]);

    useEffect(() => {
        setAllUsers(getAllUsers());
    }, []);
    
    const financialStats = useMemo(() => {
        const approvedRequests = requests.filter(r => r.status === 'approved');
        const deposits = approvedRequests.filter(r => r.type === 'deposit');
        const withdrawals = approvedRequests.filter(r => r.type === 'withdrawal');

        const calculateTotal = (reqs: AnyRequest[]) => reqs.reduce((sum, r) => sum + ((r as any).amount || 0), 0);

        const dailyDeposits = calculateTotal(deposits.filter(r => isToday(parseISO(r.created_at))));
        const monthlyDeposits = calculateTotal(deposits.filter(r => isThisMonth(parseISO(r.created_at))));
        const totalDeposits = calculateTotal(deposits);

        const dailyWithdrawals = calculateTotal(withdrawals.filter(r => isToday(parseISO(r.created_at))));
        const monthlyWithdrawals = calculateTotal(withdrawals.filter(r => isThisMonth(parseISO(r.created_at))));
        const totalWithdrawals = calculateTotal(withdrawals);

        return {
            dailyDeposits,
            monthlyDeposits,
            totalDeposits,
            dailyWithdrawals,
            monthlyWithdrawals,
            totalWithdrawals
        };
    }, [requests]);

    const userStats = useMemo(() => {
        const totalUsers = allUsers.length;
        const now = new Date();
        const onlineUsers = allUsers.filter(u => u.last_login_at && (now.getTime() - new Date(u.last_login_at).getTime()) < 5 * 60 * 1000).length;
        const offlineUsers = totalUsers - onlineUsers;
        
        const adminUser = allUsers.find(u => u.is_admin);
        const downline = adminUser ? getDownline(adminUser.id) : [];

        const level1 = downline.filter(u => (u as any).level === 1).length;
        const level2 = downline.filter(u => (u as any).level === 2).length;
        const level3 = downline.filter(u => (u as any).level === 3).length;

        return { totalUsers, onlineUsers, offlineUsers, level1, level2, level3 };
    }, [allUsers, getDownline]);

    const chartData = [
        { name: '总计', 充值: financialStats.totalDeposits, 提现: financialStats.totalWithdrawals },
        { name: '本月', 充值: financialStats.monthlyDeposits, 提现: financialStats.monthlyWithdrawals },
        { name: '今日', 充值: financialStats.dailyDeposits, 提现: financialStats.dailyWithdrawals },
    ];


    return (
        <DashboardLayout>
             <div className="p-4 md:p-8 space-y-6">
                 <h1 className="text-2xl font-bold">运营数据报表</h1>

                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    <StatCard title="历史注册用户" value={userStats.totalUsers} icon={Users} description="平台所有注册用户总数" />
                    <StatCard title="在线人数" value={userStats.onlineUsers} icon={UserCheck} description="5分钟内有活动的用户" />
                    <StatCard title="离线人数" value={userStats.offlineUsers} icon={UserX} description="当前不在线的用户" />
                </div>
                
                <Card>
                    <CardHeader>
                        <CardTitle>出入款统计</CardTitle>
                        <CardDescription>历史、当月及当日的充值与提现金额汇总</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                             <StatCard title="历史总充值" value={`$${financialStats.totalDeposits.toFixed(2)}`} icon={ArrowUpCircle} />
                             <StatCard title="当月充值" value={`$${financialStats.monthlyDeposits.toFixed(2)}`} icon={CalendarDays} />
                             <StatCard title="当日充值" value={`$${financialStats.dailyDeposits.toFixed(2)}`} icon={User} />

                             <StatCard title="历史总提现" value={`$${financialStats.totalWithdrawals.toFixed(2)}`} icon={ArrowDownCircle} />
                             <StatCard title="当月提现" value={`$${financialStats.monthlyWithdrawals.toFixed(2)}`} icon={CalendarDays} />
                             <StatCard title="当日提现" value={`$${financialStats.dailyWithdrawals.toFixed(2)}`} icon={User} />
                        </div>
                        <div className="h-80">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={chartData}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="name" />
                                    <YAxis />
                                    <Tooltip
                                        contentStyle={{
                                            backgroundColor: 'hsl(var(--background))',
                                            borderColor: 'hsl(var(--border))'
                                        }}
                                    />
                                    <Legend />
                                    <Bar dataKey="充值" fill="hsl(var(--chart-1))" />
                                    <Bar dataKey="提现" fill="hsl(var(--chart-2))" />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>
                
                 <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    <StatCard title="一级代理人数" value={userStats.level1} icon={Briefcase} />
                    <StatCard title="二级代理人数" value={userStats.level2} icon={Briefcase} />
                    <StatCard title="三级代理人数" value={userStats.level3} icon={Briefcase} />
                    <StatCard title="日常任务完成数" value="N/A" icon={ClipboardList} description="此功能即将推出"/>
                </div>
             </div>
        </DashboardLayout>
    );
}
