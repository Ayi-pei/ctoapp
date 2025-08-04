
"use client";

import { Card, CardContent } from "@/components/ui/card";
import { MarketSummary } from "@/types";
import { ArrowUpRight, ArrowDownRight } from "lucide-react";
import { cn } from "@/lib/utils";


type MarketOverviewProps = {
  summary: MarketSummary[];
  onSelectPair: (pair: string) => void;
  currentPair: string;
};

export function MarketOverview({ summary, onSelectPair, currentPair }: MarketOverviewProps) {
  const currentMarket = summary.find(s => s.pair === currentPair);

  return (
    <Card>
      <CardContent className="p-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 items-center">
          <div className="col-span-2 md:col-span-1">
             <h2 className="text-xl font-bold">{currentMarket?.pair}</h2>
             <p className={`text-2xl font-bold ${currentMarket && currentMarket.change >= 0 ? "text-green-500" : "text-red-500"}`}>
                {currentMarket?.price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
             </p>
              <p className={`text-sm font-medium ${currentMarket && currentMarket.change >= 0 ? "text-green-500" : "text-red-500"}`}>
                {currentMarket?.change.toFixed(2)}%
              </p>
          </div>
          <div className="text-sm">
            <p className="text-muted-foreground">24h High</p>
            <p className="font-medium">{currentMarket?.high?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
          </div>
          <div className="text-sm">
             <p className="text-muted-foreground">24h Low</p>
            <p className="font-medium">{currentMarket?.low?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
          </div>
           <div className="text-sm">
             <p className="text-muted-foreground">24h Volume</p>
             <p className="font-medium">{(currentMarket?.volume / 1000).toFixed(2)}K</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
