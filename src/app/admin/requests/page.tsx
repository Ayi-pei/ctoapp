
"use client";

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useAuth } from '@/context/auth-context';
import DashboardLayout from '@/components/dashboard-layout';
import { useRouter } from 'next/navigation';
import type { Transaction, PasswordResetRequest } from '@/types';
import { useBalance } from '@/context/balance-context';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

type AdminRequest = Transaction | PasswordResetRequest;

const requestTypeText: { [key: string]: string } = {
    'deposit': '充值',
    'withdrawal': '提现',
    'password_reset': '修改密码'
}

const requestTypeColor: { [key: string]: string } = {
    'deposit': 'bg-green-500/20 text-green-500',
    'withdrawal': 'bg-orange-500/20 text-orange-500',
    'password_reset': 'bg-blue-500/20 text-blue-500'
}


export default function AdminRequestsPage() {
    const { isAdmin } = useAuth();
    const router = useRouter();
    const { updateBalance } = useBalance();
    const { toast } = useToast();

    const [requests, setRequests] = useState<AdminRequest[]>([]);
    
    useEffect(() => {
        if (!isAdmin) {
            router.push('/login');
        }
    }, [isAdmin, router]);

    const loadData = useCallback(() => {
        try {
            const financeRequests = JSON.parse(localStorage.getItem('transactions') || '[]') as Transaction[];
            const passwordRequests = JSON.parse(localStorage.getItem('adminRequests') || '[]') as PasswordResetRequest[];

            const allRequests = [...financeRequests, ...passwordRequests]
                .filter(r => r.status === 'pending')
                .sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

            setRequests(allRequests);

        } catch (error) {
            console.error("Failed to fetch data from localStorage", error);
        }
    }, []);

    useEffect(() => {
        if (isAdmin) {
            loadData();
        }
    }, [isAdmin, loadData]);

    const handleRequest = (requestId: string, newStatus: 'approved' | 'rejected') => {
        try {
            const allFinanceRequests = JSON.parse(localStorage.getItem('transactions') || '[]') as Transaction[];
            const allPasswordRequests = JSON.parse(localStorage.getItem('adminRequests') || '[]') as PasswordResetRequest[];

            let requestType: 'finance' | 'password' | null = null;
            let requestIndex = -1;
            let transaction: Transaction | null = null;
            
            requestIndex = allFinanceRequests.findIndex(r => r.id === requestId);
            if (requestIndex !== -1) {
                requestType = 'finance';
                transaction = allFinanceRequests[requestIndex];
            } else {
                requestIndex = allPasswordRequests.findIndex(r => r.id === requestId);
                if (requestIndex !== -1) {
                    requestType = 'password';
                }
            }

            if (requestIndex === -1 || !requestType) {
                 toast({ variant: "destructive", title: "错误", description: "找不到该请求" });
                return;
            }

            if (requestType === 'finance' && transaction) {
                transaction.status = newStatus;
                
                if (transaction.type === 'deposit') {
                    if (newStatus === 'approved') {
                        // On approval of deposit, add amount to user's available balance.
                        updateBalance(transaction.userId, transaction.asset, transaction.amount, 'available');
                    }
                } else if (transaction.type === 'withdrawal') {
                    if (newStatus === 'approved') {
                        // On approval of withdrawal, the frozen amount is removed permanently.
                        updateBalance(transaction.userId, transaction.asset, -transaction.amount, 'frozen');
                    } else { // rejected
                        // On rejection of withdrawal, move amount from frozen back to available.
                        updateBalance(transaction.userId, transaction.asset, transaction.amount, 'available');
                        updateBalance(transaction.userId, transaction.asset, -transaction.amount, 'frozen');
                    }
                }
                 localStorage.setItem('transactions', JSON.stringify(allFinanceRequests));

            } else { // password
                const request = allPasswordRequests[requestIndex];
                request.status = newStatus;

                if (newStatus === 'approved') {
                    const allUsers = JSON.parse(localStorage.getItem('users') || '[]');
                    const userIndex = allUsers.findIndex((u: any) => u.username === request.userId);
                    if (userIndex !== -1) {
                        allUsers[userIndex].password = request.newPassword;
                        localStorage.setItem('users', JSON.stringify(allUsers));
                    }
                }
                localStorage.setItem('adminRequests', JSON.stringify(allPasswordRequests));
            }


            loadData(); // Reload data to update the UI

            toast({
                title: "操作成功",
                description: `请求已被 ${newStatus === 'approved' ? '批准' : '拒绝'}。`,
            });
            
        } catch (error) {
            console.error("Failed to handle request:", error);
            toast({ variant: "destructive", title: "错误", description: "处理请求失败" });
        }
    };


    if (!isAdmin) {
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
                <h1 className="text-2xl font-bold">审核请求</h1>
                
                <Card>
                    <CardHeader>
                        <CardTitle>待处理队列</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>用户</TableHead>
                                    <TableHead>类型</TableHead>
                                    <TableHead>详情</TableHead>
                                    <TableHead>时间</TableHead>
                                    <TableHead className="text-right">操作</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {requests.length > 0 ? requests.map((r) => (
                                    <TableRow key={r.id}>
                                        <TableCell>{r.userId}</TableCell>
                                        <TableCell>
                                            <span className={cn('px-2 py-1 text-xs font-semibold rounded-full', requestTypeColor[r.type])}>
                                                {requestTypeText[r.type]}
                                            </span>
                                        </TableCell>
                                        <TableCell className="text-xs">
                                            {'amount' in r ? `${r.amount.toFixed(2)} ${r.asset}` : '新密码: ***'}
                                        </TableCell>
                                        <TableCell>{new Date(r.createdAt).toLocaleString()}</TableCell>
                                        <TableCell className="text-right space-x-2">
                                             <Button variant="outline" size="sm" className="text-green-500 border-green-500 hover:bg-green-500/10 hover:text-green-600" onClick={() => handleRequest(r.id, 'approved')}>
                                                批准
                                            </Button>
                                             <Button variant="outline" size="sm" className="text-red-500 border-red-500 hover:bg-red-500/10 hover:text-red-600" onClick={() => handleRequest(r.id, 'rejected')}>
                                                拒绝
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                )) : (
                                    <TableRow>
                                        <TableCell colSpan={5} className="text-center text-muted-foreground">
                                            当前没有待处理的请求。
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>
        </DashboardLayout>
    );
}
