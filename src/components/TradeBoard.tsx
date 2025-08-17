import React, { useState, useEffect } from "react";
import useTrades from "../hooks/useTrades";
import ReactECharts from "echarts-for-react";
import { availablePairs } from "@/types";

// This component now manages the UI layer and trading logic based on a 5-second snapshot.
export default function TradeBoard() {
  const tradesMap = useTrades(); // Raw, real-time data from the hook
  const [displayedTrades, setDisplayedTrades] = useState<Record<string, any>>({});
  const [klineData, setKlineData] = useState<Record<string, number[]>>({});

  // Balances and holdings for demonstration
  const [balance, setBalance] = useState({ USDT: 1000 });
  const [holdings, setHoldings] = useState<Record<string, number>>({});

  // --- UI Data Layer: 5-second snapshot updates ---

  // 1. Update displayedTrades every 5 seconds from the raw tradesMap
  useEffect(() => {
    const timer = setInterval(() => {
      setDisplayedTrades(tradesMap);
    }, 5000);
    return () => clearInterval(timer);
  }, [tradesMap]);

  // 2. Update klineData every 5 seconds based on the displayedTrades snapshot
  useEffect(() => {
    // We check if displayedTrades has data to avoid running this interval unnecessarily
    if (Object.keys(displayedTrades).length === 0) return;

    const timer = setInterval(() => {
      setKlineData((prevKlineData) => {
        const updatedKlineData = { ...prevKlineData };
        Object.entries(displayedTrades).forEach(([stream, trade]) => {
          if (trade.price) {
            const currentData = updatedKlineData[stream] || [];
            updatedKlineData[stream] = [...currentData.slice(-49), trade.price]; // Keep last 50 data points
          }
        });
        return updatedKlineData;
      });
    }, 5000);

    return () => clearInterval(timer);
  }, [displayedTrades]);


  // --- Trading Logic ---

  const handleBuy = (stream: string, amount: number) => {
    // IMPORTANT: Trading logic uses the `displayedTrades` (the 5s snapshot), not the raw `tradesMap`.
    const trade = displayedTrades[stream];
    if (!trade || !trade.price) {
        console.warn("No trade data available for this stream yet. Please wait for the next update.");
        return;
    }
    const price = trade.price;
    const cost = price * amount;
    if (balance.USDT >= cost) {
      setBalance(b => ({ ...b, USDT: +(b.USDT - cost).toFixed(8) }));
      const coin = stream.split("@")[0].replace("usdt", "").toUpperCase();
      setHoldings(h => ({ ...h, [coin]: +( (h[coin] || 0) + amount).toFixed(8) }));
      console.log(`成交: 买入 ${amount} ${coin} @ ${price} USDT`);
    } else {
      console.warn("余额不足");
    }
  };

  // --- Chart Configuration ---

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
        lineStyle: { color: '#26a69a', width: 2 }
      }],
      tooltip: { trigger: 'axis', axisPointer: { type: 'cross' } }
    };
  }

  const streamsToDisplay = availablePairs
    .filter(p => !p.includes('/USD'))
    .map(p => `${p.replace('/', '').toLowerCase()}@trade`);

  return (
    <div style={{ display: "flex", gap: 20, color: 'white', padding: '20px' }}>
      <div style={{ width: 420 }}>
        <h3>交易对列表 (每 5s 刷新)</h3>
        {streamsToDisplay.map(stream => {
          const trade = displayedTrades[stream];
          const coin = stream.split("@")[0].toUpperCase().replace('USDT', '');
          return (
            <div key={stream} style={{ display: "flex", justifyContent: "space-between", padding: 8, borderBottom: "1px solid #222" }}>
              <div>
                <div style={{ fontWeight: 700 }}>{coin}/USDT</div>
                <div style={{ color: "#aaa", fontSize: 12 }}>
                  {trade?.time ? new Date(trade.time).toLocaleTimeString() : "等待数据..."}
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ color: trade?.price > (klineData[stream]?.[klineData[stream]?.length - 2] || 0) ? '#26a69a' : '#ef5350' }}>
                    价格: {trade?.price?.toFixed(4) ?? "-"}
                </div>
                <div style={{ fontSize: 12 }}>量: {trade?.quantity?.toFixed(6) ?? "-"}</div>
                <button style={{ marginTop: 6, padding: '4px 8px', cursor: 'pointer' }} onClick={() => handleBuy(stream, 0.01)}>买入 0.01</button>
              </div>
            </div>
          );
        })}

        <div style={{ marginTop: 12, border: '1px solid #333', padding: '10px' }}>
          <p>USDT 余额: {balance.USDT.toFixed(4)}</p>
          <p>持仓: {JSON.stringify(holdings)}</p>
        </div>
      </div>

      <div style={{ flex: 1 }}>
        <h3>K 线图 (价格每 5s 更新)</h3>
        <div style={{ height: 360, width: '100%' }}>
          <ReactECharts option={klineOption("btcusdt@trade")} style={{ height: "100%" }} />
        </div>
        <p style={{ color: "#bbb", marginTop: 8 }}>提示：交易使用列表中的最新价格，图表和列表每 5 秒更新一次。</p>
      </div>
    </div>
  );
}
