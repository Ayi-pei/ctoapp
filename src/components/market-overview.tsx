
"use client";

import { Card, CardContent } from "@/components/ui/card";
import { MarketSummary } from "@/types";

type MarketOverviewProps = {
  summary?: MarketSummary;
};

export function MarketOverview({ summary }: MarketOverviewProps) {

  if (!summary) {
    return (
        <Card>
            <CardContent className="p-4">
                <p>Loading market data...</p>
            </CardContent>
        </Card>
    )
  }

  const isPositive = summary.change >= 0;

  return (
    <Card>
      <CardContent className="p-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 items-center">
          <div className="col-span-2 md:col-span-1">
             <h2 className="text-xl font-bold">{summary.pair}</h2>
             <p className={`text-2xl font-bold ${isPositive ? "text-green-500" : "text-red-500"}`}>
                {summary.price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
             </p>
              <p className={`text-sm font-medium ${isPositive ? "text-green-500" : "text-red-500"}`}>
                {summary.change.toFixed(2)}%
              </p>
          </div>
          <div className="text-sm">
            <p className="text-muted-foreground">24h High</p>
            <p className="font-medium">{summary.high?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
          </div>
          <div className="text-sm">
             <p className="text-muted-foreground">24h Low</p>
            <p className="font-medium">{summary.low?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
          </div>
           <div className="text-sm">
             <p className="text-muted-foreground">24h Volume</p>
             <p className="font-medium">{(summary.volume / 1000).toFixed(2)}K</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
