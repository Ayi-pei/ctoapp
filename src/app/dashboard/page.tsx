
"use client";
import { useState } from "react";
import DashboardLayout from "@/components/dashboard-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Carousel, CarouselContent, CarouselItem } from "@/components/ui/carousel";
import { ArrowRight, Download, Gem, Gift, Landmark, Megaphone, Repeat, Scale, Users } from "lucide-react";
import { MarketList } from "@/components/market-list";
import { useMarketData } from "@/hooks/use-market-data";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Link from 'next/link';
import { useBalance } from "@/context/balance-context";
import { DepositDialog } from "@/components/deposit-dialog";
import { WithdrawDialog } from "@/components/withdraw-dialog";


const iconMap: { [key: string]: React.ElementType } = {
    '质押挖矿': Gem,
    '助力贷': Landmark,
    '闪兑': Repeat,
    '下载中心': Download,
    '推广中心': Gift,
    '秒合约': Scale,
    '理财': Users,
    '币币交易': ArrowRight,
};


export default function DashboardPage() {
    const { summaryData } = useMarketData();
    const { balance } = useBalance();
    const [isDepositOpen, setIsDepositOpen] = useState(false);
    const [isWithdrawOpen, setIsWithdrawOpen] = useState(false);

    const features = [
        { name: '质押挖矿', icon: Gem, href: '#' },
        { name: '助力贷', icon: Landmark, href: '#' },
        { name: '闪兑', icon: Repeat, href: '#' },
        { name: '下载中心', icon: Download, href: '#' },
        { name: '推广中心', icon: Gift, href: '#' },
        { name: '秒合约', icon: Scale, href: '/trade' },
        { name: '理财', icon: Users, href: '/finance' },
        { name: '币币交易', icon: ArrowRight, href: '/trade' },
    ];

    return (
        <DashboardLayout>
            <div className="p-4 space-y-6">
                {/* Account Balance */}
                <Card className="bg-card">
                    <CardContent className="p-4">
                        <p className="text-muted-foreground text-sm">账户余额(USDT)</p>
                        <p className="text-3xl font-bold mt-1">{balance.toFixed(2)}</p>
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
                        const isLink = feature.href !== '#';
                        const FeatureComponent = (
                             <div className="flex flex-col items-center space-y-2">
                                <div className="bg-card p-4 rounded-full">
                                    <Icon className="h-6 w-6 text-primary" />
                                </div>
                                <p className="text-xs text-muted-foreground">{feature.name}</p>
                            </div>
                        );
                        
                        if (isLink) {
                            return (
                                <Link href={feature.href} key={feature.name}>
                                    {FeatureComponent}
                                </Link>
                            )
                        }

                        return (
                            <div key={feature.name} className="opacity-50 cursor-not-allowed">
                                 {FeatureComponent}
                            </div>
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
                        <MarketList summary={summaryData} />
                    </TabsContent>
                    <TabsContent value="forex">
                        <Card>
                            <CardContent className="p-6">
                                <p className="text-center text-muted-foreground">外汇币种数据即将上线。</p>
                            </CardContent>
                        </Card>
                    </TabsContent>
                    <TabsContent value="gold">
                        <Card>
                             <CardContent className="p-6">
                                <p className="text-center text-muted-foreground">国际黄金数据即将上线。</p>
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
            </div>
            <DepositDialog isOpen={isDepositOpen} onOpenChange={setIsDepositOpen} />
            <WithdrawDialog isOpen={isWithdrawOpen} onOpenChange={setIsWithdrawOpen} />
        </DashboardLayout>
    );
}
