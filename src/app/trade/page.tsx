

"use client";

import React, { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
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
import { Button } from "@/components/ui/button";
import { OrderForm } from "@/components/order-form";
import { useMarket } from "@/context/market-data-context";
import { ContractTrade, SpotTrade } from '@/types';
import { cn } from '@/lib/utils';
import { TradeHistory } from "@/components/trade-history";
import { Archive } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronsUpDown } from 'lucide-react';
import { MarketList } from '@/components/market-list';

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="p-2 bg-background/80 border border-border rounded-md shadow-lg text-xs">
        <p className="font-bold">{label}</p>
        <p>Price: <span className="font-mono text-primary">{payload[0].value.toFixed(2)}</span></p>
      </div>
    );
  }
  return null;
};


const TradePage = React.memo(function TradePage({ defaultTab }: { defaultTab: string }) {
  const marketData = useMarket();
  const { tradingPair, data, summaryData, cryptoSummaryData, goldSummaryData, forexSummaryData } = marketData;
  const [openCollapsible, setOpenCollapsible] = useState<'spot' | 'contract' | null>(null);

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
  
  const isPricePositive = data.summary.change >= 0;
  const chartColor = isPricePositive ? "hsl(var(--chart-2))" : "hsl(var(--destructive))";

  const renderEmptyState = (text: string) => (
      <Card>
          <CardContent className="pt-6 flex flex-col items-center justify-center text-center h-48">
              <Archive className="h-16 w-16 text-muted-foreground" />
              <p className="mt-4 text-muted-foreground">{text}</p>
          </CardContent>
      </Card>
  );

  const handleTriggerClick = (type: 'spot' | 'contract') => {
    setOpenCollapsible(prev => prev === type ? null : type);
  }


  return (
    <DashboardLayout>
      <main className="p-4 flex flex-col gap-4">
        {/* Top Full-width Area */}
        <MarketOverview summary={summaryData.find(s => s.pair === tradingPair)} />

        {/* Main Two-Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          
          {/* Left Column (2/3 width) - Chart */}
          <div className="lg:col-span-2">
            <div className="h-[500px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={data.priceData}
                  margin={{ top: 5, right: 20, left: -10, bottom: 5, }}
                >
                  <defs>
                    <linearGradient id="chartColor" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={chartColor} stopOpacity={0.8} />
                      <stop offset="95%" stopColor={chartColor} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="time" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" domain={['dataMin - 100', 'dataMax + 100']} orientation="right" />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: 'hsla(var(--muted), 0.5)' }} />
                  <Area type="monotone" dataKey="price" stroke={chartColor} fill="url(#chartColor)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Right Column (1/3 width) - Order Forms & Market Info */}
          <div className="lg:col-span-1 space-y-4">
             <div className="space-y-2">
                <Collapsible open={openCollapsible === 'contract'} onOpenChange={() => {}}>
                    <CollapsibleTrigger asChild>
                       <Button variant="outline" className="w-full justify-between" onClick={() => handleTriggerClick('contract')}>
                          秒合约
                          <ChevronsUpDown className="h-4 w-4" />
                        </Button>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="mt-2">
                         <OrderForm
                          tradingPair={tradingPair}
                          balance={balances[quoteAsset]?.available || 0}
                          onPlaceTrade={(trade) => placeContractTrade(trade, tradingPair)}
                          quoteAsset={quoteAsset}
                        />
                    </CollapsibleContent>
                </Collapsible>

                <Collapsible open={openCollapsible === 'spot'} onOpenChange={() => {}}>
                    <CollapsibleTrigger asChild>
                       <Button variant="outline" className="w-full justify-between" onClick={() => handleTriggerClick('spot')}>
                          币币交易
                          <ChevronsUpDown className="h-4 w-4" />
                        </Button>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="mt-2">
                         <SpotOrderForm
                            tradingPair={tradingPair}
                            balances={balances}
                            onPlaceTrade={(trade) => placeSpotTrade(trade)}
                            baseAsset={baseAsset}
                            quoteAsset={quoteAsset}
                            currentPrice={data.summary.price}
                          />
                    </CollapsibleContent>
                </Collapsible>
             </div>
             
             <Tabs defaultValue="pairs">
                <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="pairs">交易对</TabsTrigger>
                    <TabsTrigger value="orderbook">订单簿</TabsTrigger>
                    <TabsTrigger value="trades">市价成交</TabsTrigger>
                </TabsList>
                <TabsContent value="pairs" className="mt-4">
                    <Tabs defaultValue="crypto">
                        <TabsList className="grid w-full grid-cols-3">
                            <TabsTrigger value="crypto">热门</TabsTrigger>
                            <TabsTrigger value="forex">外汇</TabsTrigger>
                            <TabsTrigger value="gold">黄金</TabsTrigger>
                        </TabsList>
                        <TabsContent value="crypto" className="h-[400px] overflow-y-auto pr-2 mt-2">
                           <MarketList summary={cryptoSummaryData} />
                        </TabsContent>
                         <TabsContent value="forex" className="h-[400px] overflow-y-auto pr-2 mt-2">
                           <MarketList summary={forexSummaryData} />
                        </TabsContent>
                         <TabsContent value="gold" className="h-[400px] overflow-y-auto pr-2 mt-2">
                           <MarketList summary={goldSummaryData} />
                        </TabsContent>
                    </Tabs>
                </TabsContent>
                <TabsContent value="orderbook" className="mt-4">
                    <OrderBook asks={data.orderBook.asks} bids={data.orderBook.bids} tradingPair={tradingPair} />
                </TabsContent>
                <TabsContent value="trades" className="mt-4">
                    <TradeHistory trades={data.trades} />
                </TabsContent>
            </Tabs>
          </div>
        </div>
        
        {/* Bottom Full-width Area */}
        <div className="pt-4">
          <Tabs defaultValue="current">
            <TabsList>
              <TabsTrigger value="current">当前委托</TabsTrigger>
              <TabsTrigger value="history">历史委托</TabsTrigger>
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
