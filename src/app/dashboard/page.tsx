
"use client";
import { useState } from "react";
import DashboardLayout from "@/components/dashboard-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Carousel, CarouselContent, CarouselItem } from "@/components/ui/carousel";
import { ArrowRightLeft, Download, Gem, Gift, Landmark, Megaphone, Repeat, Scale, User, BarChart } from "lucide-react";
import { MarketList } from "@/components/market-list";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Link from 'next/link';
import { useBalance } from "@/context/balance-context";
import { DepositDialog } from "@/components/deposit-dialog";
import { WithdrawDialog } from "@/components/withdraw-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useMarket } from "@/context/market-data-context";


export default function DashboardPage() {
    const { cryptoSummaryData, goldSummaryData, forexSummaryData, summaryData } = useMarket();
    const { balances } = useBalance();
    const [isDepositOpen, setIsDepositOpen] = useState(false);
    const [isWithdrawOpen, setIsWithdrawOpen] = useState(false);

    const features = [
        { name: '质押挖矿', icon: Gem, href: '/coming-soon' },
        { name: '助力贷', icon: Landmark, href: '/coming-soon' },
        { name: '闪兑', icon: Repeat, href: '/coming-soon' },
        { name: '下载中心', icon: Download, href: '/download' },
        { name: '推广中心', icon: Gift, href: '/promotion' },
        { name: '秒合约', icon: Scale, href: '/trade?tab=contract' },
        { name: '币币交易', icon: ArrowRightLeft, href: '/trade' },
    ];
    
    const getUsdtValue = (assetName: string, amount: number) => {
        if (assetName === 'USDT') return amount;
        if (assetName === 'BTC') return amount * 68000; // Mock price
        if (assetName === 'ETH') return amount * 3800; // Mock price
        return 0;
    }

    const totalBalance = Object.entries(balances).reduce((acc, [name, balance]) => {
        return acc + getUsdtValue(name, balance.available);
    }, 0);
    
    const renderMarketList = (data: any[]) => {
        if (!summaryData.length) {
            return (
                <div className="space-y-4 mt-4">
                    {[...Array(3)].map((_, i) => (
                         <div key={i} className="grid grid-cols-[auto_1fr_80px_100px] items-center gap-4 py-2">
                             <Skeleton className="h-8 w-8 rounded-full" />
                             <Skeleton className="h-4 w-24" />
                             <Skeleton className="h-10 w-20" />
                              <div className="flex flex-col items-end gap-1">
                                <Skeleton className="h-4 w-16" />
                                <Skeleton className="h-3 w-12" />
                             </div>
                         </div>
                    ))}
                </div>
            )
        }
        return <MarketList summary={data} />
    }


    return (
        <DashboardLayout>
            <div className="p-4 space-y-6">
                {/* Account Balance */}
                <Card className="bg-card">
                    <CardContent className="p-4">
                        <p className="text-muted-foreground text-sm">账户余额(USDT)</p>
                        <p className="text-3xl font-bold mt-1">{totalBalance.toFixed(2)}</p>
                        <div className="grid grid-cols-2 gap-4 mt-4">
                            <Button className="bg-primary/80 hover:bg-primary" onClick={() => setIsDepositOpen(true)}>充币</Button>
                            <Button variant="secondary" onClick={() => setIsWithdrawOpen(true)}>提币</Button>
                        </div>
                    </CardContent>
                </Card>

                {/* Smart Contract Carousel */}
                <Carousel>
                    <CarouselContent>
                        <CarouselItem>
                             <Card className="bg-card relative overflow-hidden">
                                <CardContent className="p-4">
                                    <h3 className="text-lg font-semibold">智能秒合约</h3>
                                    <p className="text-muted-foreground mt-1">质押挖矿</p>
                                    <p className="text-muted-foreground text-sm">轻松放大您的收益</p>
                                    <Button size="sm" className="mt-4 bg-primary/80 hover:bg-primary">客服在线</Button>
                                    <div className="absolute top-4 right-4 text-xs text-muted-foreground">1/5</div>
                                </CardContent>
                            </Card>
                        </CarouselItem>
                         <CarouselItem>
                             <Card className="bg-card relative overflow-hidden">
                                <CardContent className="p-4">
                                    <h3 className="text-lg font-semibold">新功能上线</h3>
                                    <p className="text-muted-foreground mt-1">理财产品</p>
                                    <p className="text-muted-foreground text-sm">稳定收益，安全可靠</p>
                                    <Button size="sm" className="mt-4 bg-primary/80 hover:bg-primary">了解更多</Button>
                                    <div className="absolute top-4 right-4 text-xs text-muted-foreground">2/5</div>
                                </CardContent>
                            </Card>
                        </CarouselItem>
                    </CarouselContent>
                </Carousel>
                

                {/* Announcement */}
                <div className="bg-card p-3 rounded-lg flex items-center space-x-3">
                    <Megaphone className="h-5 w-5 text-primary" />
                    <p className="text-sm text-foreground flex-1 truncate">测试测试测试测试</p>
                </div>

                {/* Features Grid */}
                 <div className="grid grid-cols-4 gap-4 text-center">
                    {features.map(feature => {
                        const Icon = feature.icon;
                        return (
                            <Link href={feature.href} key={feature.name} className="flex flex-col items-center space-y-2">
                                <div className="bg-card p-4 rounded-full">
                                    <Icon className="h-6 w-6 text-primary" />
                                </div>
                                <p className="text-xs text-muted-foreground">{feature.name}</p>
                            </Link>
                        )
                    })}
                </div>
                
                {/* Market List */}
                <Tabs defaultValue="popular">
                    <TabsList className="grid w-full grid-cols-3 bg-card">
                        <TabsTrigger value="popular">热门币种</TabsTrigger>
                        <TabsTrigger value="forex">外汇币种</TabsTrigger>
                        <TabsTrigger value="gold">国际黄金</TabsTrigger>
                    </TabsList>
                    <TabsContent value="popular">
                       {renderMarketList(cryptoSummaryData)}
                    </TabsContent>
                    <TabsContent value="forex">
                       {renderMarketList(forexSummaryData)}
                    </TabsContent>
                    <TabsContent value="gold">
                        {renderMarketList(goldSummaryData)}
                    </TabsContent>
                </Tabs>
            </div>
            <DepositDialog isOpen={isDepositOpen} onOpenChange={setIsDepositOpen} />
            <WithdrawDialog isOpen={isWithdrawOpen} onOpenChange={setIsWithdrawOpen} />
        </DashboardLayout>
    );
}
