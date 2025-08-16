

"use client";

import React from 'react';
import { useSearchParams } from 'next/navigation';
import { OrderBook } from "@/components/order-book";
import { Skeleton } from "@/components/ui/skeleton";
import { MarketOverview } from "@/components/market-overview";
import DashboardLayout from "@/components/dashboard-layout";
import { useBalance } from "@/context/balance-context";
import { SpotOrderForm } from "@/components/spot-order-form";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from '@/components/ui/badge';
import Image from "next/image";
import { OrderForm } from "@/components/order-form";
import { useMarket } from "@/context/market-data-context";
import { ContractTrade, SpotTrade } from '@/types';
import { cn } from '@/lib/utils';
import { TradeHistory } from "@/components/trade-history";
import { Archive } from 'lucide-react';
import { CandlestickChartComponent } from '@/components/candlestick-chart';


const TradePage = React.memo(function TradePage({ defaultTab }: { defaultTab: string }) {
  const marketData = useMarket();
  const { tradingPair, data, summaryData } = marketData;
  const { 
    balances, 
    placeSpotTrade, 
    placeContractTrade, 
    isLoading: isBalanceLoading,
    activeContractTrades,
    historicalTrades,
  } = useBalance();
  
  if (!data || !summaryData.length || isBalanceLoading) {
    return (
       <DashboardLayout>
            <main className="p-4 space-y-4">
                <Skeleton className="h-[60px] w-full" />
                <Skeleton className="h-[400px] w-full" />
                <Skeleton className="h-[300px] w-full" />
            </main>
       </DashboardLayout>
    );
  }

  const [baseAsset, quoteAsset] = tradingPair.split('/');

  const renderEmptyState = (text: string) => (
      <Card>
          <CardContent className="pt-6 flex flex-col items-center justify-center text-center h-48">
              <Archive className="h-16 w-16 text-muted-foreground" />
              <p className="mt-4 text-muted-foreground">{text}</p>
          </CardContent>
      </Card>
  );

  return (
    <DashboardLayout>
        <main className="p-4 space-y-4">
            <MarketOverview summary={summaryData.find(s => s.pair === tradingPair)} />
            
            <div className="h-[400px]">
              <CandlestickChartComponent data={data.klineData} />
            </div>

            <Tabs defaultValue={defaultTab} className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="contract">秒合约</TabsTrigger>
                    <TabsTrigger value="spot">币币交易</TabsTrigger>
                </TabsList>
                <TabsContent value="spot" className="mt-4">
                    <SpotOrderForm
                        tradingPair={tradingPair}
                        balances={balances}
                        onPlaceTrade={(trade) => placeSpotTrade(trade)}
                        baseAsset={baseAsset}
                        quoteAsset={quoteAsset}
                        currentPrice={data.summary.price}
                    />
                </TabsContent>
                <TabsContent value="contract" className="mt-4">
                    <OrderForm
                        tradingPair={tradingPair}
                        balance={balances[quoteAsset]?.available || 0}
                        onPlaceTrade={(trade) => placeContractTrade(trade, tradingPair)}
                        quoteAsset={quoteAsset}
                    />
                </TabsContent>
            </Tabs>
            
            <div className="pt-4">
                <Tabs defaultValue="current">
                    <TabsList>
                        <TabsTrigger value="current">当前委托</TabsTrigger>
                        <TabsTrigger value="history">历史委托</TabsTrigger>
                        <TabsTrigger value="orderbook">订单簿</TabsTrigger>
                        <TabsTrigger value="trades">市价成交</TabsTrigger>
                    </TabsList>
                    <TabsContent value="current" className="mt-4">
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
                                                <TableCell>{trade.trading_pair}</TableCell>
                                                <TableCell className={cn(trade.type === 'buy' ? 'text-green-500' : 'text-red-500')}>
                                                    {trade.type === 'buy' ? '买涨' : '买跌'}
                                                </TableCell>
                                                <TableCell>{trade.entry_price.toFixed(4)}</TableCell>
                                                <TableCell>{trade.amount.toFixed(2)} {trade.trading_pair.split('/')[1]}</TableCell>
                                                <TableCell className="text-xs">{new Date(trade.created_at).toLocaleString()}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                               </CardContent>
                           </Card>
                       ) : renderEmptyState("暂无当前委托")}
                    </TabsContent>
                    <TabsContent value="history" className="mt-4">
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
                                                <TableCell>{trade.trading_pair}</TableCell>
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
                                                        <span>{(trade as SpotTrade).total.toFixed(2)} {trade.trading_pair.split('/')[1]}</span>
                                                    ) : (
                                                        <span className={cn((trade as ContractTrade).profit ?? 0 >= 0 ? 'text-green-500' : 'text-red-500')}>
                                                            {((trade as ContractTrade).profit ?? 0) >= 0 ? '+' : ''}{((trade as ContractTrade).profit ?? 0).toFixed(2)} {trade.trading_pair.split('/')[1]}
                                                        </span>
                                                    )}
                                                </TableCell>
                                                <TableCell className="text-xs">{new Date(trade.created_at).toLocaleString()}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                               </CardContent>
                           </Card>
                        ) : renderEmptyState("暂无历史委托")}
                    </TabsContent>
                    <TabsContent value="orderbook" className="mt-4">
                        <OrderBook asks={data.orderBook.asks} bids={data.orderBook.bids} tradingPair={tradingPair} />
                    </TabsContent>
                    <TabsContent value="trades" className="mt-4">
                       <TradeHistory trades={data.trades} />
                    </TabsContent>
                </Tabs>
            </div>
        </main>
    </DashboardLayout>
  );
});


function TradePageWrapper() {
  const searchParams = useSearchParams();
  const tab = searchParams.get('tab');
  const defaultTab = tab === 'spot' ? 'spot' : 'contract';
  
  return <TradePage defaultTab={defaultTab} />;
}


export default function SuspenseWrapper() {
    return (
        <React.Suspense fallback={<DashboardLayout><main className="p-4"><Skeleton className="h-full w-full" /></main></DashboardLayout>}>
            <TradePageWrapper />
        </React.Suspense>
    )
}
