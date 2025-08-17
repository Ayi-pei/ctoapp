

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
// This function is updated to generate data that more closely matches the Binance API structure.
const generateInitialDataForPair = (pair: string) => {
  const basePrice = getBasePrice(pair);
  const now = new Date();

  // Price chart data
  const priceData: PriceDataPoint[] = [];
  let lastPrice = basePrice * randomInRange(0.98, 1.02);

  for (let i = 59; i >= 0; i--) {
      priceData.push({
          time: formatTime(new Date(now.getTime() - i * 60000)),
          price: lastPrice
      });
      lastPrice *= (1 + (Math.random() - 0.5) * 0.005);
  }
  
  const currentPrice = lastPrice;

  // Order book data, structured like the API response
  const asks: Order[] = [];
  const bids: Order[] = [];
  let askPrice = currentPrice * 1.0005;
  let bidPrice = currentPrice * 0.9995;
  
  // The API response sorts asks from lowest to highest price.
  for (let i = 0; i < 20; i++) {
    const size = randomInRange(0.01, 2);
    asks.push({ price: askPrice, size: size, total: 0 }); // total will be calculated later
    askPrice *= randomInRange(1.0001, 1.0003);
  }

  // The API response sorts bids from highest to lowest price
  for (let i = 0; i < 20; i++) {
    const size = randomInRange(0.01, 2);
    bids.push({ price: bidPrice, size: size, total: 0 }); // total will be calculated later
    bidPrice *= randomInRange(0.9997, 0.9999);
  }
  
  // Calculate cumulative total for UI display
  let cumulativeAskSize = 0;
  const finalAsks = asks.map(o => {
      cumulativeAskSize += o.size;
      return { ...o, total: cumulativeAskSize };
  });

  let cumulativeBidSize = 0;
  const finalBids = bids.map(o => {
      cumulativeBidSize += o.size;
      return { ...o, total: cumulativeBidSize };
  });


  // Trade history data, structured like the API response
  const trades: MarketTrade[] = [];
  for (let i = 0; i < 30; i++) {
    trades.push({
      id: `trade-${Date.now()}-${i}`,
      type: Math.random() > 0.5 ? 'buy' : 'sell', // isBuyerMaker equivalent
      price: currentPrice * randomInRange(0.999, 1.001),
      amount: randomInRange(0.01, 1.5), // qty
      time: formatTime(new Date(now.getTime() - randomInRange(1, 600) * 1000)),
    });
  }
  // Sort by time, most recent first
  trades.sort((a, b) => new Date(`1970-01-01T${b.time}Z`).getTime() - new Date(`1970-01-01T${a.time}Z`).getTime());
  
  const price24hAgo = basePrice * randomInRange(0.95, 1.05);
  const change = ((currentPrice - price24hAgo) / price24hAgo) * 100;
  
  const allPrices = priceData.map(p => p.price);
  const low = Math.min(...allPrices, price24hAgo);
  const high = Math.max(...allPrices, price24hAgo);


  return { 
      priceData, 
      orderBook: { asks: finalAsks, bids: finalBids }, 
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
  const { settings, timedMarketPresets } = useSettings();
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
        const now = new Date();
        const currentTimeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

        setAllData(prevAllData => {
            const newAllData = new Map(prevAllData);

            availablePairs.forEach(pair => {
                const prevData = newAllData.get(pair);
                if (!prevData) return;

                const pairSettings = settings[pair] || { trend: 'normal', volatility: 0.05, isTradingHalted: false, specialTimeFrames: [] };
                
                if (pairSettings.isTradingHalted) {
                    return;
                }
                
                let finalNewPrice;
                const activePreset = timedMarketPresets.find(p => p.pair === pair && p.time === currentTimeStr);

                if (activePreset) {
                    finalNewPrice = activePreset.price;
                } else {
                    const lastDataPoint = prevData.priceData[prevData.priceData.length - 1];
                    let newPrice = lastDataPoint.price;
                    
                    const volatilityFactor = pairSettings.volatility;
                    let priceMultiplier = 1 + (Math.random() - 0.5) * volatilityFactor;

                    if (pairSettings.trend === 'up') {
                        priceMultiplier = 1 + (Math.random() * volatilityFactor); 
                    } else if (pairSettings.trend === 'down') {
                        priceMultiplier = 1 - (Math.random() * volatilityFactor);
                    }
                    
                    finalNewPrice = newPrice * priceMultiplier;
                }


                const newDataPoint = {
                  time: formatTime(new Date()),
                  price: finalNewPrice
                };

                const newSummary = { 
                    ...prevData.summary, 
                    price: finalNewPrice,
                    high: Math.max(prevData.summary.high, finalNewPrice),
                    low: Math.min(prevData.summary.low, finalNewPrice),
                };
                
                const newPriceData = [...prevData.priceData.slice(1), newDataPoint];

                let updatedData = { 
                    ...prevData, 
                    summary: newSummary, 
                    priceData: newPriceData
                };
                
                if (pair === tradingPair) {
                     const newAsks = prevData.orderBook.asks.map((order: Order) => ({ ...order, price: order.price * 0.99 + newSummary.price * 0.01 })).sort((a: Order,b: Order) => a.price - b.price);
                     const newBids = prevData.orderBook.bids.map((order: Order) => ({ ...order, price: order.price * 0.99 + newSummary.price * 0.01 })).sort((a: Order,b: Order) => b.price - a.price);

                    const newTrades = [...prevData.trades];
                    if (Math.random() > 0.7) {
                        newTrades.unshift({
                            id: `trade-${Date.now()}`,
                            type: activePreset ? activePreset.action : (Math.random() > 0.5 ? 'buy' : 'sell'),
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

    }, 5000); 

    return () => clearInterval(interval);
  }, [isInitialised, tradingPair, settings, timedMarketPresets]);

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

