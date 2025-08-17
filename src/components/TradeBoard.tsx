import React, { useMemo, useState, useEffect } from "react";
import useTrades from "../hooks/useTrades";
import ReactECharts from "echarts-for-react";

export default function TradeBoard() {
  const tradesMap = useTrades(); // Raw, real-time data
  const [displayedTrades, setDisplayedTrades] = useState<Record<string, any>>({});
  const [klineData, setKlineData] = useState<Record<string, number[]>>({});
  const [balance, setBalance] = useState({ USDT: 1000 });
  const [holdings, setHoldings] = useState<Record<string, number>>({});

  // 5-second interval timer to update UI data
  useEffect(() => {
    const timer = setInterval(() => {
      setDisplayedTrades(tradesMap);
      
      Object.entries(tradesMap).forEach(([stream, trade]) => {
        if (trade.price) {
            setKlineData((prev) => ({
                ...prev,
                [stream]: [...(prev[stream]?.slice(-49) || []), trade.price], // Keep last 50
            }));
        }
      });
    }, 5000);

    return () => clearInterval(timer);
  }, [tradesMap]);


  function klineOption(stream: string) {
    const data = klineData[stream] || [];
    return {
      backgroundColor: "#0b1220",
      grid: { left: '10%', right: '10%', bottom: '15%' },
      xAxis: { 
        type: 'category', 
        data: data.map((_,i) => i),
        axisLine: { lineStyle: { color: '#8392A5' } } 
      },
      yAxis: { 
        scale: true, 
        axisLine: { lineStyle: { color: '#8392A5' } }, 
        splitLine: { show: false } 
      },
      series: [{
        type: "line",
        data: data,
        smooth: true,
        showSymbol: false,
        lineStyle: {
            color: '#26a69a',
            width: 2
        }
      }],
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'cross' }
      }
    };
  }

  // Buy logic uses the displayedTrades (5s snapshot)
  const handleBuy = (stream: string, amount: number) => {
    const trade = displayedTrades[stream];
    if (!trade || !trade.price) {
        console.warn("No trade data for this stream yet");
        return;
    }
    const price = trade.price;
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

  const streams = Object.keys(displayedTrades).length > 0 ? Object.keys(displayedTrades) : ["btcusdt@trade"];

  return (
    <div style={{ display: "flex", gap: 20, color: 'white', padding: '20px' }}>
      <div style={{ width: 420 }}>
        <h3>交易对列表（每 5s 刷新）</h3>
        {streams.map(stream => {
          const trade = displayedTrades[stream];
          const coin = stream.split("@")[0].toUpperCase();
          return (
            <div key={stream} style={{ display: "flex", justifyContent: "space-between", padding: 8, borderBottom: "1px solid #222" }}>
              <div>
                <div style={{ fontWeight: 700 }}>{coin}</div>
                <div style={{ color: "#aaa", fontSize: 12 }}>{trade?.time ? new Date(trade.time).toLocaleTimeString() : "-"}</div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div>价格: {trade?.price ?? "-"}</div>
                <div style={{ fontSize: 12 }}>量: {trade?.quantity ?? "-"}</div>
                <button style={{ marginTop: 6, padding: '4px 8px', cursor: 'pointer' }} onClick={() => handleBuy(stream, 0.001)}>买入 0.001</button>
              </div>
            </div>
          );
        })}

        <div style={{ marginTop: 12, border: '1px solid #333', padding: '10px' }}>
          <p>USDT 余额: {balance.USDT}</p>
          <p>持仓: {JSON.stringify(holdings)}</p>
        </div>
      </div>

      <div style={{ flex: 1 }}>
        <h3>K 线图（价格每 5s 更新）</h3>
        <div style={{ height: 360, width: '100%' }}>
          <ReactECharts option={klineOption("btcusdt@trade")} style={{ height: "100%" }} />
        </div>
        <p style={{ color: "#bbb", marginTop: 8 }}>提示：交易使用列表中的最新价格，图表每 5 秒更新一次。</p>
      </div>
    </div>
  );
}
