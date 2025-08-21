
"use client";

import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useAuth } from '@/context/auth-context';
import DashboardLayout from '@/components/dashboard-layout';
import { useRouter } from 'next/navigation';
import type { AnyRequest, Transaction, ActionLog } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { useRequests } from '@/context/requests-context';
import { useLogs } from '@/context/logs-context';
import { Edit2, Trash2 } from 'lucide-react';
import { EditTransactionDialog } from '@/components/edit-transaction-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';

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
    const { requests, approveRequest, rejectRequest, deleteRequest, updateRequest } = useRequests();
    const { logs } = useLogs();
    
    const [filter, setFilter] = useState('pending');
    const [editingRequest, setEditingRequest] = useState<Transaction | null>(null);
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

    useEffect(() => {
        if (isAdmin === false) {
            router.push('/');
        }
    }, [isAdmin, router]);

    const handleRequestAction = async (request: AnyRequest, newStatus: 'approve' | 'reject') => {
        try {
            if (newStatus === 'approve') {
                await approveRequest(request.id);
            } else {
                await rejectRequest(request.id);
            }

            toast({
                title: "操作成功",
                description: `请求已被 ${newStatus === 'approve' ? '批准' : '拒绝'}。`,
            });
        } catch (error: any) {
             toast({
                variant: "destructive",
                title: "操作失败",
                description: error.message || "处理请求时发生未知错误。",
            });
        }
    };
    
    const handleEditRequest = (request: AnyRequest) => {
        if (request.type === 'password_reset') {
            toast({ title: '提示', description: '密码重置请求不支持编辑。' });
            return;
        }
        setEditingRequest(request as Transaction);
        setIsEditDialogOpen(true);
    };

    const handleSaveRequest = (updatedRequest: Transaction) => {
        updateRequest(updatedRequest.id, updatedRequest);
        toast({ title: "成功", description: "请求已更新。" });
    };

    const handleDeleteRequest = async (requestId: string) => {
        await deleteRequest(requestId);
        toast({ title: "成功", description: "请求已删除。" });
    }

    const filteredRequests = useMemo(() => {
        return requests.filter(r => filter === 'all' || r.status === filter);
    }, [requests, filter]);

    if (!isAdmin) {
        return (
             <DashboardLayout>
                <div className="p-8 text-center">
                    <p>您需要以管理员身份登录才能访问此页面。</p>
                </div>
            </DashboardLayout>
        )
    }

    const RequestTable = ({ requestList }: { requestList: AnyRequest[] }) => (
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
                {requestList.length > 0 ? requestList.map((r) => (
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
                            ) : ('new_password' in r ? '请求重置密码' : '')}
                            {'address' in r && r.address && <p className='truncate max-w-[150px]'>地址: {r.address}</p>}
                            {'transaction_hash' in r && r.transaction_hash && <p className='truncate max-w-[150px]'>凭证: {r.transaction_hash}</p>}
                        </TableCell>
                        <TableCell>{new Date(r.created_at).toLocaleString()}</TableCell>
                        <TableCell className="text-right space-x-2">
                             {r.status === 'pending' && (
                                <>
                                    <Button variant="outline" size="sm" className="text-green-500 border-green-500 hover:bg-green-500/10 hover:text-green-600" onClick={() => handleRequestAction(r, 'approve')}>
                                        批准
                                    </Button>
                                     <Button variant="destructive" size="sm" onClick={() => handleRequestAction(r, 'reject')}>
                                        拒绝
                                    </Button>
                                </>
                             )}
                             <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEditRequest(r)}>
                                <Edit2 className="h-4 w-4" />
                            </Button>
                             {r.status !== 'pending' && (
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDeleteRequest(r.id)}>
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                             )}
                        </TableCell>
                    </TableRow>
                )) : (
                    <TableRow>
                        <TableCell colSpan={5} className="text-center text-muted-foreground h-24">
                            没有找到符合条件的请求。
                        </TableCell>
                    </TableRow>
                )}
            </TableBody>
        </Table>
    );

    const pendingRequests = requests.filter(r => r.status === 'pending');

    return (
        <DashboardLayout>
            <div className="p-4 md:p-8 space-y-6 bg-card/80 backdrop-blur-sm">
                <Tabs defaultValue="requests" className="w-full">
                    <TabsList>
                        <TabsTrigger value="requests">审核中心</TabsTrigger>
                        <TabsTrigger value="logs">操作日志</TabsTrigger>
                    </TabsList>
                    <TabsContent value="requests" className="space-y-6 mt-4">
                        <Card>
                            <CardHeader>
                                <CardTitle>待处理队列 ({pendingRequests.length})</CardTitle>
                                <CardDescription>需要管理员立即处理的请求。</CardDescription>
                            </CardHeader>
                            <CardContent>
                            <RequestTable requestList={pendingRequests} />
                            </CardContent>
                        </Card>

                        <Accordion type="single" collapsible className="w-full" defaultValue="history">
                            <AccordionItem value="history">
                                <AccordionTrigger>
                                    <h2 className="text-xl font-bold">历史记录</h2>
                                </AccordionTrigger>
                                <AccordionContent>
                                    <Card>
                                        <CardHeader>
                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <CardTitle>已处理请求</CardTitle>
                                                    <CardDescription>查看已批准或已拒绝的请求历史。</CardDescription>
                                                </div>
                                                <Select value={filter} onValueChange={setFilter}>
                                                    <SelectTrigger className="w-[180px]">
                                                        <SelectValue placeholder="筛选状态" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="all">所有记录</SelectItem>
                                                        <SelectItem value="pending">待审核</SelectItem>
                                                        <SelectItem value="approved">已批准</SelectItem>
                                                        <SelectItem value="rejected">已拒绝</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                        </CardHeader>
                                        <CardContent>
                                            <RequestTable requestList={filteredRequests} />
                                        </CardContent>
                                    </Card>
                                </AccordionContent>
                            </AccordionItem>
                        </Accordion>
                    </TabsContent>
                    <TabsContent value="logs" className="mt-4">
                        <Card>
                            <CardHeader>
                                <CardTitle>管理员操作日志</CardTitle>
                                <CardDescription>所有对请求和交易的后台操作记录。</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <ScrollArea className="h-[60vh]">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>操作员</TableHead>
                                            <TableHead>操作</TableHead>
                                            <TableHead>详情</TableHead>
                                            <TableHead>时间</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {logs.map(log => (
                                            <TableRow key={log.id}>
                                                <TableCell>{log.operator_username}</TableCell>
                                                <TableCell>
                                                    <Badge variant={log.action === 'approve' ? 'default' : log.action === 'reject' ? 'destructive' : 'secondary'} className={cn(log.action === 'approve' && 'bg-green-500/80')}>
                                                        {log.action}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="text-xs text-muted-foreground">{log.details}</TableCell>
                                                <TableCell className="text-xs">{new Date(log.created_at).toLocaleString()}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                                </ScrollArea>
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
            </div>
            
            {editingRequest && (
                <EditTransactionDialog
                    isOpen={isEditDialogOpen}
                    onOpenChange={setIsEditDialogOpen}
                    transaction={editingRequest}
                    onSave={handleSaveRequest}
                />
            )}
        </DashboardLayout>
    );
}
