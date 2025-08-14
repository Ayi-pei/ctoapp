
"use client";

import DashboardLayout from "@/components/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { SpotTrade, ContractTrade } from '@/types';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ChevronLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useBalance } from '@/context/balance-context';

type Order = SpotTrade | ContractTrade;


export default function ProfileOrdersPage() {
    const router = useRouter();
    const { historicalTrades } = useBalance();

    const getStatusBadge = (order: Order) => {
        if (order.orderType === 'spot') {
            const spotOrder = order as SpotTrade;
            return (
                <Badge variant={spotOrder.status === 'filled' ? 'default' : 'destructive'} className={cn(spotOrder.status === 'filled' && 'bg-green-500/20 text-green-500')}>
                    {spotOrder.status === 'filled' ? '已成交' : '已取消'}
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
                 <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={() => router.back()}>
                        <ChevronLeft className="h-6 w-6" />
                    </Button>
                    <h1 className="text-2xl font-bold">交易订单</h1>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>全部历史订单</CardTitle>
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
                                {historicalTrades.length > 0 ? historicalTrades.map((order) => (
                                    <TableRow key={order.id}>
                                        <TableCell>{order.trading_pair}</TableCell>
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
                                        <TableCell>{(order.orderType === 'spot' ? (order as SpotTrade).total : (order as ContractTrade).amount)?.toFixed(4)}</TableCell>
                                        <TableCell>{getStatusBadge(order as Order)}</TableCell>
                                        <TableCell className="text-xs">{new Date(order.created_at).toLocaleString()}</TableCell>
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
    