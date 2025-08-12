
"use client";

import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { OrderBook } from "@/components/order-book";
import { Skeleton } from "@/components/ui/skeleton";
import { MarketOverview } from "@/components/market-overview";
import DashboardLayout from "@/components/dashboard-layout";
import { useBalance } from "@/context/balance-context";
import { SpotOrderForm } from "@/components/spot-order-form";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from '@/components/ui/badge';
import Image from "next/image";
import { OrderForm } from "@/components/order-form";
import { useMarket } from "@/context/market-data-context";
import { useAuth } from '@/context/auth-context';
import { ContractTrade, SpotTrade } from '@/types';
import { cn } from '@/lib/utils';


function TradePage({ defaultTab }: { defaultTab: string }) {
  const marketData = useMarket();
  const { tradingPair, data, summaryData } = marketData;
  const { balances, placeSpotTrade, placeContractTrade, isLoading: isBalanceLoading } = useBalance();
  const { user } = useAuth();
  
  const [activeContractTrades, setActiveContractTrades] = useState<ContractTrade[]>([]);
  const [historicalTrades, setHistoricalTrades] = useState<(SpotTrade | ContractTrade)[]>([]);

   useEffect(() => {
        if (user) {
            try {
                const allContractTrades: ContractTrade[] = JSON.parse(localStorage.getItem('contractTrades') || '[]');
                const allSpotTrades: SpotTrade[] = JSON.parse(localStorage.getItem('spotTrades') || '[]');
                
                const userContractTrades = allContractTrades.filter(t => t.userId === user.username);
                const userSpotTrades = allSpotTrades.filter(t => t.userId === user.username);

                setActiveContractTrades(userContractTrades.filter(t => t.status === 'active'));
                
                const settledContractTrades = userContractTrades.filter(t => t.status === 'settled');
                const combinedHistory = [...settledContractTrades, ...userSpotTrades]
                    .sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

                setHistoricalTrades(combinedHistory);

            } catch (error) {
                console.error("Failed to fetch user trades:", error);
            }
        }
    }, [user, marketData]); // re-run when market data updates to catch settlements


  if (!data || !summaryData.length || isBalanceLoading) {
    return (
       <DashboardLayout>
            <main className="p-4">
                <div className="mb-4">
                    <Skeleton className="h-[90px] w-full" />
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-[1fr_350px] gap-4">
                    <div className="flex flex-col gap-4">
                        <Skeleton className="h-[500px] w-full" />
                        <Skeleton className="h-[300px] w-full" />
                    </div>
                    <div className="flex flex-col gap-4">
                        <Skeleton className="h-[420px] w-full" />
                        <Skeleton className="h-[200px] w-full" />
                    </div>
                </div>
            </main>
       </DashboardLayout>
    );
  }

  const [baseAsset, quoteAsset] = tradingPair.split('/');

  const renderEmptyState = (text: string) => (
      <Card>
          <CardContent className="pt-6 flex flex-col items-center justify-center text-center h-48">
              <Image src="https://placehold.co/100x100.png" alt="No data" width={80} height={80} data-ai-hint="illustration no-data" />
              <p className="mt-4 text-muted-foreground">{text}</p>
          </CardContent>
      </Card>
  );

  return (
    <DashboardLayout>
        <main className="p-4 space-y-4">
            <div className="mb-4">
                <MarketOverview summary={summaryData.find(s => s.pair === tradingPair)} />
            </div>
            <Tabs defaultValue={defaultTab} className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="spot">币币交易</TabsTrigger>
                    <TabsTrigger value="contract">秒合约</TabsTrigger>
                </TabsList>
                <TabsContent value="spot">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                        <div className="flex flex-col gap-4">
                            <OrderBook asks={data.orderBook.asks} bids={data.orderBook.bids} tradingPair={tradingPair} />
                        </div>
                        <div className="flex flex-col gap-4">
                            <SpotOrderForm
                                tradingPair={tradingPair}
                                balances={balances}
                                onPlaceTrade={(trade) => placeSpotTrade(trade, tradingPair)}
                                baseAsset={baseAsset}
                                quoteAsset={quoteAsset}
                                currentPrice={data.summary.price}
                            />
                        </div>
                    </div>
                </TabsContent>
                <TabsContent value="contract">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                        <div className="flex flex-col gap-4">
                            <OrderBook asks={data.orderBook.asks} bids={data.orderBook.bids} tradingPair={tradingPair} />
                        </div>
                        <div className="flex flex-col gap-4">
                            <OrderForm
                                tradingPair={tradingPair}
                                balance={balances['USDT']?.available || 0}
                                onPlaceTrade={(trade) => placeContractTrade(trade, tradingPair)}
                            />
                        </div>
                    </div>
                </TabsContent>
            </Tabs>
            
            <div className="pt-4">
                <Tabs defaultValue="current">
                    <TabsList>
                        <TabsTrigger value="current">当前委托</TabsTrigger>
                        <TabsTrigger value="history">历史委托</TabsTrigger>
                    </TabsList>
                    <TabsContent value="current">
                       {activeContractTrades.length > 0 ? (
                           <Card>
                               <CardContent className="p-2">
                                  <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>交易对</TableHead>
                                            <TableHead>方向</TableHead>
                                            <TableHead>开仓价</TableHead>
                                            <TableHead>金额</TableHead>
                                            <TableHead>创建时间</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {activeContractTrades.map(trade => (
                                            <TableRow key={trade.id}>
                                                <TableCell>{trade.tradingPair}</TableCell>
                                                <TableCell className={cn(trade.type === 'buy' ? 'text-green-500' : 'text-red-500')}>
                                                    {trade.type === 'buy' ? '买涨' : '买跌'}
                                                </TableCell>
                                                <TableCell>{trade.entryPrice.toFixed(4)}</TableCell>
                                                <TableCell>{trade.amount.toFixed(2)} USDT</TableCell>
                                                <TableCell className="text-xs">{new Date(trade.createdAt).toLocaleString()}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                               </CardContent>
                           </Card>
                       ) : renderEmptyState("暂无当前委托")}
                    </TabsContent>
                    <TabsContent value="history">
                        {historicalTrades.length > 0 ? (
                             <Card>
                               <CardContent className="p-2">
                                  <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>交易对</TableHead>
                                            <TableHead>类型</TableHead>
                                            <TableHead>结果</TableHead>
                                            <TableHead>金额/盈利</TableHead>
                                            <TableHead>时间</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {historicalTrades.map(trade => (
                                            <TableRow key={trade.id}>
                                                <TableCell>{trade.tradingPair}</TableCell>
                                                <TableCell>
                                                    {trade.orderType === 'spot' ? '币币' : '合约'}
                                                </TableCell>
                                                 <TableCell>
                                                   {trade.orderType === 'spot' ? (
                                                        <Badge variant="outline" className={cn(trade.type === 'buy' ? 'text-green-500' : 'text-red-500')}>
                                                            {trade.type === 'buy' ? `买入` : `卖出`}
                                                        </Badge>
                                                    ) : (
                                                        <Badge variant="outline" className={cn(
                                                            (trade as ContractTrade).outcome === 'win' ? 'text-green-500' : 'text-red-500'
                                                        )}>
                                                            {(trade as ContractTrade).outcome === 'win' ? '盈利' : '亏损'}
                                                        </Badge>
                                                    )}
                                                </TableCell>
                                                <TableCell>
                                                     {trade.orderType === 'spot' ? (
                                                        <span>{(trade as SpotTrade).total.toFixed(2)} USDT</span>
                                                    ) : (
                                                        <span className={cn((trade as ContractTrade).profit ?? 0 > 0 ? 'text-green-500' : 'text-red-500')}>
                                                            {((trade as ContractTrade).profit ?? 0).toFixed(2)} USDT
                                                        </span>
                                                    )}
                                                </TableCell>
                                                <TableCell className="text-xs">{new Date(trade.createdAt).toLocaleString()}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                               </CardContent>
                           </Card>
                        ) : renderEmptyState("暂无历史委托")}
                    </TabsContent>
                </Tabs>
            </div>
        </main>
    </DashboardLayout>
  );
}


function TradePageWrapper() {
  const searchParams = useSearchParams();
  const tab = searchParams.get('tab');
  const defaultTab = tab === 'contract' ? 'contract' : 'spot';
  
  return <TradePage defaultTab={defaultTab} />;
}


export default function SuspenseWrapper() {
    return (
        <React.Suspense fallback={<DashboardLayout><main className="p-4"><Skeleton className="h-full w-full" /></main></DashboardLayout>}>
            <TradePageWrapper />
        </React.Suspense>
    )
}
