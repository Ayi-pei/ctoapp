
"use client";

import { MarketSummary, OHLC } from "@/types";
import { Area, AreaChart } from "recharts";
import { Card, CardContent } from "@/components/ui/card";
import { ChartContainer } from "@/components/ui/chart";
import { useRouter } from "next/navigation";
import { useMarket } from "@/context/market-data-context";
import Image from "next/image";

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
    <Card className="bg-transparent border-none shadow-none">
        <CardContent className="p-0">
            <div className="space-y-2">
                {summary.map((item) => {
                    const pairKlineData = klineData[item.pair] || [];
                    const sparklineData = pairKlineData.map(d => ({ value: d.close }));

                    const isPositive = item.change >= 0;
                    const color = isPositive ? 'hsl(var(--chart-2))' : 'hsl(10, 80%, 50%)';

                    return (
                        <div key={item.pair} onClick={() => handlePairClick(item.pair)} className="rounded-lg p-[1px] bg-gradient-to-br from-[--gradient-grey] to-[--gradient-silver] cursor-pointer hover:shadow-lg transition-shadow">
                            <div className="grid grid-cols-[auto_1fr_80px_100px] items-center gap-4 p-2 rounded-[7px] bg-slate-200 dark:bg-card hover:bg-slate-300/80 dark:hover:bg-muted/50 text-slate-800 dark:text-card-foreground">
                                <Image 
                                    src={item.icon || `https://placehold.co/32x32.png`}
                                    alt={`${item.pair.split('/')[0]} logo`} 
                                    width={32}
                                    height={32}
                                    className="h-8 w-8"
                                />
                                <div>
                                    <p className="font-semibold">{item.pair}</p>
                                </div>
                                <div className="h-10 w-20">
                                    <ChartContainer config={{
                                        value: {
                                            label: "Value",
                                            color: color,
                                        }
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
                                <div className="text-right">
                                    <p className="font-semibold">{item.price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 4 })}</p>
                                    <p className={`text-sm ${isPositive ? 'text-green-500' : 'text-red-500'}`}>
                                        {isPositive ? '+' : ''}{(item.change || 0).toFixed(2)}%
                                    </p>
                                </div>
                            </div>
                        </div>
                    )
                })}
            </div>
        </CardContent>
    </Card>
  );
}
