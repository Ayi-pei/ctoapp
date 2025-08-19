
"use client";

import { useEffect, useState, useMemo } from 'react';
import { useAuth } from '@/context/auth-context';
import { useRequests } from '@/context/requests-context';
import DashboardLayout from '@/components/dashboard-layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { User, Users, UserCheck, UserX, ArrowUpCircle, ArrowDownCircle, Briefcase, CalendarDays, ClipboardList, Wallet } from 'lucide-react';
import { User as UserType, AnyRequest } from '@/types';
import { isToday, isThisMonth, parseISO, subHours } from 'date-fns';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { useBalance } from '@/context/balance-context';
import { getUserData } from '@/lib/user-data';


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
    const { balances } = useBalance();
    const [allUsers, setAllUsers] = useState<UserType[]>([]);
    const [platformTotalBalance, setPlatformTotalBalance] = useState(0);

    useEffect(() => {
        const users = getAllUsers();
        setAllUsers(users);

        // Calculate total platform balance
        let totalBalance = 0;
        users.forEach(u => {
            const userData = getUserData(u.id);
            Object.values(userData.balances).forEach(bal => {
                totalBalance += bal.available;
            });
        });
        setPlatformTotalBalance(totalBalance);

    }, [requests, balances]);
    
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
        
        const registeredToday = allUsers.filter(u => isToday(parseISO(u.created_at))).length;
        
        const offline48h = allUsers.filter(u => !u.last_login_at || new Date(u.last_login_at) < subHours(now, 48)).length;

        const adminUser = allUsers.find(u => u.is_admin);
        const downline = adminUser ? getDownline(adminUser.id) : [];

        const level1 = downline.filter(u => (u as any).level === 1).length;
        const level2 = downline.filter(u => (u as any).level === 2).length;
        const level3 = downline.filter(u => (u as any).level === 3).length;

        return { totalUsers, onlineUsers, registeredToday, offline48h, level1, level2, level3 };
    }, [allUsers, getDownline]);

    const chartData = [
        { name: '总计', 充值: financialStats.totalDeposits, 提现: financialStats.totalWithdrawals },
        { name: '本月', 充值: financialStats.monthlyDeposits, 提现: financialStats.monthlyWithdrawals },
        { name: '今日', 充值: financialStats.dailyDeposits, 提现: financialStats.dailyWithdrawals },
    ];
    
    const pieChartData = [
        { name: '当前在线', value: userStats.onlineUsers },
        { name: '今日注册', value: userStats.registeredToday },
        { name: '>48h离线', value: userStats.offline48h },
        { name: '其他活跃', value: userStats.totalUsers - userStats.onlineUsers - userStats.registeredToday - userStats.offline48h }
    ].filter(item => item.value > 0);

    const PIE_CHART_COLORS = ['hsl(var(--chart-1))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--muted-foreground))'];


    return (
        <DashboardLayout>
             <div className="p-4 md:p-8 space-y-4">
                 <h1 className="text-2xl font-bold">运营数据报表</h1>
                
                <Card>
                    <CardHeader>
                        <CardTitle>出入款统计 (总用户数: {userStats.totalUsers})</CardTitle>
                        <CardDescription>历史、当月及当日的充值与提现金额汇总</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                         <div className="h-80">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={chartData}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="name" />
                                    <YAxis />
                                    <Tooltip
                                        cursor={{ fill: 'hsl(var(--muted))' }}
                                        contentStyle={{
                                            backgroundColor: 'hsl(var(--background))',
                                            borderColor: 'hsl(var(--border))',
                                        }}
                                    />
                                    <Legend />
                                    <Bar dataKey="充值" fill="hsl(var(--chart-1))" radius={[4, 4, 0, 0]} />
                                    <Bar dataKey="提现" fill="hsl(var(--chart-2))" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>
                
                 <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>用户构成</CardTitle>
                            <CardDescription>当前平台用户活跃度分布情况</CardDescription>
                        </CardHeader>
                        <CardContent className="h-80">
                             <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={pieChartData}
                                        cx="50%"
                                        cy="50%"
                                        labelLine={false}
                                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                                        outerRadius={100}
                                        fill="#8884d8"
                                        dataKey="value"
                                    >
                                        {pieChartData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={PIE_CHART_COLORS[index % PIE_CHART_COLORS.length]} />
                                        ))}
                                    </Pie>
                                     <Tooltip contentStyle={{
                                            backgroundColor: 'hsl(var(--background))',
                                            borderColor: 'hsl(var(--border))',
                                        }}/>
                                    <Legend />
                                </PieChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>
                     <div className="grid gap-4 grid-cols-2 grid-rows-2">
                        <StatCard title="一级代理人数" value={userStats.level1} icon={Briefcase} />
                        <StatCard title="二级代理人数" value={userStats.level2} icon={Briefcase} />
                        <StatCard title="三级代理人数" value={userStats.level3} icon={Briefcase} />
                        <StatCard title="平台总资金结余" value={`$${platformTotalBalance.toFixed(2)}`} icon={Wallet} description="所有用户可用余额总和"/>
                    </div>
                 </div>
             </div>
        </DashboardLayout>
    );
}
