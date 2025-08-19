
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
        { name: '每日任务', imgSrc: '/images/book.png', href: '/tasks', labelPosition: 'top' },
        { name: '签到中心', imgSrc: '/images/sup.png', action: () => setIsCheckInOpen(true), labelPosition: 'top' },
        { name: '代理团队', imgSrc: '/images/dai.png', href: '/profile/promotion', labelPosition: 'top' },
        { name: '下载中心', imgSrc: '/images/downloadss.png', href: '/download', labelPosition: 'top' },
        { name: '闪兑', imgSrc: '/images/dui.png', href: '/coming-soon', labelPosition: 'bottom' },
        { name: '秒合约', imgSrc: '/images/tt.png', href: '/trade?tab=contract', labelPosition: 'bottom' },
        { name: '限时活动', imgSrc: '/images/time.png', href: '/activities', labelPosition: 'bottom' },
        { name: '关于我们', imgSrc: '/images/me.png', href: '/coming-soon', labelPosition: 'bottom' },
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
                                        sizes="(max-width: 768px) 100vw, 50vw"
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
                        <div className="bg-card/80 backdrop-blur-sm border-l-4 border-primary p-3 rounded-r-lg flex items-center space-x-3 overflow-hidden cursor-pointer hover:bg-card/90 transition-opacity">
                        <Megaphone className="h-5 w-5 text-primary flex-shrink-0" />
                        <div className="text-sm text-foreground flex-1 truncate whitespace-nowrap">
                            {platformAnnouncements.length > 0 ? platformAnnouncements[0].title : "欢迎来到TradeFlow！"}
                        </div>
                    </div>
                </Link>

                {/* Features Grid */}
                <div className="bg-card/50 backdrop-blur-sm rounded-lg p-2">
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
                                            sizes="(max-width: 768px) 25vw, 10vw"
                                            className="object-cover"
                                        />
                                    ) : null}
                                    <div className={cn(
                                        "absolute left-0 right-0 text-center",
                                        feature.labelPosition === 'top' ? 'top-0 pt-2 px-2' : 'bottom-0 p-2'
                                    )}>
                                         <p className="text-sm font-bold text-blue-900">{feature.name}</p>
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
                <div className="rounded-lg p-2 bg-card/50 backdrop-blur-sm">
                    <Tabs defaultValue="popular">
                        <TabsList className="grid w-full grid-cols-4 bg-background/70 rounded-lg p-1">
                            <TabsTrigger value="popular" className="data-[state=active]:bg-primary/80 data-[state=active]:text-primary-foreground data-[state=active]:shadow-md">热门币种</TabsTrigger>
                            <TabsTrigger value="futures" className="data-[state=active]:bg-primary/80 data-[state=active]:text-primary-foreground data-[state=active]:shadow-md">期货</TabsTrigger>
                            <TabsTrigger value="forex" className="data-[state=active]:bg-primary/80 data-[state=active]:text-primary-foreground data-[state=active]:shadow-md">外汇</TabsTrigger>
                            <TabsTrigger value="gold" className="data-[state=active]:bg-primary/80 data-[state=active]:text-primary-foreground data-[state=active]:shadow-md">黄金</TabsTrigger>
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
