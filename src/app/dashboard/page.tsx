
"use client";
import { useState } from "react";
import DashboardLayout from "@/components/dashboard-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Carousel, CarouselContent, CarouselItem } from "@/components/ui/carousel";
import { Megaphone, ArrowRight } from "lucide-react";
import { MarketList } from "@/components/market-list";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Link from 'next/link';
import { useBalance } from "@/context/balance-context";
import { DepositDialog } from "@/components/deposit-dialog";
import { WithdrawDialog } from "@/components/withdraw-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useMarket } from "@/context/market-data-context";
import { useAnnouncements } from "@/context/announcements-context";
import { CheckInDialog } from "@/components/check-in-dialog";
import Image from "next/image";
import { cn } from "@/lib/utils";


const carouselItems = [
    {
        title: "智能秒合约",
        description: "预测市场，秒速盈利",
        href: "/trade?tab=contract",
        imgSrc: "/images/lun.png",
    },
    {
        title: "高收益理财",
        description: "稳定增值，安心之选",
        href: "/finance",
        imgSrc: "/images/lun01.png",
    },
    {
        title: "邀请好友赚佣金",
        description: "分享链接，共享收益",
        href: "/profile/promotion",
        imgSrc: "/images/lun02.png",
    }
];


export default function DashboardPage() {
    const { cryptoSummaryData, goldSummaryData, forexSummaryData, futuresSummaryData, summaryData, klineData } = useMarket();
    const { balances } = useBalance();
    const { platformAnnouncements } = useAnnouncements();
    const [isDepositOpen, setIsDepositOpen] = useState(false);
    const [isWithdrawOpen, setIsWithdrawOpen] = useState(false);
    const [isCheckInOpen, setIsCheckInOpen] = useState(false);

    const features = [
        { name: '每日任务', imgSrc: '/images/book.png', href: '/coming-soon' },
        { name: '签到中心', imgSrc: '/images/sup.png', action: () => setIsCheckInOpen(true) },
        { name: '代理团队', imgSrc: '/images/dai.png', href: '/profile/promotion' },
        { name: '下载中心', imgSrc: '/images/downloadss.png', href: '/download' },
        { name: '闪兑', imgSrc: '/images/dui.png', href: '/coming-soon' },
        { name: '秒合约', imgSrc: '/images/tt.png', href: '/trade?tab=contract' },
        { name: '限时活动', imgSrc: '/images/time.png', href: '/coming-soon' },
        { name: '关于我们', imgSrc: '/images/me.png', href: '/coming-soon' },
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
        if (!summaryData.length && data.length === 0) { // Check both to avoid flicker
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
        return <MarketList summary={data} klineData={klineData} />
    }


    return (
        <DashboardLayout>
            <div className="p-4 space-y-6">
                {/* Smart Contract Carousel */}
                <Carousel className="w-full" opts={{ loop: true }}>
                    <CarouselContent>
                        {carouselItems.map((item, index) => (
                             <CarouselItem key={index}>
                                <Card className="relative w-full h-40 overflow-hidden text-white">
                                    <Image
                                        src={item.imgSrc}
                                        alt={item.title}
                                        fill
                                        className="object-cover"
                                    />
                                    <div className="absolute inset-0 bg-black/50 flex flex-col justify-end p-4">
                                        <h3 className="text-xl font-bold">{item.title}</h3>
                                        <p className="text-sm text-white/80">{item.description}</p>
                                        <Link href={item.href}>
                                             <Button variant="link" className="text-amber-300 p-0 h-auto justify-start mt-1">
                                                了解更多 <ArrowRight className="w-4 h-4 ml-1" />
                                             </Button>
                                        </Link>
                                    </div>
                                </Card>
                            </CarouselItem>
                        ))}
                    </CarouselContent>
                </Carousel>
                

                {/* Announcement */}
                <Link href="/announcements">
                        <div className="bg-gradient-to-r from-slate-200 to-amber-400 border-l-4 border-amber-500 p-3 rounded-r-lg flex items-center space-x-3 overflow-hidden cursor-pointer hover:opacity-90 transition-opacity">
                        <Megaphone className="h-5 w-5 text-black flex-shrink-0" />
                        <div className="text-sm text-black flex-1 truncate whitespace-nowrap">
                            {platformAnnouncements.length > 0 ? platformAnnouncements[0].title : "欢迎来到TradeFlow！"}
                        </div>
                    </div>
                </Link>

                {/* Features Grid */}
                <div className="bg-gray-500/60 rounded-lg p-2">
                    <div className="grid grid-cols-4 gap-2">
                        {features.map((feature) => {
                            const content = (
                                <div
                                    className="relative w-full overflow-hidden rounded-lg group aspect-square"
                                    onClick={(feature as any).action}
                                >
                                    {(feature as any).imgSrc ? (
                                        <Image
                                            src={(feature as any).imgSrc}
                                            alt={feature.name}
                                            fill
                                            className="object-cover"
                                        />
                                    ) : null}
                                    <div className="absolute bottom-0 left-0 right-0 p-2 text-center">
                                         <p className="text-xs font-semibold text-white">{feature.name}</p>
                                    </div>
                                </div>
                            );

                            if ((feature as any).href) {
                                return (
                                    <Link href={(feature as any).href} key={feature.name}>
                                        {content}
                                    </Link>
                                );
                            }

                            return (
                                <div key={feature.name} className="cursor-pointer">
                                    {content}
                                </div>
                            );
                        })}
                    </div>
                </div>
                
                {/* Market List */}
                <div className="rounded-lg p-2">
                    <Tabs defaultValue="popular">
                        <TabsList className="grid w-full grid-cols-4 bg-purple-900/20 rounded-lg p-1">
                            <TabsTrigger value="popular" className="data-[state=active]:bg-gradient-to-r from-purple-500 to-pink-500 data-[state=active]:text-white data-[state=active]:shadow-md bg-purple-900/30 text-amber-500 rounded-md font-bold text-base tracking-wider">热门币种</TabsTrigger>
                            <TabsTrigger value="futures" className="data-[state=active]:bg-gradient-to-r from-purple-500 to-pink-500 data-[state=active]:text-white data-[state=active]:shadow-md bg-purple-900/30 text-amber-500 rounded-md font-bold text-base tracking-wider">期货</TabsTrigger>
                            <TabsTrigger value="forex" className="data-[state=active]:bg-gradient-to-r from-purple-500 to-pink-500 data-[state=active]:text-white data-[state=active]:shadow-md bg-purple-900/30 text-amber-500 rounded-md font-bold text-base tracking-wider">外汇</TabsTrigger>
                            <TabsTrigger value="gold" className="data-[state=active]:bg-gradient-to-r from-purple-500 to-pink-500 data-[state=active]:text-white data-[state=active]:shadow-md bg-purple-900/30 text-amber-500 rounded-md font-bold text-base tracking-wider">黄金</TabsTrigger>
                        </TabsList>
                        <TabsContent value="popular">
                            {renderMarketList(cryptoSummaryData)}
                        </TabsContent>
                        <TabsContent value="futures">
                            {renderMarketList(futuresSummaryData)}
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
                <CheckInDialog isOpen={isCheckInOpen} onOpenChange={setIsCheckInOpen} />
            </div>
        </DashboardLayout>
    );
}
