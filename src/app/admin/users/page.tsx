
"use client";

import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { UserDetailsDialog } from '@/components/user-details-dialog';
import { useAuth } from '@/context/auth-context';
import type { User as AuthUser } from '@/context/auth-context';
import DashboardLayout from '@/components/dashboard-layout';
import { useRouter } from 'next/navigation';
import type { Transaction } from '@/types';
import { useBalance } from '@/context/balance-context';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';


type UserData = AuthUser & {
    registeredAt: string; 
    password?: string;
};

type UserBalance = {
    [key: string]: {
        available: number;
        frozen: number;
    }
}

export default function AdminUsersPage() {
    const { user, isAdmin } = useAuth();
    const router = useRouter();
    const { updateBalance } = useBalance();
    const { toast } = useToast();

    const [users, setUsers] = useState<UserData[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [pendingTransactions, setPendingTransactions] = useState<Transaction[]>([]);
    const [selectedUser, setSelectedUser] = useState<UserData | null>(null);
    const [selectedUserBalances, setSelectedUserBalances] = useState<UserBalance | null>(null);
    const [isDetailsOpen, setIsDetailsOpen] = useState(false);
    
    useEffect(() => {
        if (!isAdmin) {
            router.push('/login');
        }
    }, [isAdmin, router]);

    const loadData = () => {
        try {
            const allUsersData = JSON.parse(localStorage.getItem('users') || '[]');
            const formattedUsers = allUsersData.map((u: any) => ({
                ...u,
                registeredAt: new Date().toLocaleDateString() 
            }));
            setUsers(formattedUsers);

            const allTransactions = JSON.parse(localStorage.getItem('transactions') || '[]') as Transaction[];
            setPendingTransactions(allTransactions.filter(t => t.status === 'pending'));

        } catch (error) {
            console.error("Failed to fetch data from localStorage", error);
        }
    }

    useEffect(() => {
        if (isAdmin) {
            loadData();
        }
    }, [isAdmin]);
    
    const filteredUsers = useMemo(() => {
        if (!searchQuery) return users;
        return users.filter(u => u.username.toLowerCase().includes(searchQuery.toLowerCase()));
    }, [users, searchQuery]);

    const handleViewDetails = (userToView: UserData) => {
        setSelectedUser(userToView);
        try {
            const userBalances = JSON.parse(localStorage.getItem(`userBalances_${userToView.username}`) || '{}');
            setSelectedUserBalances(userBalances);
        } catch (error) {
             console.error(`Failed to fetch balances for user ${userToView.username}`, error);
             setSelectedUserBalances(null);
        }
        setIsDetailsOpen(true);
    };
    
    const handleTransaction = (transactionId: string, newStatus: 'approved' | 'rejected') => {
        try {
            const allTransactions = JSON.parse(localStorage.getItem('transactions') || '[]') as Transaction[];
            const transactionIndex = allTransactions.findIndex(t => t.id === transactionId);

            if (transactionIndex === -1) {
                toast({ variant: "destructive", title: "错误", description: "找不到该请求" });
                return;
            }
            
            const transaction = allTransactions[transactionIndex];
            allTransactions[transactionIndex].status = newStatus;

            if (newStatus === 'approved') {
                const amountChange = transaction.type === 'deposit' ? transaction.amount : -transaction.amount;
                updateBalance(transaction.userId, transaction.asset, amountChange);
            }

            localStorage.setItem('transactions', JSON.stringify(allTransactions));
            loadData(); // Reload data to update the UI

            toast({
                title: "操作成功",
                description: `请求已被 ${newStatus === 'approved' ? '批准' : '拒绝'}。`,
            });
            
        } catch (error) {
            console.error("Failed to handle transaction:", error);
            toast({ variant: "destructive", title: "错误", description: "处理请求失败" });
        }
    };


    if (!user || !isAdmin) {
        return (
             <DashboardLayout>
                <div className="p-8 text-center">
                    <p>您需要以管理员身份登录才能访问此页面。</p>
                </div>
            </DashboardLayout>
        )
    }


    return (
        <DashboardLayout>
            <div className="p-4 md:p-8 space-y-6">
                <h1 className="text-2xl font-bold">后台管理</h1>
                
                <Card>
                    <CardHeader>
                        <CardTitle>待审核请求</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>用户</TableHead>
                                    <TableHead>类型</TableHead>
                                    <TableHead>资产</TableHead>
                                    <TableHead>金额</TableHead>
                                    <TableHead>时间</TableHead>
                                    <TableHead className="text-right">操作</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {pendingTransactions.length > 0 ? pendingTransactions.map((t) => (
                                    <TableRow key={t.id}>
                                        <TableCell>{t.userId}</TableCell>
                                        <TableCell>
                                            <span className={`px-2 py-1 text-xs font-semibold rounded-full ${t.type === 'deposit' ? 'bg-green-500/20 text-green-500' : 'bg-orange-500/20 text-orange-500'}`}>
                                                {t.type === 'deposit' ? '充值' : '提现'}
                                            </span>
                                        </TableCell>
                                        <TableCell>{t.asset}</TableCell>
                                        <TableCell>{t.amount.toFixed(2)}</TableCell>
                                        <TableCell>{new Date(t.createdAt).toLocaleString()}</TableCell>
                                        <TableCell className="text-right space-x-2">
                                             <Button variant="outline" size="sm" className="text-green-500 border-green-500 hover:bg-green-500/10 hover:text-green-600" onClick={() => handleTransaction(t.id, 'approved')}>
                                                批准
                                            </Button>
                                             <Button variant="outline" size="sm" className="text-red-500 border-red-500 hover:bg-red-500/10 hover:text-red-600" onClick={() => handleTransaction(t.id, 'rejected')}>
                                                拒绝
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                )) : (
                                    <TableRow>
                                        <TableCell colSpan={6} className="text-center text-muted-foreground">
                                            当前没有待处理的请求。
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                        <CardTitle>用户列表</CardTitle>
                         <Input 
                            placeholder="搜索用户名..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="max-w-sm"
                        />
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>用户名</TableHead>
                                    <TableHead>账户类型</TableHead>
                                    <TableHead>注册日期</TableHead>
                                    <TableHead className="text-right">操作</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredUsers.map((u) => (
                                    <TableRow key={u.username}>
                                        <TableCell className="font-medium">{u.username}</TableCell>
                                        <TableCell>
                                            <span className={`px-2 py-1 text-xs font-semibold rounded-full ${u.isTestUser ? 'bg-green-500/20 text-green-500' : 'bg-blue-500/20 text-blue-500'}`}>
                                                {u.isTestUser ? '测试账户' : '真实账户'}
                                            </span>
                                        </TableCell>
                                        <TableCell>{u.registeredAt}</TableCell>
                                        <TableCell className="text-right">
                                            <Button variant="outline" size="sm" onClick={() => handleViewDetails(u)}>
                                                查看详情
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                                {filteredUsers.length === 0 && (
                                     <TableRow>
                                        <TableCell colSpan={4} className="text-center text-muted-foreground">
                                            找不到匹配的用户。
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>
            {selectedUser && (
                <UserDetailsDialog
                    isOpen={isDetailsOpen}
                    onOpenChange={setIsDetailsOpen}
                    user={selectedUser}
                    balances={selectedUserBalances}
                    onUpdate={loadData}
                />
            )}
        </DashboardLayout>
    );
}
