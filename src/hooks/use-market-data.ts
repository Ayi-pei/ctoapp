

"use client";

import { useState, useEffect, useCallback } from 'react';
import { Order, MarketTrade, PriceDataPoint, KlineDataPoint, MarketSummary, availablePairs } from '@/types';
import { useSettings } from '@/context/settings-context';
import { getMarketData, GetMarketDataOutput } from '@/ai/flows/get-market-data';


const CRYPTO_PAIRS = ['BTC/USDT', 'ETH/USDT', 'SOL/USDT', 'XRP/USDT', 'LTC/USDT', 'BNB/USDT', 'MATIC/USDT', 'DOGE/USDT', 'ADA/USDT', 'SHIB/USDT'];
const GOLD_PAIRS = ['XAU/USD'];
const FOREX_PAIRS = ['EUR/USD', 'GBP/USD'];


// Helper function to generate a random number within a range
const randomInRange = (min: number, max: number) => Math.random() * (max - min) + min;

// Helper function to format time
const formatTime = (date: Date) => date.toLocaleTimeString('en-GB'); // Use 24-hour format

const getBasePrice = (pair: string) => {
    switch (pair) {
        case 'BTC/USDT': return 68000;
        case 'ETH/USDT': return 3800;
        case 'SOL/USDT': return 165;
        case 'XRP/USDT': return 0.5;
        case 'LTC/USDT': return 85;
        case 'BNB/USDT': return 600;
        case 'MATIC/USDT': return 0.7;
        case 'DOGE/USDT': return 0.15;
        case 'ADA/USDT': return 0.45;
        case 'SHIB/USDT': return 0.000025;
        case 'XAU/USD': return 2330;
        case 'EUR/USD': return 1.07;
        case 'GBP/USD': return 1.25;
        default: return 100;
    }
}

// ----- MOCK DATA GENERATION (for development and admin override) -----
const generateInitialDataForPair = (pair: string) => {
  const basePrice = getBasePrice(pair);
  const now = new Date();

  // K-line data (OHLC)
  const klineData: KlineDataPoint[] = [];
  let lastClose = basePrice * randomInRange(0.98, 1.02);

  for (let i = 59; i >= 0; i--) {
      const open = lastClose;
      const high = open * randomInRange(1, 1.001);
      const low = open * randomInRange(0.999, 1);
      const close = randomInRange(low, high);
      klineData.push({
          time: formatTime(new Date(now.getTime() - i * 60000)),
          open, high, low, close
      });
      lastClose = close;
  }
  
  const currentPrice = lastClose;

  // Order book data
  const asks: Order[] = [];
  const bids: Order[] = [];
  let askPrice = currentPrice * 1.0005;
  let bidPrice = currentPrice * 0.9995;
  let cumulativeAskSize = 0;
  let cumulativeBidSize = 0;

  for (let i = 0; i < 20; i++) {
    const askSize = randomInRange(0.01, 2);
    cumulativeAskSize += askSize;
    asks.push({ price: askPrice, size: askSize, total: cumulativeAskSize });
    askPrice *= randomInRange(1.0001, 1.0003);

    const bidSize = randomInRange(0.01, 2);
    cumulativeBidSize += bidSize;
    bids.push({ price: bidPrice, size: bidSize, total: cumulativeBidSize });
    bidPrice *= randomInRange(0.9997, 0.9999);
  }
   bids.sort((a: Order, b: Order) => b.price - a.price);
   asks.sort((a: Order, b: Order) => a.price - b.price);


  // Trade history data
  const trades: MarketTrade[] = [];
  for (let i = 0; i < 30; i++) {
    const type = Math.random() > 0.5 ? 'buy' : 'sell';
    const price = currentPrice * randomInRange(0.999, 1.001);
    const amount = randomInRange(0.01, 1.5);
    trades.push({
      id: `trade-${Date.now()}-${i}`,
      type,
      price,
      amount,
      time: formatTime(new Date(now.getTime() - randomInRange(1, 600) * 1000)),
    });
  }
  trades.sort((a, b) => new Date(`1970-01-01T${b.time}Z`).getTime() - new Date(`1970-01-01T${a.time}Z`).getTime());
  
  const price24hAgo = basePrice * randomInRange(0.95, 1.05);
  const change = ((currentPrice - price24hAgo) / price24hAgo) * 100;
  
  const allPrices = klineData.flatMap(k => [k.open, k.high, k.low, k.close]);
  const low = Math.min(...allPrices, price24hAgo);
  const high = Math.max(...allPrices, price24hAgo);


  return { 
      klineData, 
      orderBook: { asks, bids }, 
      trades,
      summary: {
          pair,
          price: currentPrice,
          change: change,
          volume: randomInRange(1000000, 50000000),
          high,
          low
      }
  };
};
// ----- END MOCK DATA GENERATION -----


export const useMarketData = () => {
  const { settings } = useSettings();
  const [tradingPair, setTradingPair] = useState(availablePairs[0]);
  const [allData, setAllData] = useState<Map<string, any>>(new Map());
  const [isInitialised, setIsInitialised] = useState(false);

  // Initialize with mock data first
  useEffect(() => {
    const mockInitialData = new Map();
    availablePairs.forEach(pair => {
        mockInitialData.set(pair, generateInitialDataForPair(pair));
    });
    setAllData(mockInitialData);
    setIsInitialised(true);
  }, []);

  const changeTradingPair = useCallback((newPair: string) => {
    if (availablePairs.includes(newPair)) {
      setTradingPair(newPair);
    }
  }, []);

  // Real-time data fetching and simulation interval
  useEffect(() => {
    if (!isInitialised || !Object.keys(settings).length) return;

    const interval = setInterval(async () => {
        setAllData(prevAllData => {
            const newAllData = new Map(prevAllData);

            availablePairs.forEach(pair => {
                const prevData = newAllData.get(pair);
                if (!prevData) return;

                const pairSettings = settings[pair] || { trend: 'normal', volatility: 0.05, isTradingHalted: false, specialTimeFrames: [] };
                
                if (pairSettings.isTradingHalted) {
                    return;
                }
                
                const lastKline = prevData.klineData[prevData.klineData.length - 1];
                let newPrice = lastKline.close;
                
                const volatilityFactor = pairSettings.volatility;
                let priceMultiplier = 1 + (Math.random() - 0.5) * volatilityFactor;

                if (pairSettings.trend === 'up') {
                    priceMultiplier = 1 + (Math.random() * volatilityFactor); 
                } else if (pairSettings.trend === 'down') {
                    priceMultiplier = 1 - (Math.random() * volatilityFactor);
                }
                newPrice *= priceMultiplier;

                const newKline = {
                  time: formatTime(new Date()),
                  open: lastKline.close,
                  high: Math.max(lastKline.high, newPrice),
                  low: Math.min(lastKline.low, newPrice),
                  close: newPrice
                };

                const newSummary = { 
                    ...prevData.summary, 
                    price: newPrice,
                    high: Math.max(prevData.summary.high, newPrice),
                    low: Math.min(prevData.summary.low, newPrice),
                };
                
                const newKlineData = [...prevData.klineData.slice(1), newKline];

                let updatedData = { 
                    ...prevData, 
                    summary: newSummary, 
                    klineData: newKlineData 
                };
                
                if (pair === tradingPair) {
                     const newAsks = prevData.orderBook.asks.map((order: Order) => ({ ...order, price: order.price * 0.99 + newSummary.price * 0.01 })).sort((a: Order,b: Order) => a.price - b.price);
                     const newBids = prevData.orderBook.bids.map((order: Order) => ({ ...order, price: order.price * 0.99 + newSummary.price * 0.01 })).sort((a: Order,b: Order) => b.price - a.price);

                    const newTrades = [...prevData.trades];
                    if (Math.random() > 0.7) {
                        newTrades.unshift({
                            id: `trade-${Date.now()}`,
                            type: Math.random() > 0.5 ? 'buy' : 'sell',
                            price: newSummary.price * randomInRange(0.9998, 1.0002),
                            amount: randomInRange(0.01, 1.5),
                            time: formatTime(new Date()),
                        });
                        if (newTrades.length > 50) newTrades.pop();
                    }
                    updatedData.orderBook = { asks: newAsks, bids: newBids };
                    updatedData.trades = newTrades;
                }
                
                newAllData.set(pair, updatedData);
            });
            return newAllData;
        });

    }, 5000); // Update every 5 seconds

    return () => clearInterval(interval);
  }, [isInitialised, tradingPair, settings]);

  const data = allData.get(tradingPair) || null;
  const summaryData = allData.size > 0 ? Array.from(allData.values()).map(d => d.summary) : [];

  const cryptoSummaryData = summaryData.filter(s => CRYPTO_PAIRS.includes(s.pair));
  const goldSummaryData = summaryData.filter(s => GOLD_PAIRS.includes(s.pair));
  const forexSummaryData = summaryData.filter(s => FOREX_PAIRS.includes(s.pair));


  return { 
      tradingPair, 
      changeTradingPair, 
      data, 
      availablePairs: availablePairs, 
      summaryData,
      cryptoSummaryData,
      goldSummaryData,
      forexSummaryData,
    };
};
