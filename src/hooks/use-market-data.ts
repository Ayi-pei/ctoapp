
"use client";

import { useState, useEffect, useCallback } from 'react';
import { Order, Trade, PriceDataPoint, MarketSummary } from '@/types';

const TRADING_PAIRS = ['BTC/USDT', 'ETH/USDT', 'SOL/USDT', 'XRP/USDT', 'LTC/USDT', 'BNB/USDT', 'MATIC/USDT', 'XAU/USD'];
const CRYPTO_PAIRS = ['BTC/USDT', 'ETH/USDT', 'SOL/USDT', 'XRP/USDT', 'LTC/USDT', 'BNB/USDT', 'MATIC/USDT'];
const GOLD_PAIRS = ['XAU/USD'];


// Helper function to generate a random number within a range
const randomInRange = (min: number, max: number) => Math.random() * (max - min) + min;

// Helper function to format time
const formatTime = (date: Date) => date.toLocaleTimeString('en-US', { hour12: false });

const getBasePrice = (pair: string) => {
    switch (pair) {
        case 'BTC/USDT': return 68000;
        case 'ETH/USDT': return 3800;
        case 'SOL/USDT': return 165;
        case 'XRP/USDT': return 0.5;
        case 'LTC/USDT': return 85;
        case 'BNB/USDT': return 600;
        case 'MATIC/USDT': return 0.7;
        case 'XAU/USD': return 2330;
        default: return 100;
    }
}

// Generates initial data for a given pair
const generateInitialData = (pair: string) => {
  const basePrice = getBasePrice(pair);

  // Price chart data
  const priceData: PriceDataPoint[] = [];
  let lastPrice = basePrice * randomInRange(0.98, 1.02);
  const now = new Date();
  for (let i = 59; i >= 0; i--) {
    priceData.push({
      time: formatTime(new Date(now.getTime() - i * 60000)),
      price: lastPrice,
    });
    lastPrice *= randomInRange(0.999, 1.001);
  }

  // Order book data
  const asks: Order[] = [];
  const bids: Order[] = [];
  let askPrice = lastPrice * 1.0005;
  let bidPrice = lastPrice * 0.9995;
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
   bids.sort((a,b) => b.price - a.price);
   asks.sort((a,b) => a.price - b.price);


  // Trade history data
  const trades: Trade[] = [];
  for (let i = 0; i < 30; i++) {
    const type = Math.random() > 0.5 ? 'buy' : 'sell';
    const price = lastPrice * randomInRange(0.999, 1.001);
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
  const currentPrice = priceData[priceData.length - 1].price;
  const change = ((currentPrice - price24hAgo) / price24hAgo) * 100;
  const low = Math.min(...priceData.map(p => p.price), price24hAgo);
  const high = Math.max(...priceData.map(p => p.price), price24hAgo);


  return { 
      priceData, 
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

export const useMarketData = () => {
  const [tradingPair, setTradingPair] = useState(TRADING_PAIRS[0]);
  const [allData, setAllData] = useState<Map<string, any>>(new Map());
  const [isInitialised, setIsInitialised] = useState(false);

  useEffect(() => {
    const initialData = new Map();
    TRADING_PAIRS.forEach(pair => {
        initialData.set(pair, generateInitialData(pair));
    });
    setAllData(initialData);
    setIsInitialised(true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const changeTradingPair = useCallback((newPair: string) => {
    if (TRADING_PAIRS.includes(newPair)) {
      setTradingPair(newPair);
    }
  }, []);

  useEffect(() => {
    if (!isInitialised) return;

    const interval = setInterval(() => {
        setAllData(prevAllData => {
            const newAllData = new Map(prevAllData);

            newAllData.forEach((prevData, pair) => {
                if (!prevData) return;
                 // Update Price
                const oldPrice = prevData.summary.price;
                const newPrice = oldPrice * randomInRange(0.9995, 1.0005);
                const price24hAgo = prevData.summary.low; // Simplified for this simulation
                const newChange = ((newPrice - price24hAgo) / price24hAgo) * 100;


                const newSummary = {
                    ...prevData.summary,
                    price: newPrice,
                    change: newChange,
                    high: Math.max(prevData.summary.high, newPrice),
                    low: Math.min(prevData.summary.low, newPrice),
                };
                
                // If it's the active pair, update everything
                if (pair === tradingPair) {
                    // Update Price Chart
                    const newPriceData = [...prevData.priceData.slice(1)];
                    newPriceData.push({
                        time: formatTime(new Date()),
                        price: newPrice,
                    });

                    // Update Order Book
                    const newAsks = prevData.orderBook.asks.map(order => ({
                        ...order,
                        size: Math.max(0, order.size * randomInRange(0.95, 1.05)),
                    })).filter(order => order.size > 0.001).slice(0, 20);
                    
                    const newBids = prevData.orderBook.bids.map(order => ({
                        ...order,
                        size: Math.max(0, order.size * randomInRange(0.95, 1.05)),
                    })).filter(order => order.size > 0.001).slice(0, 20);

                    // Update Trades
                    const newTrades = [...prevData.trades];
                    if (Math.random() > 0.7) {
                        const type = Math.random() > 0.5 ? 'buy' : 'sell';
                        const price = newPrice * randomInRange(0.9998, 1.0002);
                        const amount = randomInRange(0.01, 1.5);
                        const newTrade: Trade = {
                            id: `trade-${Date.now()}`,
                            type,
                            price,
                            amount,
                            time: formatTime(new Date()),
                        };
                        newTrades.unshift(newTrade);
                        if (newTrades.length > 50) newTrades.pop();
                    }
                    newAllData.set(pair, {
                        ...prevData,
                        priceData: newPriceData,
                        orderBook: { asks: newAsks, bids: newBids },
                        trades: newTrades,
                        summary: newSummary
                    });
                } else {
                     newAllData.set(pair, { ...prevData, summary: newSummary});
                }
            });
            return newAllData;
        });
    }, 1500); // Update every 1.5 seconds

    return () => clearInterval(interval);
  }, [isInitialised, tradingPair]);

  const data = allData.get(tradingPair) || null;
  const summaryData = Array.from(allData.values()).map(d => d.summary);

  return { 
      tradingPair, 
      changeTradingPair, 
      data, 
      availablePairs: TRADING_PAIRS, 
      summaryData,
      cryptoSummaryData: summaryData.filter(s => CRYPTO_PAIRS.includes(s.pair)),
      goldSummaryData: summaryData.filter(s => GOLD_PAIRS.includes(s.pair)),
    };
};
