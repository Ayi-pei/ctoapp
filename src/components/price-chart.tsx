"use client";

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartConfig,
} from "@/components/ui/chart";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";
import type { PriceDataPoint } from "@/types";

const chartConfig = {
  price: {
    label: "Price",
    color: "hsl(var(--chart-1))",
  },
} satisfies ChartConfig;

type PriceChartProps = {
    priceData: PriceDataPoint[];
    tradingPair: string;
}

export function PriceChart({ priceData, tradingPair }: PriceChartProps) {
    const latestPrice = priceData.length > 0 ? priceData[priceData.length - 1].price : 0;
    const firstPrice = priceData.length > 0 ? priceData[0].price : 0;
    const priceChange = latestPrice - firstPrice;
    const priceChangePercentage = firstPrice !== 0 ? (priceChange / firstPrice) * 100 : 0;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-baseline justify-between">
            <div>
                <CardTitle>{tradingPair} Price</CardTitle>
                <CardDescription>Real-time price chart</CardDescription>
            </div>
            <div className="text-right">
                <p className="text-2xl font-bold">{latestPrice.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}</p>
                <p className={`text-sm ${priceChange >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                    {priceChange.toFixed(2)} ({priceChangePercentage.toFixed(2)}%)
                </p>
            </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-[350px] w-full">
          <ChartContainer config={chartConfig}>
            <AreaChart
              accessibilityLayer
              data={priceData}
              margin={{
                left: 12,
                right: 12,
                top: 5,
                bottom: 5,
              }}
            >
              <CartesianGrid vertical={false} strokeDasharray="3 3" />
              <XAxis
                dataKey="time"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                tickFormatter={(value) => value.slice(0, 5)}
              />
              <YAxis
                domain={['dataMin', 'dataMax']}
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                orientation="right"
                tickFormatter={(value: number) => `$${value.toFixed(2)}`}
              />
              <ChartTooltip
                cursor={false}
                content={<ChartTooltipContent indicator="line" />}
              />
              <defs>
                <linearGradient id="fillPrice" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--chart-1))" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="hsl(var(--chart-1))" stopOpacity={0.1} />
                </linearGradient>
              </defs>
              <Area
                dataKey="price"
                type="natural"
                fill="url(#fillPrice)"
                stroke="hsl(var(--chart-1))"
                stackId="a"
              />
            </AreaChart>
          </ChartContainer>
        </div>
      </CardContent>
    </Card>
  );
}
