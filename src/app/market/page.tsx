
"use client";
import DashboardLayout from "@/components/dashboard-layout";
import { MarketList } from "@/components/market-list";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useMarket } from "@/context/market-data-context";

export default function MarketPage() {
    const { cryptoSummaryData, goldSummaryData, forexSummaryData, futuresSummaryData, summaryData, klineData } = useMarket();

    const renderMarketList = (data: any[]) => {
        if (!summaryData.length && data.length === 0) {
            return (
                <div className="space-y-4 mt-4">
                    {[...Array(5)].map((_, i) => (
                         <div key={i} className="grid grid-cols-[auto_1fr_80px_100px] items-center gap-4 py-2 px-4">
                             <Skeleton className="h-8 w-8 rounded-full" />
                             <div className="space-y-2">
                                <Skeleton className="h-4 w-16" />
                             </div>
                             <Skeleton className="h-10 w-20" />
                              <div className="flex flex-col items-end gap-1">
                                <Skeleton className="h-4 w-20" />
                                <Skeleton className="h-3 w-16" />
                             </div>
                         </div>
                    ))}
                </div>
            )
        }
        return <div className="px-4"><MarketList summary={data} klineData={klineData} /></div>
    }

    return (
        <DashboardLayout>
            <div className="flex flex-col h-full">
                 <Tabs defaultValue="popular" className="pt-4">
                    <TabsList className="grid w-full grid-cols-4 bg-purple-900/20 rounded-lg p-1 mx-4">
                        <TabsTrigger value="popular" className="data-[state=active]:bg-gradient-to-r from-purple-500 to-pink-500 data-[state=active]:text-white data-[state=active]:shadow-md bg-purple-900/30 text-amber-500 rounded-md font-bold text-base tracking-wider">热门币种</TabsTrigger>
                        <TabsTrigger value="futures" className="data-[state=active]:bg-gradient-to-r from-purple-500 to-pink-500 data-[state=active]:text-white data-[state=active]:shadow-md bg-purple-900/30 text-amber-500 rounded-md font-bold text-base tracking-wider">期货</TabsTrigger>
                        <TabsTrigger value="forex" className="data-[state=active]:bg-gradient-to-r from-purple-500 to-pink-500 data-[state=active]:text-white data-[state=active]:shadow-md bg-purple-900/30 text-amber-500 rounded-md font-bold text-base tracking-wider">外汇</TabsTrigger>
                        <TabsTrigger value="gold" className="data-[state=active]:bg-gradient-to-r from-purple-500 to-pink-500 data-[state=active]:text-white data-[state=active]:shadow-md bg-purple-900/30 text-amber-500 rounded-md font-bold text-base tracking-wider">黄金</TabsTrigger>
                    </TabsList>
                    <TabsContent value="popular" className="mt-4">
                       {renderMarketList(cryptoSummaryData)}
                    </TabsContent>
                     <TabsContent value="futures" className="mt-4">
                       {renderMarketList(futuresSummaryData)}
                    </TabsContent>
                    <TabsContent value="forex" className="mt-4">
                       {renderMarketList(forexSummaryData)}
                    </TabsContent>
                    <TabsContent value="gold" className="mt-4">
                        {renderMarketList(goldSummaryData)}
                    </TabsContent>
                </Tabs>
            </div>
        </DashboardLayout>
    );
}
