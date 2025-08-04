
"use client";

import { MarketSummary } from "@/types";
import { Area, AreaChart } from "recharts";
import { Card, CardContent } from "@/components/ui/card";
import { ChartContainer } from "@/components/ui/chart";
import { useMarketData } from "@/hooks/use-market-data";
import { useRouter } from "next/navigation";

const cryptoIcons: { [key: string]: string } = {
  "BTC": "/icons/btc.svg",
  "ETH": "/icons/eth.svg",
  "XRP": "/icons/xrp.svg",
  "LTC": "/icons/ltc.svg",
  "BNB": "/icons/bnb.svg",
  "MATIC": "/icons/matic.svg",
  "SOL": "/icons/sol.svg",
  "XAU": "/icons/gold.svg",
  "EUR": "/icons/eur.svg",
  "GBP": "/icons/gbp.svg",
};

const generateSparklineData = () => {
  const data = [];
  let lastVal = Math.random() * 100;
  for (let i = 0; i < 20; i++) {
    lastVal += (Math.random() - 0.5) * 10;
    data.push({ value: Math.max(0, lastVal) });
  }
  return data;
}

export function MarketList({ summary }: { summary: MarketSummary[] }) {
  const { changeTradingPair } = useMarketData();
  const router = useRouter();

  const handlePairClick = (pair: string) => {
      changeTradingPair(pair);
      router.push('/trade');
  }

  return (
    <Card className="bg-card border-none shadow-none">
        <CardContent className="p-0">
            <div className="space-y-4">
                {summary.map((item) => {
                    const sparklineData = generateSparklineData();
                    const isPositive = item.change >= 0;
                    const color = isPositive ? 'hsl(var(--chart-2))' : 'hsl(10, 80%, 50%)';

                    return (
                        <div key={item.pair} onClick={() => handlePairClick(item.pair)} className="grid grid-cols-[auto_1fr_80px_100px] items-center gap-4 py-2 cursor-pointer hover:bg-muted/50 rounded-lg">
                             <img 
                                src={cryptoIcons[item.pair.split('/')[0]]} 
                                alt={`${item.pair.split('/')[0]} logo`} 
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
                                <p className="font-semibold">{item.price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                                <p className={`text-sm ${isPositive ? 'text-green-500' : 'text-red-500'}`}>
                                    {isPositive ? '+' : ''}{item.change.toFixed(2)}%
                                </p>
                            </div>
                        </div>
                    )
                })}
            </div>
        </CardContent>
    </Card>
  );
}
