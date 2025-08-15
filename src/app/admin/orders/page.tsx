
"use client";

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useAuth } from '@/context/auth-context';
import DashboardLayout from '@/components/dashboard-layout';
import { useRouter } from 'next/navigation';
import { SpotTrade, ContractTrade } from '@/types';
import { useToast } from '@/hooks/use-toast';

type FormattedOrder = (SpotTrade | ContractTrade) & {
    userId: string;
    tradingPair: string;
    statusText: string;
    createdAt: string;
};


const getAllUserHistoricalTrades = () => {
    if (typeof window === 'undefined') return [];
    
    const allTrades: (SpotTrade | ContractTrade)[] = [];
    const userKeys = Object.keys(localStorage).filter(key => key.startsWith('tradeflow_user_'));
    
    userKeys.forEach(key => {
        try {
            const userData = JSON.parse(localStorage.getItem(key) || '{}');
            if (userData.historicalTrades && Array.isArray(userData.historicalTrades)) {
                allTrades.push(...userData.historicalTrades);
            }
        } catch (e) {
            console.error(`Failed to parse data for key ${key}`, e);
        }
    });

    return allTrades;
}


export default function AdminOrdersPage() {
    const { isAdmin, getUserById } = useAuth();
    const router = useRouter();
    const { toast } = useToast();
    const [orders, setOrders] = useState<FormattedOrder[]>([]);

    const loadOrders = useCallback(async () => {
        if (!isAdmin) return;

        const allHistoricalTrades = getAllUserHistoricalTrades();

        const formattedOrders = allHistoricalTrades.map(t => {
            const user = getUserById(t.user_id);
            return {
                ...t,
                userId: user?.username || t.user_id,
                tradingPair: t.trading_pair,
                statusText: 'status' in t ? t.status : (t.outcome || 'unknown'),
                createdAt: t.created_at,
            }
        }).sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());


        setOrders(formattedOrders as FormattedOrder[]);
    }, [isAdmin, toast, getUserById]);

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
    
    const getStatusText = (order: FormattedOrder) => {
        if (order.orderType === 'spot') return (order as SpotTrade).status === 'filled' ? '已成交' : '未知';
        if (order.orderType === 'contract') {
            const contract = order as ContractTrade;
            if (contract.outcome === 'win') return '盈利';
            if (contract.outcome === 'loss') return '亏损';
            return '进行中';
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
                                    <TableHead>金额 (USDT)</TableHead>
                                    <TableHead>状态/结果</TableHead>
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
                                                {order.type === 'buy' ? '买入/看涨' : '卖出/看跌'}
                                            </span>
                                        </TableCell>
                                        <TableCell>{getOrderAmount(order)}</TableCell>
                                        <TableCell>{getStatusText(order)}</TableCell>
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
