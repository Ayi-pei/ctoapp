"use client";

import { useState, useEffect, useCallback } from 'react';
import { Order, Trade, PriceDataPoint } from '@/types';

const TRADING_PAIRS = ['BTC/USDT', 'ETH/USDT', 'SOL/USDT'];

// Helper function to generate a random number within a range
const randomInRange = (min: number, max: number) => Math.random() * (max - min) + min;

// Helper function to format time
const formatTime = (date: Date) => date.toLocaleTimeString('en-US', { hour12: false });

// Generates initial data for a given pair
const generateInitialData = (pair: string) => {
  const basePrice = pair === 'BTC/USDT' ? 68000 : pair === 'ETH/USDT' ? 3800 : 165;

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
  let askPrice = basePrice * 1.001;
  let bidPrice = basePrice * 0.999;
  for (let i = 0; i < 20; i++) {
    const askSize = randomInRange(0.01, 2);
    asks.push({ price: askPrice, size: askSize, total: askPrice * askSize });
    askPrice *= randomInRange(1.0001, 1.0003);

    const bidSize = randomInRange(0.01, 2);
    bids.push({ price: bidPrice, size: bidSize, total: bidPrice * bidSize });
    bidPrice *= randomInRange(0.9997, 0.9999);
  }

  // Trade history data
  const trades: Trade[] = [];
  for (let i = 0; i < 30; i++) {
    const type = Math.random() > 0.5 ? 'buy' : 'sell';
    const price = basePrice * randomInRange(0.998, 1.002);
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

  return { priceData, orderBook: { asks, bids }, trades };
};

export const useMarketData = () => {
  const [tradingPair, setTradingPair] = useState(TRADING_PAIRS[0]);
  const [data, setData] = useState(generateInitialData(tradingPair));

  const changeTradingPair = useCallback((newPair: string) => {
    if (TRADING_PAIRS.includes(newPair)) {
      setTradingPair(newPair);
      setData(generateInitialData(newPair));
    }
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setData(prevData => {
        // Update Price Chart
        const newPriceData = [...prevData.priceData.slice(1)];
        const lastDataPoint = newPriceData[newPriceData.length - 1];
        const newPrice = lastDataPoint.price * randomInRange(0.9995, 1.0005);
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

        return {
          priceData: newPriceData,
          orderBook: { asks: newAsks, bids: newBids },
          trades: newTrades,
        };
      });
    }, 1500); // Update every 1.5 seconds

    return () => clearInterval(interval);
  }, [tradingPair]);

  return { tradingPair, changeTradingPair, data, availablePairs: TRADING_PAIRS };
};
