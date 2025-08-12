
"use client";

import { useState, useEffect } from 'react';
import DashboardLayout from "@/components/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useAuth } from '@/context/auth-context';
import { SpotTrade, ContractTrade } from '@/types';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { subDays } from 'date-fns';

type Order = (SpotTrade | ContractTrade) & {
    id: string;
    userId: string;
    tradingPair: string;
    orderType: 'spot' | 'contract';
    createdAt: string;
};


export default function ProfileOrdersPage() {
    const { user } = useAuth();
    const [orders, setOrders] = useState<Order[]>([]);

    useEffect(() => {
        if (user) {
            try {
                const twoWeeksAgo = subDays(new Date(), 14);

                const spotTrades: SpotTrade[] = JSON.parse(localStorage.getItem('spotTrades') || '[]');
                const contractTrades: ContractTrade[] = JSON.parse(localStorage.getItem('contractTrades') || '[]');

                const allOrders = [...spotTrades, ...contractTrades]
                    .filter(order => order.userId === user.username && new Date(order.createdAt) >= twoWeeksAgo)
                    .sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
                
                setOrders(allOrders as Order[]);

            } catch (error) {
                console.error("Failed to fetch orders from localStorage", error);
            }
        }
    }, [user]);

    const getStatusBadge = (order: Order) => {
        if (order.orderType === 'spot') {
            return (
                <Badge variant={order.status === 'filled' ? 'default' : 'destructive'} className={cn(order.status === 'filled' && 'bg-green-500/20 text-green-500')}>
                    {order.status === 'filled' ? '已成交' : '已取消'}
                </Badge>
            )
        }
        if (order.orderType === 'contract') {
             const contractOrder = order as ContractTrade;
            if (contractOrder.status === 'active') {
                return <Badge className="bg-yellow-500/20 text-yellow-500">进行中</Badge>
            }
            if (contractOrder.outcome === 'win') {
                 return <Badge className="bg-green-500/20 text-green-500">盈利</Badge>
            }
             if (contractOrder.outcome === 'loss') {
                 return <Badge className="bg-red-500/20 text-red-500">亏损</Badge>
            }
        }
        return <Badge variant="secondary">未知</Badge>;
    }


    return (
        <DashboardLayout>
            <div className="p-4 md:p-8 space-y-6">
                 <h1 className="text-2xl font-bold">交易订单</h1>

                <Card>
                    <CardHeader>
                        <CardTitle>最近两周的订单</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>交易对</TableHead>
                                    <TableHead>类型</TableHead>
                                    <TableHead>方向</TableHead>
                                    <TableHead>金额</TableHead>
                                    <TableHead>状态</TableHead>
                                    <TableHead>时间</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {orders.length > 0 ? orders.map((order) => (
                                    <TableRow key={order.id}>
                                        <TableCell>{order.tradingPair}</TableCell>
                                        <TableCell>
                                            <span className={`px-2 py-1 text-xs font-semibold rounded-full ${order.orderType === 'spot' ? 'bg-blue-500/20 text-blue-500' : 'bg-purple-500/20 text-purple-500'}`}>
                                                {order.orderType === 'spot' ? '币币' : '秒合约'}
                                            </span>
                                        </TableCell>
                                        <TableCell>
                                            <span className={order.type === 'buy' ? 'text-green-500' : 'text-red-500'}>
                                                {order.type === 'buy' ? '买入' : '卖出'}
                                            </span>
                                        </TableCell>
                                        <TableCell>{((order as any).amount || (order as any).total)?.toFixed(4)}</TableCell>
                                        <TableCell>{getStatusBadge(order)}</TableCell>
                                        <TableCell className="text-xs">{new Date(order.createdAt).toLocaleString()}</TableCell>
                                    </TableRow>
                                )) : (
                                    <TableRow>
                                        <TableCell colSpan={6} className="text-center text-muted-foreground h-24">
                                            暂无订单记录。
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

