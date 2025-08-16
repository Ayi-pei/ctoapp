
"use client"

import { Bar, ComposedChart, CartesianGrid, ReferenceLine, XAxis, YAxis, Tooltip, ResponsiveContainer, ErrorBar, Cell } from "recharts";
import type { KlineDataPoint } from "@/types";

type CandlestickChartProps = {
    data: KlineDataPoint[];
};

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    // Find the payload for the visible bar (body)
    const dataPoint = payload.find(p => p.dataKey === 'body');
    if (!dataPoint) return null;
    
    const data = dataPoint.payload;
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
        // The base value for the stacked bar (the lower of open/close)
        base: Math.min(d.open, d.close),
        // The visible part of the bar (the difference between open and close)
        body: Math.abs(d.open - d.close),
        // For the error bar (wick), we need an array of [low, high]
        high_low: [d.low, d.high],
        // Color for the visible bar
        fill: d.close > d.open ? "hsl(var(--chart-2))" : "hsl(var(--destructive))",
    }));
}


export function CandlestickChartComponent({ data }: CandlestickChartProps) {
    if (!data || data.length === 0) return null;

    const processedData = processDataForChart(data);

    return (
        <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={processedData} margin={{ top: 20, right: 20, bottom: 20, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="time" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis domain={['dataMin - 100', 'dataMax + 100']} tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" orientation="right" tickFormatter={(val) => typeof val === 'number' ? val.toLocaleString() : ''} />
                <Tooltip content={<CustomTooltip />} cursor={{fill: 'hsla(var(--muted), 0.5)'}}/>
                
                <ReferenceLine y={data[data.length - 1].close} stroke="hsl(var(--primary))" strokeDasharray="3 3" />
                
                {/* Transparent bar to "pad" the visible bar to the correct y-position */}
                <Bar dataKey="base" stackId="a" fill="transparent" />

                {/* The visible part of the candlestick */}
                <Bar dataKey="body" stackId="a" barSize={4}>
                    <ErrorBar dataKey="high_low" width={1} strokeWidth={1} />
                    {processedData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                </Bar>

            </ComposedChart>
        </ResponsiveContainer>
    );
}
