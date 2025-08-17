import React, { useMemo, useState } from "react";
import useTrades from "../hooks/useTrades";
import ReactECharts from "echarts-for-react";

export default function TradeBoard() {
  const { displayedTrades, klineData, buy } = useTrades(5000, 50); // 5s 窗口，最大 50 根 candle
  const [balance, setBalance] = useState({ USDT: 1000 });
  const [holdings, setHoldings] = useState<Record<string, number>>({});

  const streams = Object.keys(displayedTrades).length ? Object.keys(displayedTrades) : ["btcusdt@trade"];

  // 把 klineData 转换为 echarts 所需数据结构
  function klineOption(stream: string) {
    const candles = klineData[stream] || [];
    const categoryData = candles.map(c => {
      // 用时间的可读表示（可按需格式化）
      const d = new Date(c.time);
      return `${d.getHours()}:${String(d.getMinutes()).padStart(2,"0")}:${String(d.getSeconds()).padStart(2,"0")}`;
    });
    const values = candles.map(c => [c.open, c.close, c.low, c.high]);
    return {
      backgroundColor: "#0b1220",
      xAxis: { data: categoryData },
      yAxis: { scale: true },
      series: [{
        type: "candlestick",
        data: values,
        itemStyle: {
          color: "#ef5350", // down
          color0: "#26a69a", // up
          borderColor: "#ef5350",
          borderColor0: "#26a69a"
        }
      }]
    };
  }

  const handleBuy = (stream: string, amount = 0.001) => {
    const price = buy(stream, amount, (p) => p);
    if (!price) return;
    const cost = price * amount;
    if (balance.USDT >= cost) {
      setBalance(b => ({ ...b, USDT: +(b.USDT - cost).toFixed(8) }));
      const coin = stream.split("@")[0].replace("usdt", "").toUpperCase();
      setHoldings(h => ({ ...h, [coin]: +( (h[coin] || 0) + amount).toFixed(8) }));
      console.log(`成交 买入 ${coin} ${amount} @ ${price}`);
    } else {
      console.warn("余额不足");
    }
  };

  return (
    <div style={{ display: "flex", gap: 20 }}>
      <div style={{ width: 420 }}>
        <h3>交易对列表（显示数据每 5s 刷新）</h3>
        {streams.map(stream => {
          const trade = displayedTrades[stream];
          const coin = stream.split("@")[0].toUpperCase();
          return (
            <div key={stream} style={{ display: "flex", justifyContent: "space-between", padding: 8, borderBottom: "1px solid #222" }}>
              <div>
                <div style={{ fontWeight: 700 }}>{coin}</div>
                <div style={{ color: "#aaa", fontSize: 12 }}>{trade ? new Date(trade.time).toLocaleTimeString() : "-"}</div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div>价格: {trade?.price ?? "-"}</div>
                <div style={{ fontSize: 12 }}>量: {trade?.quantity ?? "-"}</div>
                <button style={{ marginTop: 6 }} onClick={() => handleBuy(stream, 0.001)}>买入 0.001</button>
              </div>
            </div>
          );
        })}

        <div style={{ marginTop: 12 }}>
          <p>USDT 余额: {balance.USDT}</p>
          <p>持仓: {JSON.stringify(holdings)}</p>
        </div>
      </div>

      <div style={{ flex: 1 }}>
        <h3>K 线（基于 5s 窗口生成 OHLC）</h3>
        {/* 默认展示 BTC，如果有数据可选多个 */}
        <div style={{ height: 360 }}>
          <ReactECharts option={klineOption("btcusdt@trade")} style={{ height: "100%" }} />
        </div>
        <p style={{ color: "#bbb", marginTop: 8 }}>提示：K 线每 5 秒生成一根 candle，用户成交使用 K 线最后一根的 close 价格。</p>
      </div>
    </div>
  );
}
