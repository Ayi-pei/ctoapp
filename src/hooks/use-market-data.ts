
"use client";

import { useState, useEffect, useCallback } from 'react';
import { Order, MarketTrade, PriceDataPoint, MarketSummary, availablePairs } from '@/types';
import { useAuth } from '@/context/auth-context';
import { useSettings } from '@/context/settings-context';


const CRYPTO_PAIRS = ['BTC/USDT', 'ETH/USDT', 'SOL/USDT', 'XRP/USDT', 'LTC/USDT', 'BNB/USDT', 'MATIC/USDT'];
const GOLD_PAIRS = ['XAU/USD'];
const FOREX_PAIRS = ['EUR/USD', 'GBP/USD'];


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
        case 'EUR/USD': return 1.07;
        case 'GBP/USD': return 1.25;
        default: return 100;
    }
}

// ----- MOCK DATA GENERATION (for development) -----
const generateInitialDataForPair = (pair: string) => {
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
  const trades: MarketTrade[] = [];
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
// ----- END MOCK DATA GENERATION -----


export const useMarketData = () => {
  const { user } = useAuth();
  const { settings } = useSettings();
  const [tradingPair, setTradingPair] = useState(availablePairs[0]);
  const [allData, setAllData] = useState<Map<string, any>>(new Map());
  const [isInitialised, setIsInitialised] = useState(false);

  // In a production environment, this function would fetch data from a real API.
  const fetchInitialData = useCallback(async () => {
    // If it's not a test user, you would fetch real data here.
    if (user && !user.isTestUser) {
        console.log("Real user detected. API calls would be made here.");
        // --- PRODUCTION API CALL ---
        // Example: const response = await fetch('/api/v1/market-data/all');
        // const data = await response.json();
        // const initialData = new Map(Object.entries(data));
        // setAllData(initialData);
        // For now, real users will also see mock data until an API is connected.
    }

    // For test users, or as a fallback for real users if the API fails.
    console.warn("Generating mock market data.");
    const mockInitialData = new Map();
    availablePairs.forEach(pair => {
        mockInitialData.set(pair, generateInitialDataForPair(pair));
    });
    setAllData(mockInitialData);
    setIsInitialised(true);

  }, [user]);

  useEffect(() => {
    fetchInitialData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchInitialData]);

  const changeTradingPair = useCallback((newPair: string) => {
    if (availablePairs.includes(newPair)) {
      setTradingPair(newPair);
    }
  }, []);

  useEffect(() => {
    if (!isInitialised) return;

    // For test users, we simulate real-time updates.
    // For real users, this would be replaced with a WebSocket connection.
    if (user && !user.isTestUser) {
        console.log("Real user: WebSocket connection would be established here.");
        // return () => ws.close();
    }
    
    const interval = setInterval(() => {
        setAllData(prevAllData => {
            const newAllData = new Map(prevAllData);

            newAllData.forEach((prevData, pair) => {
                if (!prevData) return;
                const pairSettings = settings[pair] || { trend: 'normal' };

                let priceMultiplier = randomInRange(0.9995, 1.0005); // Default: normal fluctuation
                if (pairSettings.trend === 'up') {
                    priceMultiplier = randomInRange(1.0001, 1.0008); // Force upward trend
                } else if (pairSettings.trend === 'down') {
                    priceMultiplier = randomInRange(0.9992, 0.9999); // Force downward trend
                }
                
                 // Update Price
                const oldPrice = prevData.summary.price;
                const newPrice = oldPrice * priceMultiplier;
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
                        const newTrade: MarketTrade = {
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
  }, [isInitialised, tradingPair, user, settings]);

  const data = allData.get(tradingPair) || null;
  const summaryData = allData.size > 0 ? Array.from(allData.values()).map(d => d.summary) : [];

  return { 
      tradingPair, 
      changeTradingPair, 
      data, 
      availablePairs: availablePairs, 
      summaryData,
      cryptoSummaryData: summaryData.filter(s => CRYPTO_PAIRS.includes(s.pair)),
      goldSummaryData: summaryData.filter(s => GOLD_PAIRS.includes(s.pair)),
      forexSummaryData: summaryData.filter(s => FOREX_PAIRS.includes(s.pair)),
    };
};
