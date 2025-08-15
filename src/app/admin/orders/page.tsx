
"use client";

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useAuth } from '@/context/auth-context';
import DashboardLayout from '@/components/dashboard-layout';
import { useRouter } from 'next/navigation';
import { SpotTrade, ContractTrade } from '@/types';
import { useToast } from '@/hooks/use-toast';

type OrderWithUser = (SpotTrade | ContractTrade) & {
  user: { username: string } | null;
};

type FormattedOrder = (SpotTrade | ContractTrade) & {
    userId: string;
    tradingPair: string;
    statusText: string;
    createdAt: string;
};


export default function AdminOrdersPage() {
    const { isAdmin } = useAuth();
    const router = useRouter();
    const { toast } = useToast();
    const [orders, setOrders] = useState<FormattedOrder[]>([]);

    const loadOrders = useCallback(async () => {
        if (!isAdmin) return;

        // Mock data since Supabase is removed
        const mockSpotTrades: (SpotTrade & { user: { username: string }})[] = [
            { id: 's1', user_id: 'user123', trading_pair: 'BTC/USDT', type: 'buy', base_asset: 'BTC', quote_asset: 'USDT', amount: 0.1, total: 6800, status: 'filled', created_at: new Date().toISOString(), orderType: 'spot', user: { username: 'testuser1' } }
        ];
        const mockContractTrades: (ContractTrade & { user: { username: string }})[] = [
            { id: 'c1', user_id: 'user456', trading_pair: 'ETH/USDT', type: 'sell', amount: 100, entry_price: 3800, settlement_time: '', period: 30, profit_rate: 0.85, status: 'settled', outcome: 'win', profit: 85, created_at: new Date().toISOString(), orderType: 'contract', user: { username: 'testuser2' } }
        ];

        const formattedSpot = mockSpotTrades.map(t => ({ 
            ...t, 
            orderType: 'spot' as const, 
            userId: t.user?.username || t.user_id, 
            tradingPair: t.trading_pair, 
            statusText: t.status, 
            createdAt: t.created_at 
        }));
        const formattedContract = mockContractTrades.map(t => ({ 
            ...t, 
            orderType: 'contract' as const, 
            userId: t.user?.username || t.user_id, 
            tradingPair: t.trading_pair, 
            statusText: t.status, 
            createdAt: t.created_at 
        }));

        const allOrders = [...formattedSpot, ...formattedContract].sort((a,b) => 
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );

        setOrders(allOrders as FormattedOrder[]);
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

    const getOrderAmount = (order: FormattedOrder) => {
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
                                        <TableCell>{order.statusText}</TableCell>
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
