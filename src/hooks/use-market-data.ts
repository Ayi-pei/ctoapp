
"use client";

import { useState, useEffect, useCallback } from 'react';
import { Order, MarketTrade, PriceDataPoint, KlineDataPoint, MarketSummary, availablePairs } from '@/types';
import { useSettings } from '@/context/settings-context';
import { useAdminSettings } from '@/context/admin-settings-context'; // Import the new hook
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
        case 'AVAX/USDT': return 35;
        case 'LINK/USDT': return 18;
        case 'DOT/USDT': return 7;
        case 'UNI/USDT': return 10;
        case 'TRX/USDT': return 0.12;
        case 'XLM/USDT': return 0.11;
        case 'VET/USDT': return 0.035;
        case 'EOS/USDT': return 0.8;
        case 'FIL/USDT': return 6;
        case 'ICP/USDT': return 12;
        case 'XAU/USD': return 2330;
        case 'EUR/USD': return 1.07;
        case 'GBP/USD': return 1.25;
        default: return 100;
    }
}

// This function now generates data that more closely matches the Binance API structure.
const generateInitialDataForPair = (pair: string) => {
  const basePrice = getBasePrice(pair);
  const now = new Date();

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

  // Order book data, structured as arrays of [price, quantity]
  const asks: Array<[string, string]> = [];
  const bids: Array<[string, string]> = [];
  let askPrice = currentPrice * 1.0005;
  let bidPrice = currentPrice * 0.9995;
  
  for (let i = 0; i < 20; i++) {
    asks.push([askPrice.toFixed(4), randomInRange(0.01, 2).toFixed(6)]);
    askPrice *= randomInRange(1.0001, 1.0003);
  }
  asks.sort((a, b) => parseFloat(a[0]) - parseFloat(b[0]));

  for (let i = 0; i < 20; i++) {
    bids.push([bidPrice.toFixed(4), randomInRange(0.01, 2).toFixed(6)]);
    bidPrice *= randomInRange(0.9997, 0.9999);
  }
  bids.sort((a, b) => parseFloat(b[0]) - parseFloat(a[0]));

  // Convert to the Order type for UI display
  let cumulativeAskSize = 0;
  const finalAsks: Order[] = asks.map(o => {
      const size = parseFloat(o[1]);
      cumulativeAskSize += size;
      return { price: parseFloat(o[0]), size, total: cumulativeAskSize };
  });

  let cumulativeBidSize = 0;
  const finalBids: Order[] = bids.map(o => {
      const size = parseFloat(o[1]);
      cumulativeBidSize += size;
      return { price: parseFloat(o[0]), size, total: cumulativeBidSize };
  });


  // Trade history data
  const trades: MarketTrade[] = [];
  for (let i = 0; i < 30; i++) {
    trades.push({
      id: `trade-${Date.now()}-${i}`,
      type: Math.random() > 0.5 ? 'buy' : 'sell', 
      price: currentPrice * randomInRange(0.999, 1.001),
      amount: randomInRange(0.01, 1.5), 
      time: formatTime(new Date(now.getTime() - randomInRange(1, 600) * 1000)),
      trading_pair: pair,
    });
  }
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


export const useMarketData = () => {
  const { settings, timedMarketPresets } = useSettings();
  const { adminOverrideActive, overridePrice } = useAdminSettings();
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

    let timeoutId: NodeJS.Timeout;

    const runUpdate = async () => {
        const now = new Date();
        const currentMinutes = now.getHours() * 60 + now.getMinutes();
        
        let nextUpdateDelay = 5000; // Default day frequency

        setAllData(prevAllData => {
            const newAllData = new Map(prevAllData);

            availablePairs.forEach(pair => {
                const prevData = newAllData.get(pair);
                if (!prevData) return;

                const pairSettings = settings[pair] || { trend: 'normal', volatility: 0.05, isTradingHalted: false, specialTimeFrames: [], marketOverrides: [] };
                
                if (pairSettings.isTradingHalted) {
                    return;
                }
                
                let finalNewPrice;
                let activeOverride = null;

                // Priority 1: Global Admin Override
                if (adminOverrideActive) {
                    finalNewPrice = overridePrice;
                } else {
                    // Priority 2: Pair-specific market override
                    for (const override of pairSettings.marketOverrides) {
                        const [startH, startM] = override.startTime.split(':').map(Number);
                        const [endH, endM] = override.endTime.split(':').map(Number);
                        const startMinutes = startH * 60 + startM;
                        const endMinutes = endH * 60 + endM;

                        if (currentMinutes >= startMinutes && currentMinutes <= endMinutes) {
                            activeOverride = override;
                            break;
                        }
                    }
                    
                    // Priority 3: Timed presets
                    let activePreset = null;
                    if (!activeOverride) {
                        for (const preset of timedMarketPresets) {
                            if (preset.pair !== pair) continue;
                            const [startH, startM] = preset.startTime.split(':').map(Number);
                            const [endH, endM] = preset.endTime.split(':').map(Number);
                            const startMinutes = startH * 60 + startM;
                            const endMinutes = endH * 60 + endM;

                            if (currentMinutes >= startMinutes && currentMinutes <= endMinutes) {
                                activePreset = preset;
                                break;
                            }
                        }
                    }

                    if (activeOverride) {
                        // We are in a pair-specific override period
                        finalNewPrice = randomInRange(activeOverride.minPrice, activeOverride.maxPrice);
                        nextUpdateDelay = activeOverride.frequency === 'day' ? 5000 : 15000;
                    } else if (activePreset) {
                        // We are in a timed market preset period
                        finalNewPrice = randomInRange(activePreset.minPrice, activePreset.maxPrice);
                    } else {
                        // Priority 4: Regular price simulation
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
                         // Standard day/night frequency for regular simulation
                        const currentHour = now.getHours();
                        const isNight = currentHour >= 22 || currentHour < 6;
                        nextUpdateDelay = isNight ? 15000 : 5000;
                    }
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
                            type: activeOverride ? 'buy' : (Math.random() > 0.5 ? 'buy' : 'sell'),
                            price: newSummary.price * randomInRange(0.9998, 1.0002),
                            amount: randomInRange(0.01, 1.5),
                            time: formatTime(new Date()),
                            trading_pair: pair,
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
        
        timeoutId = setTimeout(runUpdate, nextUpdateDelay);
    };

    runUpdate();

    return () => clearTimeout(timeoutId);
  }, [isInitialised, tradingPair, settings, timedMarketPresets, adminOverrideActive, overridePrice]);

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
