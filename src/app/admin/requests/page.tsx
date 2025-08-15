
"use client";

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useAuth } from '@/context/auth-context';
import DashboardLayout from '@/components/dashboard-layout';
import { useRouter } from 'next/navigation';
import type { AnyRequest } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { useRequests } from '@/context/requests-context';

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

    const { requests, approveRequest, rejectRequest } = useRequests();
    
    useEffect(() => {
        if (isAdmin === false) {
            router.push('/login');
        }
    }, [isAdmin, router]);

    const handleRequest = async (request: AnyRequest, newStatus: 'approved' | 'rejected') => {
        try {
            if (newStatus === 'approved') {
                await approveRequest(request.id);
            } else {
                await rejectRequest(request.id);
            }

            toast({
                title: "操作成功",
                description: `请求已被 ${newStatus === 'approved' ? '批准' : '拒绝'}。`,
            });
        } catch (error: any) {
             toast({
                variant: "destructive",
                title: "操作失败",
                description: error.message || "处理请求时发生未知错误。",
            });
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

    const pendingRequests = requests.filter(r => r.status === 'pending');


    return (
        <DashboardLayout>
            <div className="p-4 md:p-8 space-y-6">
                <h1 className="text-2xl font-bold">审核请求</h1>
                
                <Card>
                    <CardHeader>
                        <CardTitle>待处理队列 ({pendingRequests.length})</CardTitle>
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
                                {pendingRequests.length > 0 ? pendingRequests.map((r) => (
                                    <TableRow key={r.id}>
                                        <TableCell>{r.user?.username || r.user_id}</TableCell>
                                        <TableCell>
                                            <span className={cn('px-2 py-1 text-xs font-semibold rounded-full', requestTypeColor[r.type])}>
                                                {requestTypeText[r.type]}
                                            </span>
                                        </TableCell>
                                        <TableCell className="text-xs">
                                            {'amount' in r && r.amount ? (
                                                `金额: ${r.amount.toFixed(2)} ${'asset' in r ? r.asset : ''}`
                                            ) : ('new_password' in r ? '新密码: ***' : '')}
                                            {'address' in r && r.address && <p className='truncate max-w-[150px]'>地址: {r.address}</p>}
                                            {'transaction_hash' in r && r.transaction_hash && <p className='truncate max-w-[150px]'>凭证: {r.transaction_hash}</p>}
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
