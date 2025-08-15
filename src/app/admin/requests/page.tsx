
"use client";

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useAuth } from '@/context/auth-context';
import DashboardLayout from '@/components/dashboard-layout';
import { useRouter } from 'next/navigation';
import type { Transaction, PasswordResetRequest } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

type RequestWithUser = (Transaction | PasswordResetRequest);

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
    const { toast } = useToast();

    const [requests, setRequests] = useState<RequestWithUser[]>([]);
    
    useEffect(() => {
        if (isAdmin === false) {
            router.push('/login');
        }
    }, [isAdmin, router]);

    const loadData = useCallback(async () => {
        if (!isAdmin) return;
        
        // Mock data since Supabase is removed
        const mockRequests: RequestWithUser[] = [
            { id: 'req1', user_id: 'user123', type: 'deposit', asset: 'USDT', amount: 5000, status: 'pending', created_at: new Date().toISOString(), transaction_hash: '0xabc...def', user: { username: 'testuser1' } },
            { id: 'req2', user_id: 'user456', type: 'withdrawal', asset: 'BTC', amount: 0.1, status: 'pending', created_at: new Date(Date.now() - 3600000).toISOString(), address: 'bc1q...', user: { username: 'testuser2' } },
            { id: 'req3', user_id: 'user789', type: 'password_reset', new_password: 'newpassword123', status: 'pending', created_at: new Date(Date.now() - 7200000).toISOString(), user: { username: 'testuser3' } },
        ];
        setRequests(mockRequests);

    }, [isAdmin]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const handleRequest = async (request: RequestWithUser, newStatus: 'approved' | 'rejected') => {
        setRequests(prev => prev.filter(r => r.id !== request.id));
        toast({
            title: "操作成功",
            description: `请求已被 ${newStatus === 'approved' ? '批准' : '拒绝'}。`,
        });
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
                                        <TableCell>{r.user?.username || r.user_id}</TableCell>
                                        <TableCell>
                                            <span className={cn('px-2 py-1 text-xs font-semibold rounded-full', requestTypeColor[r.type])}>
                                                {requestTypeText[r.type]}
                                            </span>
                                        </TableCell>
                                        <TableCell className="text-xs">
                                            {'amount' in r && r.amount ? `${r.amount.toFixed(2)} ${'asset' in r ? r.asset : ''}` : '新密码: ***'}
                                        </TableCell>
                                        <TableCell>{new Date(r.created_at).toLocaleString()}</TableCell>
                                        <TableCell className="text-right space-x-2">
                                             <Button variant="outline" size="sm" className="text-green-500 border-green-500 hover:bg-green-500/10 hover:text-green-600" onClick={() => handleRequest(r, 'approved')}>
                                                批准
                                            </Button>
                                             <Button variant="outline" size="sm" className="text-red-500 border-red-500 hover:bg-red-500/10 hover:text-red-600" onClick={() => handleRequest(r, 'rejected')}>
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
