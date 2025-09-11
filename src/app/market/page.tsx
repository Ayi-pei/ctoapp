
"use client";
import DashboardLayout from "@/components/dashboard-layout";
import { MarketList } from "@/components/market-list";
import { Skeleton } from "@/components/ui/skeleton";
import { useEnhancedMarket } from "@/context/enhanced-market-data-context";
import { MarketSummary } from "@/types";


// Disable SSR for this page to avoid context issues
export const dynamic = 'force-dynamic';
export default function MarketPage() {
    const { cryptoSummaryData, klineData, summaryData } = useEnhancedMarket();

    const renderMarketList = (data: MarketSummary[], type: string) => {
        if (summaryData.length === 0 && data.length === 0) {
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
         if (data.length === 0) {
            return <div className="text-center text-muted-foreground py-10">暂无 {type} 市场数据。</div>
        }
        return <MarketList summary={data} klineData={klineData} />
    }

    return (
        <DashboardLayout>
            <div className="flex flex-col h-full bg-card p-4">
                <h1 className="text-2xl font-bold mb-4">行情中心</h1>
                {renderMarketList(cryptoSummaryData, "热门币种")}
            </div>
        </DashboardLayout>
    );
}
