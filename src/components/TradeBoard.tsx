import React, { useMemo, useState } from "react";
import { useTradeData } from "@/context/trade-data-context";
import ReactECharts from "echarts-for-react";
import { useBalance } from "@/context/balance-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function TradeBoard() {
  const { displayedTrades, klineData, handleTrade: contextHandleTrade } = useTradeData();
  const { balances } = useBalance();
  const [amount, setAmount] = useState<number>(0.001); // Default trade amount

  const defaultTradingPair = "btcusdt"; // Used for the main K-line chart display

  const activeUSDTStreams = useMemo(() => {
    return Object.keys(displayedTrades)
      .filter(stream => stream.endsWith("usdt@trade"))
      .map(stream => stream.replace("@trade", "").toUpperCase());
  }, [displayedTrades]);

  const klineOption = (stream: string) => {
    const candles = klineData[`${stream.toLowerCase()}@trade`] || [];
    const categoryData = candles.map(c => {
      const d = new Date(c.time);
      return `${d.getHours()}:${String(d.getMinutes()).padStart(2,"0")}:${String(d.getSeconds()).padStart(2,"0")}`;
    });
    const values = candles.map(c => [c.open, c.close, c.low, c.high]);

    return {
      backgroundColor: "#0b1220",
      grid: { left: '10%', right: '10%', bottom: '15%' },
      xAxis: { type: 'category', data: categoryData, axisLine: { lineStyle: { color: '#8392A5' } } },
      yAxis: { scale: true, axisLine: { lineStyle: { color: '#8392A5' } }, splitLine: { show: false } },
      series: [{
        name: stream.toUpperCase(),
        type: "candlestick",
        data: values,
        itemStyle: {
          color: "#ef5350", // down
          color0: "#26a69a", // up
          borderColor: "#ef5350",
          borderColor0: "#26a69a"
        }
      }],
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'cross' },
         formatter: (params: any) => {
            const candle = params[0].data;
            return `
              Time: ${params[0].name}<br/>
              Open: ${candle[1]}<br/>
              Close: ${candle[2]}<br/>
              Low: ${candle[3]}<br/>
              High: ${candle[4]}
            `;
          }
      }
    };
  };
  
  const handleLocalTrade = (type: 'buy' | 'sell', stream: string) => {
    contextHandleTrade(type, stream, amount);
  };

  return (
    <div className="flex flex-col lg:flex-row gap-4">
      <Card className="w-full lg:w-1/3">
        <CardHeader>
          <CardTitle>交易对列表</CardTitle>
          <CardDescription>每5秒刷新数据</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {activeUSDTStreams.map(stream => {
              const trade = displayedTrades[`${stream.toLowerCase()}@trade`];
              return (
                <div key={stream} className="flex items-center justify-between p-2 border-b last:border-b-0">
                  <div>
                    <div className="font-semibold">{stream}/USDT</div>
                    <div className="text-sm text-muted-foreground">
                      {trade ? new Date(trade.time).toLocaleTimeString() : "-"}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-medium">价格: {trade?.price ? trade.price.toFixed(2) : "-"}</div>
                    <div className="text-sm text-muted-foreground">量: {trade?.quantity ? trade.quantity.toFixed(4) : "-"}</div>
                    <div className="flex gap-2 mt-2">
                        <Button size="sm" onClick={() => handleLocalTrade('buy', stream)} className="bg-green-600 hover:bg-green-700">买入</Button>
                        <Button size="sm" onClick={() => handleLocalTrade('sell', stream)} className="bg-red-600 hover:bg-red-700">卖出</Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-4">
            <Label htmlFor="trade-amount">交易数量</Label>
            <Input id="trade-amount" type="number" value={amount} onChange={(e) => setAmount(parseFloat(e.target.value))} placeholder="输入交易数量" className="mt-1" />
          </div>
          <div className="mt-4 p-2 border rounded-md bg-muted/50">
            <p className="text-sm">USDT 余额: {balances.USDT?.available.toFixed(2) ?? "0.00"}</p>
            {Object.keys(balances).filter(asset => asset !== 'USDT' && balances[asset].available > 0).map(asset => (
                <p key={asset} className="text-sm">{asset} 持仓: {balances[asset].available.toFixed(4)}</p>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="flex-1">
        <CardHeader>
          <CardTitle>价格趋势图 ({defaultTradingPair.toUpperCase()}/USDT)</CardTitle>
          <CardDescription>每5秒更新一次的价格走势</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-96 w-full">
            <ReactECharts option={klineOption(defaultTradingPair)} style={{ height: "100%", width: "100%" }} />
          </div>
          <p className="text-sm text-muted-foreground mt-2">提示：K 线每 5 秒生成一根 candle，用户成交使用 K 线最后一根的 close 价格。</p>
        </CardContent>
      </Card>
    </div>
  );
}
