"use client";
"use client";

import { useState, useEffect } from "react";
import DashboardLayout from "@/components/dashboard-layout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
} from "@/components/ui/carousel";
import {
  Megaphone,
  ArrowRight,
  BookCheck,
  CalendarCheck,
  Users,
  Download,
  Repeat,
  CandlestickChart,
  Timer,
  Info,
} from "lucide-react";
import { MarketList } from "@/components/market-list";
import Link from "next/link";
import { useBalance } from "@/context/balance-context";
import { DepositDialog } from "@/components/deposit-dialog";
import { WithdrawDialog } from "@/components/withdraw-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useAnnouncements } from "@/context/announcements-context";
import { MarketSummary } from "@/types";
import { CheckInDialog } from "@/components/check-in-dialog";
import Image from "next/image";
import Autoplay from "embla-carousel-autoplay";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useEnhancedMarket } from "@/context/enhanced-market-data-context";
import { MarketDataDebug } from "@/components/market-data-debug";

// Disable SSR for this page to avoid context issues
export const dynamic = 'force-dynamic';

export default function DashboardPage() {
  const {
    cryptoSummaryData = [],
    summaryData = [],
    klineData = {} as any,
  } = useEnhancedMarket();

  // 正确分离币种数据和期货数据
  const CRYPTO_PAIRS = [
    "BTC/USDT",
    "ETH/USDT",
    "SOL/USDT",
    "XRP/USDT",
    "LTC/USDT",
    "BNB/USDT",
    "MATIC/USDT",
    "DOGE/USDT",
    "ADA/USDT",
    "SHIB/USDT",
  ];
  const FOREX_OPTIONS_PAIRS = [
    "XAU/USD",
    "EUR/USD",
    "GBP/USD",
    "IBM",
    "AAPL",
    "TSLA",
    "MSFT",
  ];

  // 从 summaryData 中正确分离数据
  const actualCryptoData = (summaryData ?? []).filter(
    (s: MarketSummary) =>
      s && typeof s.pair === "string" && CRYPTO_PAIRS.includes(s.pair)
  );

  const forexAndOptionsSummaryData = (summaryData ?? []).filter(
    (s: MarketSummary) =>
      s && typeof s.pair === "string" && FOREX_OPTIONS_PAIRS.includes(s.pair)
  );

  // 调试信息 - 开发环境下显示数据状态
  if (process.env.NODE_ENV === "development") {
    console.log("Dashboard数据状态:", {
      summaryData: summaryData.length,
      cryptoSummaryData: cryptoSummaryData.length,
      actualCryptoData: actualCryptoData.length,
      forexAndOptionsData: forexAndOptionsSummaryData.length,
      cryptoPairs: actualCryptoData.map((d: any) => d.pair),
      forexPairs: forexAndOptionsSummaryData.map((d: any) => d.pair),
    });
  }

  const { balances } = useBalance();
  const { hornAnnouncements } = useAnnouncements();
  const [isDepositOpen, setIsDepositOpen] = useState(false);
  const [isWithdrawOpen, setIsWithdrawOpen] = useState(false);
  const [isCheckInOpen, setIsCheckInOpen] = useState(false);
  const [currentHornIndex, setCurrentHornIndex] = useState(0);

  const activeHornAnnouncements = hornAnnouncements
    .filter((ann) => !ann.expires_at || new Date(ann.expires_at) > new Date())
    .sort((a, b) => b.priority - a.priority);

  useEffect(() => {
    if (activeHornAnnouncements.length === 0) return;

    const timer = setInterval(() => {
      setCurrentHornIndex(
        (prevIndex) => (prevIndex + 1) % activeHornAnnouncements.length
      );
    }, 5000); // Change announcement every 5 seconds

    return () => clearInterval(timer);
  }, [activeHornAnnouncements]);

  const features = [
    { name: "每日任务", icon: BookCheck, href: "/tasks" },
    {
      name: "签到中心",
      icon: CalendarCheck,
      action: () => setIsCheckInOpen(true),
    },
    { name: "代理团队", icon: Users, href: "/profile/promotion" },
    { name: "下载中心", icon: Download, href: "/download" },
    { name: "闪兑", icon: Repeat, href: "/swap" },
    { name: "秒合约", icon: CandlestickChart, href: "/trade?tab=contract" },
    { name: "限时活动", icon: Timer, href: "/activities" },
    { name: "关于我们", icon: Info, href: "/coming-soon" },
  ];

  const getUsdtValue = (assetName: string, amount: number) => {
    if (assetName === "USDT") return amount;
    const assetSummary = summaryData.find((s: any) =>
      s.pair.startsWith(assetName)
    );
    return amount * (assetSummary?.price || 0);
  };

  const totalBalance = Object.entries(balances).reduce(
    (acc, [name, balance]) => {
      return acc + getUsdtValue(name, balance.available);
    },
    0
  );

  const renderMarketList = (data: MarketSummary[], type: string) => {
    if (summaryData.length === 0 && data.length === 0) {
      // Check both to avoid flicker
      return (
        <div className="space-y-4 mt-4">
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              className="grid grid-cols-[auto_1fr_80px_100px] items-center gap-4 py-2"
            >
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
      );
    }
    if (data.length === 0) {
      return (
        <div className="text-center text-muted-foreground py-10">
          暂无 {type} 市场数据。
        </div>
      );
    }
    return <MarketList summary={data} klineData={klineData} />;
  };

  const currentHornAnnouncement =
    activeHornAnnouncements.length > 0
      ? activeHornAnnouncements[currentHornIndex]
      : null;

  return (
    <DashboardLayout>
      <div className="p-4 space-y-6">
        {/* Smart Contract Carousel */}
        <Carousel
          className="w-full"
          opts={{ loop: true }}
          plugins={[
            Autoplay({
              delay: 5000,
            }),
          ]}
        >
          <CarouselContent>
            {useAnnouncements().carouselItems.map((item, index) => (
              <CarouselItem key={index}>
                <Card className="relative w-full h-40 overflow-hidden text-white">
                  <Image
                    src={item.imgSrc}
                    alt={item.title}
                    fill
                    sizes="(max-width: 768px) 100vw, 50vw"
                    className="object-cover"
                    data-ai-hint="investment promotion"
                  />
                  <div className="absolute inset-0 bg-black/50 flex flex-col justify-end p-4">
                    <h3 className="text-xl font-bold">{item.title}</h3>
                    <p className="text-sm text-white/80">{item.description}</p>
                    <Link href={item.href}>
                      <Button
                        variant="link"
                        className="text-amber-300 p-0 h-auto justify-start mt-1"
                      >
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
              {currentHornAnnouncement ? (
                <span className="font-semibold text-primary mr-2">
                  【{currentHornAnnouncement.theme}】
                </span>
              ) : (
                <span className="font-semibold text-primary mr-2">
                  【平台公告】
                </span>
              )}
              {currentHornAnnouncement
                ? currentHornAnnouncement.content
                : "欢迎来到CoinSR！"}
            </div>
          </div>
        </Link>

        {/* Features Grid */}
        <div className="bg-card/50 backdrop-blur-sm rounded-lg p-2">
          <div className="grid grid-cols-4 gap-4">
            {features.map((feature) => {
              const content = (
                <div className="flex flex-col items-center justify-center gap-2 py-3 rounded-lg group">
                  <feature.icon className="h-8 w-8 text-yellow-500" />
                  <p className="text-xs font-semibold text-foreground">
                    {feature.name}
                  </p>
                </div>
              );

              if (feature.href) {
                return (
                  <Link
                    href={feature.href}
                    key={feature.name}
                    className="cursor-pointer hover:bg-muted/50 rounded-lg transition-colors border shadow-sm"
                  >
                    {content}
                  </Link>
                );
              }

              return (
                <div
                  key={feature.name}
                  className="cursor-pointer hover:bg-muted/50 rounded-lg transition-colors border shadow-sm"
                  onClick={feature.action}
                >
                  {content}
                </div>
              );
            })}
          </div>
        </div>

        {/* Market List */}
        <Tabs
          defaultValue="crypto"
          className="w-full bg-card/50 backdrop-blur-sm rounded-lg p-2"
        >
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="crypto">热门币种</TabsTrigger>
            <TabsTrigger value="forex">期权外汇</TabsTrigger>
          </TabsList>
          <TabsContent value="crypto" className="mt-4">
            {renderMarketList(
              actualCryptoData.length > 0
                ? actualCryptoData
                : cryptoSummaryData,
              "热门币种"
            )}
          </TabsContent>
          <TabsContent value="forex" className="mt-4">
            {renderMarketList(forexAndOptionsSummaryData, "期权外汇")}
          </TabsContent>
        </Tabs>

        <DepositDialog isOpen={isDepositOpen} onOpenChange={setIsDepositOpen} />
        <WithdrawDialog
          isOpen={isWithdrawOpen}
          onOpenChange={setIsWithdrawOpen}
        />
        <CheckInDialog isOpen={isCheckInOpen} onOpenChange={setIsCheckInOpen} />
      </div>
    </DashboardLayout>
  );
}
