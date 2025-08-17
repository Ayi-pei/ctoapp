

"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TradeRaw } from "@/types";
import { useMarket } from "@/context/market-data-context";
import { useEffect, useState } from "react";

export function TradeHistory({ tradingPair }: { tradingPair: string }) {
  const { displayedTrades } = useMarket();
  const [highlighted, setHighlighted] = useState<number[]>([]);

  const streamName = tradingPair.replace('/', '').toLowerCase();
  const trades = displayedTrades[streamName] || [];

  useEffect(() => {
    if (trades.length > 0) {
      const newTradeIds = trades.map(t => t.timestamp).slice(-5); // highlight recent ones
      const oldTradeIds = highlighted;
      const trulyNew = newTradeIds.filter(id => !oldTradeIds.includes(id));

      if (trulyNew.length > 0) {
        setHighlighted(prev => [...trulyNew, ...prev].slice(0, 20));
        setTimeout(() => {
          setHighlighted(prev => prev.filter(id => !trulyNew.includes(id)))
        }, 1000);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trades]);


  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">市价成交</CardTitle>
      </CardHeader>
      <CardContent className="h-[400px] overflow-y-auto pr-0">
        <Table>
          <TableHeader>
            <TableRow className="text-xs">
              <TableHead className="p-1">价格 (USDT)</TableHead>
              <TableHead className="p-1 text-right">数量</TableHead>
              <TableHead className="p-1 text-right">时间</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {trades.slice(-50).reverse().map((trade) => (
              <TableRow key={trade.timestamp} className={`text-xs transition-colors duration-500 ${highlighted.includes(trade.timestamp) ? 'bg-primary/20' : ''}`}>
                <TableCell
                  className={`p-1 font-medium text-green-500`} // Assuming all are buys for now
                >
                  {trade.price.toFixed(2)}
                </TableCell>
                <TableCell className="p-1 text-right">{trade.quantity.toFixed(4)}</TableCell>
                <TableCell className="p-1 text-right text-muted-foreground">{new Date(trade.timestamp).toLocaleTimeString()}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
