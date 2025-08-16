
"use client"

import { Bar, ComposedChart, CartesianGrid, ReferenceLine, XAxis, YAxis, Tooltip, ResponsiveContainer, ErrorBar } from "recharts";
import { Card, CardContent } from "@/components/ui/card";
import type { KlineDataPoint } from "@/types";

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

// Pre-process data for the ComposedChart to render candlesticks
const processDataForChart = (data: KlineDataPoint[]) => {
    return data.map(d => ({
        ...d,
        // For the bar, we need an array of [open, close]
        open_close: [d.open, d.close],
        // For the error bar (wick), we need an array of [low, high]
        high_low: [d.low, d.high],
    }));
}


export function CandlestickChartComponent({ data }: CandlestickChartProps) {
    if (!data || data.length === 0) return null;

    const processedData = processDataForChart(data);

    return (
        <Card>
            <CardContent className="p-2 h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={processedData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis dataKey="time" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                        <YAxis domain={['dataMin - 100', 'dataMax + 100']} tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" orientation="right" tickFormatter={(val) => typeof val === 'number' ? val.toLocaleString() : ''} />
                        <Tooltip content={<CustomTooltip />} cursor={{fill: 'hsla(var(--muted), 0.5)'}}/>
                        
                        <ReferenceLine y={data[data.length - 1].close} stroke="hsl(var(--primary))" strokeDasharray="3 3" />
                        
                        <Bar dataKey="open_close" barSize={4}>
                           {processedData.map((entry, index) => (
                                <ErrorBar key={`error-bar-${index}`} dataKey="high_low" width={1} strokeWidth={1} stroke={entry.close > entry.open ? "hsl(var(--chart-2))" : "hsl(var(--destructive))"} direction="y" />
                            ))}
                        </Bar>

                    </ComposedChart>
                </ResponsiveContainer>
            </CardContent>
        </Card>
    );
}
