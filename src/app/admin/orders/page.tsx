
"use client";

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useAuth } from '@/context/auth-context';
import DashboardLayout from '@/components/dashboard-layout';
import { useRouter } from 'next/navigation';
import { SpotTrade, ContractTrade, Investment } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

type AllOrderTypes = SpotTrade | ContractTrade | Investment;

type FormattedOrder = AllOrderTypes & {
    userId: string;
    orderTypeText: 'spot' | 'contract' | 'investment';
};


const getAllUserHistoricalTrades = (): (SpotTrade | ContractTrade)[] => {
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
            console.error(`Failed to parse trade data for key ${key}`, e);
        }
    });

    return allTrades;
}

const getAllUserInvestments = (): Investment[] => {
    if (typeof window === 'undefined') return [];

    const allInvestments: Investment[] = [];
     const userKeys = Object.keys(localStorage).filter(key => key.startsWith('tradeflow_user_'));

    userKeys.forEach(key => {
        try {
            const userData = JSON.parse(localStorage.getItem(key) || '{}');
            if (userData.investments && Array.isArray(userData.investments)) {
                // Add user_id to each investment for admin view
                const userInvestments = userData.investments.map((inv: Investment) => ({
                    ...inv,
                    user_id: key.replace('tradeflow_user_', '')
                }));
                allInvestments.push(...userInvestments);
            }
        } catch (e) {
            console.error(`Failed to parse investment data for key ${key}`, e);
        }
    });
    
    return allInvestments;
}


export default function AdminOrdersPage() {
    const { isAdmin, getUserById } = useAuth();
    const router = useRouter();
    const { toast } = useToast();
    const [orders, setOrders] = useState<FormattedOrder[]>([]);

    const loadOrders = useCallback(async () => {
        if (!isAdmin) return;

        const allHistoricalTrades = getAllUserHistoricalTrades();
        const allInvestments = getAllUserInvestments();

        const allUserOrders: AllOrderTypes[] = [...allHistoricalTrades, ...allInvestments];

        const formattedOrders = allUserOrders.map(t => {
            const user = getUserById(t.user_id);
            let orderTypeText: FormattedOrder['orderTypeText'] = 'spot';
            if ('orderType' in t) {
                orderTypeText = t.orderType;
            } else if ('product_name' in t) {
                orderTypeText = 'investment';
            }
            
            return {
                ...t,
                userId: user?.username || t.user_id,
                orderTypeText: orderTypeText,
            }
        }).sort((a,b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());


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
        if (order.orderTypeText === 'spot') return (order as SpotTrade).total.toFixed(4);
        if (order.orderTypeText === 'contract') return (order as ContractTrade).amount.toFixed(4);
        if (order.orderTypeText === 'investment') return (order as Investment).amount.toFixed(2);
        return 'N/A';
    }
    
    const getStatusText = (order: FormattedOrder) => {
        if (order.orderTypeText === 'spot') return (order as SpotTrade).status === 'filled' ? '已成交' : '未知';
        if (order.orderTypeText === 'contract') {
            const contract = order as ContractTrade;
            if (contract.status === 'active') return <Badge variant="outline" className="text-yellow-500">进行中</Badge>;
            if (contract.outcome === 'win') return <Badge variant="outline" className="text-green-500">盈利</Badge>;
            if (contract.outcome === 'loss') return <Badge variant="outline" className="text-red-500">亏损</Badge>;
        }
        if (order.orderTypeText === 'investment') {
            const investment = order as Investment;
            if (investment.status === 'active') return <Badge variant="outline" className="text-yellow-500">进行中</Badge>;
            if (investment.status === 'settled') return <Badge variant="outline" className="text-green-500">已结算</Badge>;
        }
        return <Badge variant="secondary">未知</Badge>;
    }
    
    const getOrderDirection = (order: FormattedOrder) => {
         if (order.orderTypeText === 'spot' || order.orderTypeText === 'contract') {
             const trade = order as SpotTrade | ContractTrade;
             return <span className={trade.type === 'buy' ? 'text-green-500' : 'text-red-500'}>{trade.type === 'buy' ? '买入/看涨' : '卖出/看跌'}</span>
         }
         return <span className="text-muted-foreground">-</span>
    }
    
     const getPairOrProduct = (order: FormattedOrder) => {
        if ('trading_pair' in order) return order.trading_pair;
        if ('product_name' in order) return order.product_name;
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
                                    <TableHead>产品/交易对</TableHead>
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
                                        <TableCell>{getPairOrProduct(order)}</TableCell>
                                        <TableCell>
                                            <span className={cn('px-2 py-1 text-xs font-semibold rounded-full', 
                                                order.orderTypeText === 'spot' && 'bg-blue-500/20 text-blue-500',
                                                order.orderTypeText === 'contract' && 'bg-purple-500/20 text-purple-500',
                                                order.orderTypeText === 'investment' && 'bg-yellow-500/20 text-yellow-500'
                                            )}>
                                                {order.orderTypeText === 'spot' ? '币币' : order.orderTypeText === 'contract' ? '合约' : '理财'}
                                            </span>
                                        </TableCell>
                                        <TableCell>
                                            {getOrderDirection(order)}
                                        </TableCell>
                                        <TableCell>{getOrderAmount(order)}</TableCell>
                                        <TableCell>{getStatusText(order)}</TableCell>
                                        <TableCell>{new Date(order.created_at).toLocaleString()}</TableCell>
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
