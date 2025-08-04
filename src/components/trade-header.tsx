
"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { User, Menu } from "lucide-react";
import { usePathname } from "next/navigation";

type TradeHeaderProps = {
  tradingPair: string;
  availablePairs: string[];
  onTradingPairChange: (pair: string) => void;
  onLogout: () => void;
};

// Simple SVG Logo component
const Logo = () => (
    <svg width="32" height="32" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
            <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style={{stopColor: 'hsl(var(--primary))', stopOpacity:1}} />
            <stop offset="100%" style={{stopColor: 'hsl(var(--accent))', stopOpacity:1}} />
            </linearGradient>
        </defs>
        <path d="M50 0C22.38 0 0 22.38 0 50C0 77.62 22.38 100 50 100C77.62 100 100 77.62 100 50C100 22.38 77.62 0 50 0ZM72.5 65.5C70.36 65.5 68.5 67.36 68.5 69.5C68.5 71.64 70.36 73.5 72.5 73.5C74.64 73.5 76.5 71.64 76.5 69.5C76.5 67.36 74.64 65.5 72.5 65.5ZM50 24C41.16 24 34 31.16 34 40C34 48.84 41.16 56 50 56C58.84 56 66 48.84 66 40C66 31.16 58.84 24 50 24Z" fill="url(#grad1)"/>
    </svg>
)


export function TradeHeader({
  tradingPair,
  availablePairs,
  onTradingPairChange,
  onLogout,
}: TradeHeaderProps) {
  const pathname = usePathname();

  const isDashboard = pathname === '/dashboard';
  const isTradePage = pathname === '/trade';


  return (
    <header className="flex items-center justify-between p-4 border-b border-border flex-shrink-0">
      <div className="flex items-center gap-3">
         {isDashboard ? <Logo /> : <Menu className="h-6 w-6 text-foreground md:hidden" />}
      </div>
      <div className="flex-grow flex justify-center">
         {isTradePage && (
            <div className="w-[150px]">
                <Select value={tradingPair} onValueChange={onTradingPairChange}>
                    <SelectTrigger className="w-full">
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
         )}
      </div>

      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => { /* Profile action */ }}>
          <User className="h-6 w-6" />
          <span className="sr-only">Profile</span>
        </Button>
      </div>
    </header>
  );
}
