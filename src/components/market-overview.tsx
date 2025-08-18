"use client";

import { Card, CardContent } from "@/components/ui/card";
import { MarketSummary } from "@/types";
import { Skeleton } from "./ui/skeleton";

type MarketOverviewProps = {
  summary?: MarketSummary;
};

export function MarketOverview({ summary }: MarketOverviewProps) {

  if (!summary) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 items-center p-4 border rounded-lg bg-black/20">
        <div className="col-span-2 md:col-span-1 p-2 border rounded-md">
          <Skeleton className="h-8 w-24 mb-2" />
          <Skeleton className="h-9 w-32" />
        </div>
        <div className="col-span-2 md:col-span-3 grid grid-cols-3 gap-x-4">
          {[...Array(3)].map((_, i) => (
            <div className="text-sm p-2 border rounded-md" key={i}>
              <Skeleton className="h-4 w-16 mb-1" />
              <Skeleton className="h-5 w-20" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  const isPositive = summary.change >= 0;

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 items-center p-2 border rounded-lg bg-black/20">
      <div className="col-span-2 md:col-span-1 p-2 border rounded-md bg-black/20">
        <h2 className={`text-3xl font-bold ${isPositive ? "text-green-500" : "text-red-500"}`}>
          {summary.price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
        </h2>
        <p className={`text-sm font-medium ${isPositive ? "text-green-500" : "text-red-500"}`}>
          {isPositive ? '+' : ''}{summary.change.toFixed(2)}%
        </p>
      </div>
      <div className="col-span-2 md:col-span-3 grid grid-cols-3 gap-x-4 text-sm">
        <div className="p-2 border rounded-md bg-black/20 text-right">
          <p className="text-muted-foreground">24h High</p>
          <p className="font-medium">{summary.high?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
        </div>
        <div className="p-2 border rounded-md bg-black/20 text-right">
          <p className="text-muted-foreground">24h Low</p>
          <p className="font-medium">{summary.low?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
        </div>
        <div className="p-2 border rounded-md bg-black/20 text-right">
          <p className="text-muted-foreground">24h Volume</p>
          <p className="font-medium">{(summary.volume / 1000000).toFixed(2)}M</p>
        </div>
      </div>
    </div>
  );
}
