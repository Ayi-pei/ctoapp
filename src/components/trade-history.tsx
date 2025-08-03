"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { Trade } from "@/types";
import { useEffect, useState } from "react";

export function TradeHistory({ trades }: { trades: Trade[] }) {
  const [highlighted, setHighlighted] = useState<string[]>([]);
  
  useEffect(() => {
    if (trades.length > 0) {
      const newTradeIds = trades.map(t => t.id).slice(0, 5); // highlight recent ones
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
        <CardTitle className="text-lg">Trade History</CardTitle>
      </CardHeader>
      <CardContent className="h-[300px] overflow-y-auto pr-0">
        <Table>
          <TableHeader>
            <TableRow className="text-xs">
              <TableHead className="p-1">Price (USDT)</TableHead>
              <TableHead className="p-1 text-right">Amount</TableHead>
              <TableHead className="p-1 text-right">Time</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {trades.slice(0, 50).map((trade) => (
              <TableRow key={trade.id} className={`text-xs transition-colors duration-500 ${highlighted.includes(trade.id) ? 'bg-primary/20' : ''}`}>
                <TableCell
                  className={`p-1 font-medium ${
                    trade.type === "buy" ? "text-green-500" : "text-red-500"
                  }`}
                >
                  {trade.price.toFixed(2)}
                </TableCell>
                <TableCell className="p-1 text-right">{trade.amount.toFixed(4)}</TableCell>
                <TableCell className="p-1 text-right text-muted-foreground">{trade.time}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
