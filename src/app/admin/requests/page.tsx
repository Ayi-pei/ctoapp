
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
import { supabase } from '@/lib/supabase';

type AdminRequest = (Transaction | PasswordResetRequest) & { userId?: string };

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
    const { recalculateBalanceForUser } = useBalance();
    const { toast } = useToast();

    const [requests, setRequests] = useState<AdminRequest[]>([]);
    
    useEffect(() => {
        if (isAdmin === false) {
            router.push('/login');
        }
    }, [isAdmin, router]);

    const loadData = useCallback(async () => {
        if (!isAdmin) return;
        try {
            const { data: financeRequests, error: financeError } = await supabase
                .from('transactions')
                .select('*, user:users(username)')
                .eq('status', 'pending');

            const { data: passwordRequests, error: passwordError } = await supabase
                .from('admin_requests')
                .select('*, user:users(username)')
                .eq('status', 'pending');
                
            if (financeError) throw financeError;
            if (passwordError) throw passwordError;

            const formattedFinance = financeRequests.map((r: any) => ({ ...r, userId: r.user.username }));
            const formattedPassword = passwordRequests.map((r: any) => ({ ...r, userId: r.user.username, newPassword: r.new_password }));

            const allRequests = [...formattedFinance, ...formattedPassword]
                .sort((a,b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

            setRequests(allRequests as AdminRequest[]);

        } catch (error) {
            console.error("Failed to fetch data from Supabase", error);
            toast({ variant: "destructive", title: "错误", description: "加载请求失败。" });
        }
    }, [isAdmin, toast]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const handleRequest = async (request: AdminRequest, newStatus: 'approved' | 'rejected') => {
        try {
            if (request.type === 'password_reset') {
                 if (newStatus === 'approved') {
                    const { data: userToUpdate, error: findErr } = await supabase.from('users').select('id').eq('username', request.userId).single();
                    if(findErr || !userToUpdate) throw new Error("User not found");

                    const { error: updateErr } = await supabase.auth.admin.updateUserById(userToUpdate.id, { password: (request as PasswordResetRequest).newPassword });
                    if(updateErr) throw updateErr;
                }
                const { error } = await supabase.from('admin_requests').delete().eq('id', request.id);
                if(error) throw error;
            } else {
                const { error } = await supabase.from('transactions').update({ status: newStatus }).eq('id', request.id);
                if (error) throw error;
                recalculateBalanceForUser(request.user_id);
            }
            
            loadData();
            toast({
                title: "操作成功",
                description: `请求已被 ${newStatus === 'approved' ? '批准' : '拒绝'}。`,
            });
            
        } catch (error) {
            console.error("Failed to handle request:", error);
            toast({ variant: "destructive", title: "错误", description: `处理请求失败: ${(error as Error).message}` });
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
