
"use client";

import { useState, useEffect, useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useSimpleAuth } from '@/context/simple-custom-auth';
import DashboardLayout from '@/components/dashboard-layout';
import { useRouter } from 'next/navigation';
import { SpotTrade, ContractTrade, Investment, SwapOrder } from '@/types';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Calendar as CalendarIcon, ArrowRight } from "lucide-react"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { DateRange } from "react-day-picker"
import { format } from "date-fns"
import { supabase, isSupabaseEnabled } from '@/lib/supabaseClient';

// Disable SSR for this page to avoid context issues
export const dynamic = 'force-dynamic';


type AllOrderTypes = SpotTrade | ContractTrade | Investment | SwapOrder;

type FormattedOrder = AllOrderTypes & {
    username: string;
    orderTypeText: 'spot' | 'contract' | 'investment' | 'swap';
    statusText: string;
};

const getOrderStatusText = (order: FormattedOrder): string => {
    switch(order.orderTypeText) {
        case 'spot':
            return (order as SpotTrade).status === 'filled' ? '已成交' : '未知';
        case 'contract':
            const contract = order as ContractTrade;
            if (contract.status === 'active') return '进行中';
            if (contract.outcome === 'win') return '盈利';
            if (contract.outcome === 'loss') return '亏损';
            return '已结算';
        case 'investment':
            const investment = order as Investment;
            return investment.status === 'active' ? '进行中' : '已结算';
        case 'swap':
            const swap = order as SwapOrder;
            const statusMap: Record<SwapOrder['status'], string> = {
                open: '开放中',
                pending_payment: '待支付',
                pending_confirmation: '待确认',
                completed: '已完成',
                cancelled: '已取消',
                disputed: '申诉中'
            };
            return statusMap[swap.status];
    }
    return '未知';
}


export default function AdminOrdersPage() {
    const { isAdmin } = useSimpleAuth();
    const router = useRouter();
    const [allOrders, setAllOrders] = useState<FormattedOrder[]>([]);
    
    const [typeFilter, setTypeFilter] = useState('all');
    const [statusFilter, setStatusFilter] = useState('all');
    const [dateFilter, setDateFilter] = useState<DateRange | undefined>(undefined);

    const loadData = useCallback(async () => {
        if (!isAdmin || !isSupabaseEnabled) return;

        const [tradesRes, investmentsRes, swapsRes] = await Promise.all([
            supabase.from('trades').select('*, user:profiles(username)'),
            supabase.from('investments').select('*, user:profiles(username)'),
            supabase.from('swap_orders').select('*, user:profiles(username)')
        ]);

        const allTrades = tradesRes.data || [];
        const allInvestments = investmentsRes.data || [];
        const allSwaps = swapsRes.data || [];

        const combinedOrders = [...allTrades, ...allInvestments, ...allSwaps];

        const formatted = combinedOrders.map((o: Record<string, any>) => {
            let orderTypeText: FormattedOrder['orderTypeText'] = 'spot';
            if ('orderType' in o) { // trades
                orderTypeText = o.orderType;
            } else if ('product_name' in o) { // investments
                orderTypeText = 'investment';
            } else if ('from_asset' in o) { // swaps
                orderTypeText = 'swap';
            }
            
            const baseFormatted = {
                ...o,
                username: o.user?.username || o.user_id || '未知用户',
                orderTypeText: orderTypeText,
            } as FormattedOrder;
            
            return { ...baseFormatted, statusText: getOrderStatusText(baseFormatted) };

        }).sort((a,b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

        setAllOrders(formatted);
    }, [isAdmin]);
    
    useEffect(() => {
        if (isAdmin === false) {
            router.push('/');
        } else {
            loadData();
        }
    }, [isAdmin, router, loadData]);
    
    const filteredOrders = useMemo(() => {
        return allOrders.filter(order => {
            const typeMatch = typeFilter === 'all' || order.orderTypeText === typeFilter;
            const statusMatch = statusFilter === 'all' || order.statusText === statusFilter;
            const dateMatch = !dateFilter || (
                new Date(order.created_at) >= (dateFilter.from || new Date(0)) &&
                new Date(order.created_at) <= (dateFilter.to || new Date())
            );
            return typeMatch && statusMatch && dateMatch;
        });
    }, [allOrders, typeFilter, statusFilter, dateFilter]);
    
    const resetFilters = () => {
        setTypeFilter('all');
        setStatusFilter('all');
        setDateFilter(undefined);
    }


    if (!isAdmin) {
        return (
             <DashboardLayout>
                <div className="p-8 text-center">
                    <p>您需要以管理员身份登录才能访问此页面。</p>
                </div>
            </DashboardLayout>
        )
    }

    const getOrderAmount = (order: FormattedOrder): string => {
        if (order.orderTypeText === 'spot') return (order as SpotTrade).total.toFixed(4);
        if (order.orderTypeText === 'contract') return (order as ContractTrade).amount.toFixed(4);
        if (order.orderTypeText === 'investment') return (order as Investment).amount.toFixed(2);
        if (order.orderTypeText === 'swap') return `${(order as SwapOrder).from_amount.toFixed(4)} -> ${(order as SwapOrder).to_amount.toFixed(4)}`;
        return 'N/A';
    }
    
    const getStatusBadge = (order: FormattedOrder) => {
        const text = order.statusText;
        if (order.orderTypeText === 'spot') return <Badge variant="outline" className="text-green-500">{text}</Badge>;
        if (order.orderTypeText === 'contract') {
            const contract = order as ContractTrade;
            if (contract.status === 'active') return <Badge variant="outline" className="text-yellow-500">{text}</Badge>;
            if (contract.outcome === 'win') return <Badge variant="outline" className="text-green-500">{text} (+{(contract.profit || 0).toFixed(2)})</Badge>;
            if (contract.outcome === 'loss') return <Badge variant="outline" className="text-red-500">{text} ({(contract.profit || 0).toFixed(2)})</Badge>;
        }
        if (order.orderTypeText === 'investment') {
            const investment = order as Investment;
            if (investment.status === 'active') return <Badge variant="outline" className="text-yellow-500">{text}</Badge>;
            if (investment.status === 'settled') return <Badge variant="outline" className="text-green-500">{text} (+{(investment.profit || 0).toFixed(2)})</Badge>;
        }
        if (order.orderTypeText === 'swap') {
            const status = (order as SwapOrder).status;
            const colorMap = {
                open: 'bg-blue-500/20 text-blue-500',
                pending_payment: 'bg-yellow-500/20 text-yellow-500',
                pending_confirmation: 'bg-orange-500/20 text-orange-500',
                completed: 'bg-green-500/20 text-green-500',
                cancelled: 'bg-gray-500/20 text-gray-500',
                disputed: 'bg-red-500/20 text-red-500'
            };
            return <Badge className={colorMap[status]}>{text}</Badge>
        }
        return <Badge variant="secondary">{text}</Badge>;
    }
    
    const getOrderDirection = (order: FormattedOrder) => {
         if (order.orderTypeText === 'spot' || order.orderTypeText === 'contract') {
             const trade = order as SpotTrade | ContractTrade;
             return <span className={trade.type === 'buy' ? 'text-green-500' : 'text-red-500'}>{trade.type === 'buy' ? '买入/看涨' : '卖出/看跌'}</span>
         }
         return <span className="text-muted-foreground">-</span>
    }
    
     const getPairOrProduct = (order: FormattedOrder) => {
        if ('trading_pair' in order && order.trading_pair) return order.trading_pair;
        if ('product_name' in order && order.product_name) return order.product_name;
        if ('from_asset' in order && 'to_asset' in order) return `${order.from_asset}/${order.to_asset}`;
        return 'N/A';
    }

    const getPriceInfo = (order: FormattedOrder) => {
        if (order.orderTypeText === 'spot') {
            const spotTrade = order as SpotTrade;
            return <span>{spotTrade.price.toFixed(4)}</span>;
        }
        if (order.orderTypeText === 'contract') {
            const contractTrade = order as ContractTrade;
            if (contractTrade.status === 'settled' && contractTrade.settlement_price) {
                return (
                    <div className="flex items-center gap-1">
                        <span>{contractTrade.entry_price.toFixed(4)}</span>
                        <ArrowRight className="w-3 h-3 text-muted-foreground" />
                        <span className={contractTrade.outcome === 'win' ? 'text-green-500' : 'text-red-500'}>
                            {contractTrade.settlement_price.toFixed(4)}
                        </span>
                    </div>
                );
            }
            return <span>{contractTrade.entry_price.toFixed(4)}</span>;
        }
        return <span className="text-muted-foreground">-</span>;
    };


    return (
        <DashboardLayout>
            <div className="p-4 md:p-8 space-y-6 bg-card/80 backdrop-blur-sm">
                <h1 className="text-2xl font-bold">订单详情</h1>

                <Card>
                    <CardHeader>
                        <CardTitle>所有用户订单</CardTitle>
                        <CardDescription>按类型、状态和日期筛选和查看所有订单。</CardDescription>
                         <div className="flex flex-wrap items-center gap-4 pt-4">
                            <Select value={typeFilter} onValueChange={setTypeFilter}>
                                <SelectTrigger className="w-full sm:w-[180px]">
                                    <SelectValue placeholder="所有类型" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">所有类型</SelectItem>
                                    <SelectItem value="spot">币币</SelectItem>
                                    <SelectItem value="contract">合约</SelectItem>
                                    <SelectItem value="investment">理财</SelectItem>
                                    <SelectItem value="swap">闪兑</SelectItem>
                                </SelectContent>
                            </Select>
                            
                             <Select value={statusFilter} onValueChange={setStatusFilter}>
                                <SelectTrigger className="w-full sm:w-[180px]">
                                    <SelectValue placeholder="所有状态" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">所有状态</SelectItem>
                                    <SelectItem value="进行中">进行中</SelectItem>
                                    <SelectItem value="已成交">已成交</SelectItem>
                                    <SelectItem value="已结算">已结算</SelectItem>
                                    <SelectItem value="盈利">盈利</SelectItem>
                                    <SelectItem value="亏损">亏损</SelectItem>
                                    <SelectItem value="开放中">开放中</SelectItem>
                                    <SelectItem value="待支付">待支付</SelectItem>
                                    <SelectItem value="待确认">待确认</SelectItem>
                                    <SelectItem value="已完成">已完成</SelectItem>
                                </SelectContent>
                            </Select>
                            
                            <Popover>
                                <PopoverTrigger asChild>
                                <Button
                                    id="date"
                                    variant={"outline"}
                                    className={cn(
                                    "w-full sm:w-[300px] justify-start text-left font-normal",
                                    !dateFilter && "text-muted-foreground"
                                    )}
                                >
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {dateFilter?.from ? (
                                    dateFilter.to ? (
                                        <>
                                        {format(dateFilter.from, "LLL dd, y")} -{" "}
                                        {format(dateFilter.to, "LLL dd, y")}
                                        </>
                                    ) : (
                                        format(dateFilter.from, "LLL dd, y")
                                    )
                                    ) : (
                                    <span>选择日期范围</span>
                                    )}
                                </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="start">
                                <Calendar
                                    initialFocus
                                    mode="range"
                                    defaultMonth={dateFilter?.from}
                                    selected={dateFilter}
                                    onSelect={setDateFilter}
                                    numberOfMonths={2}
                                />
                                </PopoverContent>
                            </Popover>
                            {(typeFilter !== 'all' || statusFilter !== 'all' || dateFilter) && (
                                <Button variant="ghost" onClick={resetFilters}>重置</Button>
                            )}
                        </div>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>用户</TableHead>
                                    <TableHead>产品/交易对</TableHead>
                                    <TableHead>类型</TableHead>
                                    <TableHead>方向</TableHead>
                                    <TableHead>价格 (入场/出场)</TableHead>
                                    <TableHead>金额/数量</TableHead>
                                    <TableHead>状态/结果</TableHead>
                                    <TableHead>时间</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredOrders.length > 0 ? filteredOrders.map((order) => (
                                    <TableRow key={order.id}>
                                        <TableCell>{order.username}</TableCell>
                                        <TableCell>{getPairOrProduct(order)}</TableCell>
                                        <TableCell>
                                            <span className={cn('px-2 py-1 text-xs font-semibold rounded-full', 
                                                order.orderTypeText === 'spot' && 'bg-blue-500/20 text-blue-500',
                                                order.orderTypeText === 'contract' && 'bg-purple-500/20 text-purple-500',
                                                order.orderTypeText === 'investment' && 'bg-yellow-500/20 text-yellow-500',
                                                order.orderTypeText === 'swap' && 'bg-indigo-500/20 text-indigo-500'
                                            )}>
                                                {order.orderTypeText === 'spot' ? '币币' : order.orderTypeText === 'contract' ? '合约' : order.orderTypeText === 'investment' ? '理财' : '闪兑'}
                                            </span>
                                        </TableCell>
                                        <TableCell>
                                            {getOrderDirection(order)}
                                        </TableCell>
                                        <TableCell className="text-xs">{getPriceInfo(order)}</TableCell>
                                        <TableCell>{getOrderAmount(order)}</TableCell>
                                        <TableCell>{getStatusBadge(order)}</TableCell>
                                        <TableCell>{new Date(order.created_at).toLocaleString()}</TableCell>
                                    </TableRow>
                                )) : (
                                    <TableRow>
                                        <TableCell colSpan={8} className="text-center text-muted-foreground h-24">
                                            没有找到符合条件的订单记录。
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

    