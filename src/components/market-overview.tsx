
"use client";

import { Card, CardContent } from "@/components/ui/card";
import { MarketSummary } from "@/types";
import { ArrowUpRight, ArrowDownRight } from "lucide-react";

type MarketOverviewProps = {
  summary: MarketSummary[];
  onSelectPair: (pair: string) => void;
};

export function MarketOverview({ summary, onSelectPair }: MarketOverviewProps) {
  return (
    <Card>
      <CardContent className="p-2">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
          {summary.map((item) => (
            <div
              key={item.pair}
              onClick={() => onSelectPair(item.pair)}
              className="p-3 rounded-md hover:bg-muted cursor-pointer transition-colors"
            >
              <div className="flex justify-between items-center">
                <span className="font-semibold text-sm">{item.pair}</span>
                <span
                  className={`flex items-center text-sm font-medium ${
                    item.change >= 0 ? "text-green-500" : "text-red-500"
                  }`}
                >
                  {item.change >= 0 ? (
                    <ArrowUpRight className="h-4 w-4 mr-1" />
                  ) : (
                    <ArrowDownRight className="h-4 w-4 mr-1" />
                  )}
                  {item.change.toFixed(2)}%
                </span>
              </div>
              <div className="text-lg font-bold mt-1">
                ${item.price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
