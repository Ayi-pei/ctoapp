
"use client";

import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/dashboard-layout';
import { useOptions } from '@/context/options-context';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { OptionContract } from '@/types';
import { cn } from '@/lib/utils';
import { ArrowUpRight, ArrowDownRight, TrendingUp, HelpCircle } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

const OptionsTable = ({ contracts, type }: { contracts: OptionContract[], type: 'call' | 'put' }) => {
    return (
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead>最新价</TableHead>
                    <TableHead>执行价</TableHead>
                    <TableHead className="hidden md:table-cell">IV</TableHead>
                    <TableHead className="hidden lg:table-cell">Delta</TableHead>
                    <TableHead className="hidden lg:table-cell">Gamma</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {contracts.map(contract => {
                    const isPositive = contract.change >= 0;
                    return (
                        <TableRow key={contract.contract_id} className={cn(contract.in_the_money && (type === 'call' ? 'bg-green-500/10' : 'bg-red-500/10'))}>
                            <TableCell>
                                <div className="flex flex-col">
                                    <span className="font-medium">{contract.last_price.toFixed(2)}</span>
                                    <span className={cn("text-xs flex items-center", isPositive ? 'text-green-500' : 'text-red-500')}>
                                        {isPositive ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                                        {contract.change.toFixed(2)} ({contract.change_percent.toFixed(2)}%)
                                    </span>
                                </div>
                            </TableCell>
                            <TableCell className="font-bold text-lg">{contract.strike_price}</TableCell>
                            <TableCell className="hidden md:table-cell">{(contract.implied_volatility * 100).toFixed(2)}%</TableCell>
                            <TableCell className="hidden lg:table-cell">{contract.delta.toFixed(4)}</TableCell>
                            <TableCell className="hidden lg:table-cell">{contract.gamma.toFixed(4)}</TableCell>
                        </TableRow>
                    )
                })}
            </TableBody>
        </Table>
    )
}

const OptionsChainSkeleton = () => (
    <div className="grid md:grid-cols-2 gap-4">
        <Card>
            <CardHeader><Skeleton className="h-8 w-24" /></CardHeader>
            <CardContent>
                {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 w-full my-2" />)}
            </CardContent>
        </Card>
        <Card>
            <CardHeader><Skeleton className="h-8 w-24" /></CardHeader>
            <CardContent>
                {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 w-full my-2" />)}
            </CardContent>
        </Card>
    </div>
)


export default function OptionsPage() {
    const { optionsChain, isLoading, selectedSymbol, changeSymbol, availableSymbols } = useOptions();
    const [selectedExpiration, setSelectedExpiration] = useState<string | undefined>(undefined);

    // Effect to handle selecting an expiration date when the chain data changes.
    useEffect(() => {
        // If the options chain is available
        if (optionsChain && optionsChain.length > 0) {
            const currentExpirationExists = optionsChain.some(c => c.expiration_date === selectedExpiration);
            // If the currently selected expiration doesn't exist in the new chain,
            // or if no expiration is selected yet, default to the first one.
            if (!currentExpirationExists) {
                setSelectedExpiration(optionsChain[0].expiration_date);
            }
        } else {
            // If the options chain is empty, reset the selection.
            setSelectedExpiration(undefined);
        }
    }, [optionsChain, selectedExpiration]);


    const currentChain = optionsChain.find(c => c.expiration_date === selectedExpiration);

    return (
        <DashboardLayout>
            <div className="p-4 md:p-8 space-y-6">
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <h1 className="text-2xl font-bold flex items-center gap-2">
                        <TrendingUp className="h-7 w-7 text-primary" />
                        期权链
                    </h1>
                    <div className="flex items-center gap-4">
                        <Select value={selectedSymbol} onValueChange={changeSymbol}>
                            <SelectTrigger className="w-[120px]">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {availableSymbols.map(symbol => (
                                    <SelectItem key={symbol} value={symbol}>{symbol}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <Select value={selectedExpiration} onValueChange={setSelectedExpiration} disabled={optionsChain.length === 0}>
                            <SelectTrigger className="w-[180px]">
                                <SelectValue placeholder="选择到期日" />
                            </SelectTrigger>
                            <SelectContent>
                                {optionsChain.map(chain => (
                                    <SelectItem key={chain.expiration_date} value={chain.expiration_date}>{chain.expiration_date}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                         <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger><HelpCircle className="h-5 w-5 text-muted-foreground"/></TooltipTrigger>
                                <TooltipContent>
                                    <p className="max-w-xs">高亮行表示该期权为价内期权 (In-the-Money)。数据每小时更新一次，其余时间为模拟数据。</p>
                                </TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                    </div>
                </div>

                {isLoading && !currentChain ? (
                    <OptionsChainSkeleton />
                ) : currentChain ? (
                    <div className="grid md:grid-cols-2 gap-4">
                        <Card>
                            <CardHeader>
                                <CardTitle>看涨 (Calls)</CardTitle>
                                <CardDescription>当您预期标的资产价格上涨时购买</CardDescription>
                            </CardHeader>
                            <CardContent className="px-0">
                                <OptionsTable contracts={currentChain.calls} type="call"/>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader>
                                <CardTitle>看跌 (Puts)</CardTitle>
                                <CardDescription>当您预期标的资产价格下跌时购买</CardDescription>
                            </CardHeader>
                            <CardContent className="px-0">
                               <OptionsTable contracts={currentChain.puts} type="put"/>
                            </CardContent>
                        </Card>
                    </div>
                ) : (
                    <Card className="text-center p-10 text-muted-foreground">
                        <p>无法加载期权数据，请稍后重试。</p>
                    </Card>
                )}
            </div>
        </DashboardLayout>
    );
}
