"use client";

import DashboardLayout from "@/components/dashboard-layout";
import { useEnhancedMarket } from "@/context/enhanced-market-data-context";
import { useEffect, useState } from "react";
import { MarketSummary } from "@/types"; // 导入正确的类型定义

export default function MarketDataPage() {
  const { summaryData } = useEnhancedMarket();
  const [filteredData, setFilteredData] = useState<MarketSummary[]>([]);

  // 外汇和商品交易对
  const FOREX_COMMODITY_PAIRS = ["XAU/USD", "EUR/USD", "GBP/USD"];
  // 期权交易对
  const OPTIONS_SYMBOLS = ["IBM", "AAPL", "TSLA", "MSFT"];

  useEffect(() => {
    // 过滤出外汇、商品和期权数据
    const forexCommodityData = summaryData.filter((item: MarketSummary) =>
      FOREX_COMMODITY_PAIRS.includes(item.pair)
    );

    const optionsData = summaryData.filter((item: MarketSummary) =>
      OPTIONS_SYMBOLS.includes(item.pair)
    );

    setFilteredData([...forexCommodityData, ...optionsData]);
  }, [summaryData]);

  return (
    <DashboardLayout>
      <div className="p-4 md:p-8 space-y-6">
        <h1 className="text-2xl font-bold">期权和外汇市场数据</h1>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredData.map((item: MarketSummary) => (
            <div key={item.pair} className="border rounded-lg p-4 shadow-sm">
              <div className="flex items-center gap-2 mb-2">
                {item.icon && (
                  <img
                    src={item.icon}
                    alt={`${item.pair} logo`}
                    className="w-8 h-8"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.src = "https://placehold.co/32x32.png";
                    }}
                  />
                )}
                <h2 className="font-bold text-lg">{item.pair}</h2>
              </div>
              <div className="space-y-1">
                <p>价格: ${item.price.toFixed(2)}</p>
                <p>涨跌: {item.change.toFixed(2)}%</p>
                <p>24h最高: ${item.high.toFixed(2)}</p>
                <p>24h最低: ${item.low.toFixed(2)}</p>
                <p>24h成交量: {item.volume.toLocaleString()}</p>
              </div>
            </div>
          ))}
        </div>

        {filteredData.length === 0 && (
          <div className="text-center py-8 text-gray-500">加载中...</div>
        )}
      </div>
    </DashboardLayout>
  );
}
