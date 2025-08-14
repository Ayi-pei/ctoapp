
"use client";

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useAuth } from '@/context/auth-context';
import DashboardLayout from '@/components/dashboard-layout';
import { useRouter } from 'next/navigation';
import { SpotTrade, ContractTrade } from '@/types';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';

type OrderWithUser = (SpotTrade | ContractTrade) & {
  user: { username: string } | null;
  userId: string;
};

type Order = (SpotTrade | ContractTrade) & {
    userId: string;
    tradingPair: string;
    status: 'pending' | 'filled' | 'cancelled' | 'active' | 'settled';
    createdAt: string;
};


export default function AdminOrdersPage() {
    const { isAdmin } = useAuth();
    const router = useRouter();
    const { toast } = useToast();
    const [orders, setOrders] = useState<Order[]>([]);

    const loadOrders = useCallback(async () => {
        if (!isAdmin) return;

        try {
            const { data: spotTrades, error: spotError } = await supabase
                .from('spot_trades')
                .select('*, user:users(username)');

            const { data: contractTrades, error: contractError } = await supabase
                .from('contract_trades')
                .select('*, user:users(username)');

            if (spotError) throw spotError;
            if (contractError) throw contractError;

            const formattedSpot = spotTrades.map((t: OrderWithUser) => ({ ...t, orderType: 'spot', userId: t.user?.username || t.user_id, tradingPair: t.trading_pair, createdAt: t.created_at }));
            const formattedContract = contractTrades.map((t: OrderWithUser) => ({ ...t, orderType: 'contract', userId: t.user?.username || t.user_id, tradingPair: t.trading_pair, createdAt: t.created_at }));

            const allOrders = [...formattedSpot, ...formattedContract].sort((a,b) => 
                new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
            );

            setOrders(allOrders as Order[]);
        } catch (error) {
            console.error("Failed to fetch orders from Supabase", error);
            toast({ variant: "destructive", title: "错误", description: "加载订单记录失败。" });
        }
    }, [isAdmin, toast]);

    useEffect(() => {
        if (isAdmin === false) {
            router.push('/login');
        } else if (isAdmin === true) {
            loadOrders();
        }
    }, [isAdmin, router, loadOrders]);


    if (!isAdmin) {
        return (
             <DashboardLayout>
                <div className="p-8 text-center">
                    <p>您需要以管理员身份登录才能访问此页面。</p>
                </div>
            </DashboardLayout>
        )
    }

    const getOrderAmount = (order: Order) => {
        if (order.orderType === 'spot') {
            return (order as SpotTrade).total.toFixed(4);
        }
        if (order.orderType === 'contract') {
            return (order as ContractTrade).amount.toFixed(4);
        }
        return 'N/A';
    }

    return (
        <DashboardLayout>
            <div className="p-4 md:p-8 space-y-6">
                <h1 className="text-2xl font-bold">订单详情</h1>

                <Card>
                    <CardHeader>
                        <CardTitle>所有用户订单</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>用户</TableHead>
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
                                        <TableCell>{order.userId}</TableCell>
                                        <TableCell>{order.tradingPair}</TableCell>
                                        <TableCell>
                                            <span className={`px-2 py-1 text-xs font-semibold rounded-full ${order.orderType === 'spot' ? 'bg-blue-500/20 text-blue-500' : 'bg-purple-500/20 text-purple-500'}`}>
                                                {order.orderType === 'spot' ? '币币' : '合约'}
                                            </span>
                                        </TableCell>
                                        <TableCell>
                                            <span className={order.type === 'buy' ? 'text-green-500' : 'text-red-500'}>
                                                {order.type === 'buy' ? '买入' : '卖出'}
                                            </span>
                                        </TableCell>
                                        <TableCell>{getOrderAmount(order)}</TableCell>
                                        <TableCell>{order.status}</TableCell>
                                        <TableCell>{new Date(order.createdAt).toLocaleString()}</TableCell>
                                    </TableRow>
                                )) : (
                                    <TableRow>
                                        <TableCell colSpan={7} className="text-center text-muted-foreground">
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
