
"use client";

import { useState, useEffect, useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useAuth } from '@/context/auth-context';
import { useBalance } from '@/context/balance-context';
import DashboardLayout from '@/components/dashboard-layout';
import { useRouter } from 'next/navigation';
import { SpotTrade, ContractTrade, Investment } from '@/types';
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


type AllOrderTypes = SpotTrade | ContractTrade | Investment;

type FormattedOrder = AllOrderTypes & {
    username: string;
    orderTypeText: 'spot' | 'contract' | 'investment';
    statusText: string;
};

const getOrderStatusText = (order: FormattedOrder) => {
    if (order.orderTypeText === 'spot') return (order as SpotTrade).status === 'filled' ? '已成交' : '未知';
    if (order.orderTypeText === 'contract') {
        const contract = order as ContractTrade;
        if (contract.status === 'active') return '进行中';
        if (contract.outcome === 'win') return '盈利';
        if (contract.outcome === 'loss') return '亏损';
    }
    if (order.orderTypeText === 'investment') {
        const investment = order as Investment;
        if (investment.status === 'active') return '进行中';
        if (investment.status === 'settled') return '已结算';
    }
    return '未知';
}


export default function AdminOrdersPage() {
    const { isAdmin, getUserById, getAllUsers } = useAuth();
    const { getAllHistoricalTrades, getAllUserInvestments } = useBalance();
    const router = useRouter();
    const [allOrders, setAllOrders] = useState<FormattedOrder[]>([]);
    
    // Filter states
    const [typeFilter, setTypeFilter] = useState('all');
    const [statusFilter, setStatusFilter] = useState('all');
    const [dateFilter, setDateFilter] = useState<DateRange | undefined>(undefined);

    const loadData = useCallback(() => {
        if (isAdmin === true) {
            const allUsers = getAllUsers();
            const userMap = new Map(allUsers.map(u => [u.id, u.username]));

            const allTrades = getAllHistoricalTrades();
            const allInvestments = getAllUserInvestments();
            
            const combinedOrders: AllOrderTypes[] = [...allTrades, ...allInvestments];

            const formatted = combinedOrders.map(t => {
                const username = userMap.get(t.user_id) || t.user_id;
                let orderTypeText: FormattedOrder['orderTypeText'] = 'spot';
                if ('orderType' in t) {
                    orderTypeText = t.orderType;
                } else if ('product_name' in t) {
                    orderTypeText = 'investment';
                }
                
                const baseFormatted = {
                    ...t,
                    username: username,
                    orderTypeText: orderTypeText,
                } as FormattedOrder;
                
                return { ...baseFormatted, statusText: getOrderStatusText(baseFormatted) };

            }).sort((a,b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

            setAllOrders(formatted);
        }
    }, [isAdmin, getAllUsers, getAllHistoricalTrades, getAllUserInvestments]);
    
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

    const getOrderAmount = (order: FormattedOrder) => {
        if (order.orderTypeText === 'spot') return (order as SpotTrade).total.toFixed(4);
        if (order.orderTypeText === 'contract') return (order as ContractTrade).amount.toFixed(4);
        if (order.orderTypeText === 'investment') return (order as Investment).amount.toFixed(2);
        return 'N/A';
    }
    
    const getStatusBadge = (order: FormattedOrder) => {
        if (order.orderTypeText === 'spot') return (order as SpotTrade).status === 'filled' ? <Badge variant="outline" className="text-green-500">已成交</Badge> : <Badge variant="secondary">未知</Badge>;
        if (order.orderTypeText === 'contract') {
            const contract = order as ContractTrade;
            if (contract.status === 'active') return <Badge variant="outline" className="text-yellow-500">进行中</Badge>;
            if (contract.outcome === 'win') return <Badge variant="outline" className="text-green-500">盈利 (+{(contract.profit || 0).toFixed(2)})</Badge>;
            if (contract.outcome === 'loss') return <Badge variant="outline" className="text-red-500">亏损 ({(contract.profit || 0).toFixed(2)})</Badge>;
        }
        if (order.orderTypeText === 'investment') {
            const investment = order as Investment;
            if (investment.status === 'active') return <Badge variant="outline" className="text-yellow-500">进行中</Badge>;
            if (investment.status === 'settled') return <Badge variant="outline" className="text-green-500">已结算 (+{(investment.profit || 0).toFixed(2)})</Badge>;
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
                                    <TableHead>金额 (USDT)</TableHead>
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
                                                order.orderTypeText === 'investment' && 'bg-yellow-500/20 text-yellow-500'
                                            )}>
                                                {order.orderTypeText === 'spot' ? '币币' : order.orderTypeText === 'contract' ? '合约' : '理财'}
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
