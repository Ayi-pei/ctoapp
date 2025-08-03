"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CandlestickChart } from "lucide-react";

type TradeHeaderProps = {
  tradingPair: string;
  availablePairs: string[];
  onTradingPairChange: (pair: string) => void;
};

export function TradeHeader({
  tradingPair,
  availablePairs,
  onTradingPairChange,
}: TradeHeaderProps) {
  return (
    <header className="flex items-center justify-between p-4 border-b border-border">
      <div className="flex items-center gap-3">
        <CandlestickChart className="h-8 w-8 text-primary" />
        <h1 className="text-2xl font-bold text-foreground">TradeFlow</h1>
      </div>
      <div className="w-[150px]">
        <Select value={tradingPair} onValueChange={onTradingPairChange}>
          <SelectTrigger>
            <SelectValue placeholder="Select Pair" />
          </SelectTrigger>
          <SelectContent>
            {availablePairs.map((pair) => (
              <SelectItem key={pair} value={pair}>
                {pair}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </header>
  );
}
