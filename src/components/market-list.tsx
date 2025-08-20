
"use client";

import { MarketSummary, OHLC } from "@/types";
import { Area, AreaChart } from "recharts";
import { ChartContainer } from "@/components/ui/chart";
import { useRouter } from "next/navigation";
import { useMarket } from "@/context/market-data-context";
import Image from "next/image";
import { cn } from "@/lib/utils";

type MarketListProps = {
  summary: MarketSummary[];
  klineData: Record<string, OHLC[]>;
};

export function MarketList({ summary, klineData }: MarketListProps) {
  const { changeTradingPair } = useMarket();
  const router = useRouter();

  const handlePairClick = (pair: string) => {
      changeTradingPair(pair);
      router.push('/trade');
  }

  return (
    <div className="space-y-2">
        {summary.map((item) => {
            const pairKlineData = klineData[item.pair] || [];
            const sparklineData = pairKlineData.map(d => ({ value: d.close }));
            const isPositive = item.change >= 0;
            const color = isPositive ? "hsl(var(--chart-2))" : "hsl(var(--destructive))";

            return (
                <div 
                    key={item.pair} 
                    onClick={() => handlePairClick(item.pair)} 
                    className="flex cursor-pointer items-center gap-4 rounded-lg border bg-card p-2 text-card-foreground transition-colors hover:bg-muted"
                >
                    <Image 
                        src={item.icon || `https://placehold.co/32x32.png`}
                        alt={`${item.pair.split('/')[0]} logo`} 
                        width={32}
                        height={32}
                        className="h-8 w-8 flex-shrink-0"
                    />
                    <div className="flex-shrink-0">
                        <p className="font-semibold">{item.pair}</p>
                    </div>
                    <div className="h-10 w-20 flex-grow">
                        <ChartContainer config={{
                            value: { label: "Value", color: color }
                        }} className="h-full w-full p-0">
                            <AreaChart accessibilityLayer data={sparklineData} margin={{ top: 5, right: 0, left: 0, bottom: 5 }}>
                                <defs>
                                    <linearGradient id={`color-${item.pair.replace('/', '')}`} x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor={color} stopOpacity={0.8}/>
                                        <stop offset="95%" stopColor={color} stopOpacity={0}/>
                                    </linearGradient>
                                </defs>
                                <Area
                                    dataKey="value"
                                    type="monotone"
                                    stroke={color}
                                    fillOpacity={1}
                                    fill={`url(#color-${item.pair.replace('/', '')})`}
                                    strokeWidth={2}
                                />
                            </AreaChart>
                        </ChartContainer>
                    </div>
                    <div className="flex w-28 flex-shrink-0 flex-col items-end">
                        <p className="font-semibold">{item.price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 8 })}</p>
                        <p className={cn("text-sm", isPositive ? 'text-green-500' : 'text-red-500')}>
                            {isPositive ? '+' : ''}{(item.change || 0).toFixed(2)}%
                        </p>
                    </div>
                </div>
            )
        })}
    </div>
  );
}

    