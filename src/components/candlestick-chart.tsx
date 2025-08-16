
"use client"

import { Bar, BarChart, CartesianGrid, Cell, ReferenceLine, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { KlineDataPoint } from "@/types";

type CandlestickChartProps = {
    data: KlineDataPoint[];
};

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="p-2 bg-background/80 border border-border rounded-md shadow-lg text-xs">
        <p className="font-bold">{label}</p>
        <p>Open: <span className="font-mono">{data.open.toFixed(2)}</span></p>
        <p>High: <span className="font-mono">{data.high.toFixed(2)}</span></p>
        <p>Low: <span className="font-mono">{data.low.toFixed(2)}</span></p>
        <p>Close: <span className="font-mono">{data.close.toFixed(2)}</span></p>
      </div>
    );
  }
  return null;
};


export function CandlestickChartComponent({ data }: CandlestickChartProps) {
    if (!data || data.length === 0) return null;

    return (
        <Card>
            <CardContent className="p-2 h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data} barGap={0} barCategoryGap="10%">
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis dataKey="time" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                        <YAxis domain={['dataMin - 100', 'dataMax + 100']} tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" orientation="right" tickFormatter={(val) => val.toLocaleString()} />
                        <Tooltip content={<CustomTooltip />} cursor={{fill: 'hsla(var(--muted), 0.5)'}}/>

                        <Bar dataKey="low" stackId="ohlc" fill="transparent" background={false} />
                        
                        <Bar dataKey="open_close" stackId="ohlc">
                            {data.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.close > entry.open ? "hsl(var(--chart-2))" : "hsl(10 80% 50%)"} />
                            ))}
                        </Bar>
                         <ReferenceLine y={data[data.length - 1].close} stroke="hsl(var(--primary))" strokeDasharray="3 3" />
                    </BarChart>
                </ResponsiveContainer>
            </CardContent>
        </Card>
    );
}

// Pre-process data for the BarChart to render candlesticks
const processDataForChart = (data: KlineDataPoint[]) => {
    return data.map(d => ({
        ...d,
        open_close: [d.open, d.close],
        // The high/low bar is rendered as a separate transparent bar stacked on top
    }));
}
