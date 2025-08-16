
"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Order } from "@/types";
import { MarketExplanation } from "./market-explanation";

type OrderBookProps = {
  asks: Order[];
  bids: Order[];
  tradingPair: string;
};

export function OrderBook({ asks, bids, tradingPair }: OrderBookProps) {
  const maxCumulativeSize = Math.max(
    asks.reduce((acc, curr) => acc + curr.size, 0),
    bids.reduce((acc, curr) => acc + curr.size, 0)
  );

  const renderOrderRow = (order: Order, type: 'ask' | 'bid') => {
    const backgroundSize = (order.size / maxCumulativeSize) * 100 * 5; // Multiplier to make it more visible
    const color = type === 'ask' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(34, 197, 94, 0.2)';

    return (
      <TableRow key={order.price} className="relative text-xs">
        <TableCell className={`relative z-10 p-1 text-left ${type === 'ask' ? 'text-red-500' : 'text-green-500'}`}>
            {order.price.toFixed(2)}
        </TableCell>
        <TableCell className="relative z-10 p-1 text-right">{order.size.toFixed(4)}</TableCell>
        <TableCell className="relative z-10 p-1 text-right">
          <div
 style={{ width: `${backgroundSize}%`, backgroundColor: color, zIndex: 0, position: 'absolute', top: 0, bottom: 0, right: 0, height: '100%' }}
 />
 {order.total.toFixed(2)}
 </TableCell>
      </TableRow>
    );
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg">订单簿</CardTitle>
        <MarketExplanation orderBook={{asks, bids}} tradingPair={tradingPair} />
      </CardHeader>
      <CardContent className="h-[400px] overflow-y-auto pr-0">
        <div className="grid grid-cols-1 md:grid-cols-1">
            <Table>
              <TableHeader>
                <TableRow className="text-xs">
                  <TableHead className="p-1 text-left">价格 (USDT)</TableHead>
                  <TableHead className="p-1 text-right">数量</TableHead>
                  <TableHead className="p-1 text-right">累计</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {asks.slice(0, 15).reverse().map(order => renderOrderRow(order, 'ask'))}
              </TableBody>
            </Table>

            <div className="py-2 font-semibold text-center text-lg">
                {bids[0]?.price.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}
            </div>

            <Table>
                <TableBody>
                    {bids.slice(0, 15).map(order => renderOrderRow(order, 'bid'))}
                </TableBody>
            </Table>
        </div>
      </CardContent>
    </Card>
  );
}
