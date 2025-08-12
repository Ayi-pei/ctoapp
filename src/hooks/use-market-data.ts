
"use client";

import { useState, useEffect, useCallback } from 'react';
import { Order, MarketTrade, PriceDataPoint, MarketSummary, availablePairs } from '@/types';
import { useSettings } from '@/context/settings-context';
import { getMarketData, GetMarketDataOutput } from '@/ai/flows/get-market-data';


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

// ----- MOCK DATA GENERATION (for development and admin override) -----
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

const TATUM_MAP: { [key: string]: string } = {
    'BTC/USDT': 'BTC',
    'ETH/USDT': 'ETH',
    'SOL/USDT': 'SOL',
    'XRP/USDT': 'XRP',
    'LTC/USDT': 'LTC',
    'BNB/USDT': 'BNB',
    'MATIC/USDT': 'MATIC',
};


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
        const assetsToFetch = availablePairs
            .filter(pair => TATUM_MAP[pair] && settings[pair]?.trend === 'normal')
            .map(pair => TATUM_MAP[pair]);

        // --- REAL DATA FETCHING ---
        let realTimeData: GetMarketDataOutput['data'] = {};
        let fetchFailed = false;
        
        if (assetsToFetch.length > 0) {
            try {
                // Pass only the asset symbols like 'BTC', 'ETH'
                const result = await getMarketData({ assetIds: assetsToFetch });
                if (result && Object.keys(result.data).length > 0) {
                    realTimeData = result.data;
                } else {
                    fetchFailed = true;
                }
            } catch (error) {
                fetchFailed = true;
                console.warn(`getMarketData flow failed: ${error}. Falling back to simulator.`);
            }
        }
       
        // --- UPDATE ALL PAIRS ---
        setAllData(prevAllData => {
            const newAllData = new Map(prevAllData);

            newAllData.forEach((prevData, pair) => {
                if (!prevData) return;
                const pairSettings = settings[pair] || { trend: 'normal' };
                
                let newSummary;
                let newPriceData = prevData.priceData;

                const tatumSymbol = TATUM_MAP[pair];
                // Tatum getMarketData flow returns ids in lowercase, e.g. 'btc'
                const assetDataFromTatum = realTimeData[tatumSymbol?.toLowerCase()];
                const shouldUseRealData = !fetchFailed && pairSettings.trend === 'normal' && tatumSymbol && assetDataFromTatum;


                if (shouldUseRealData) {
                    // --- Use REAL Data ---
                    const assetData = assetDataFromTatum;
                    const newPrice = parseFloat(assetData.priceUsd);
                    
                    newSummary = {
                        ...prevData.summary,
                        price: newPrice,
                        change: parseFloat(assetData.changePercent24Hr),
                        volume: parseFloat(assetData.volumeUsd24Hr),
                        high: Math.max(prevData.summary.high, newPrice), // Simplification
                        low: Math.min(prevData.summary.low, newPrice),   // Simplification
                    };
                    
                    if (pair === tradingPair) {
                         newPriceData = [...prevData.priceData.slice(1), {
                            time: formatTime(new Date()),
                            price: newPrice,
                        }];
                    }

                } else {
                    // --- Use MOCK/SIMULATED Data (Admin Override or Fetch Failure) ---
                    let priceMultiplier = randomInRange(0.9995, 1.0005); // Default: normal fluctuation
                    if (pairSettings.trend === 'up') {
                        priceMultiplier = randomInRange(1.0001, 1.0008); 
                    } else if (pairSettings.trend === 'down') {
                        priceMultiplier = randomInRange(0.9992, 0.9999);
                    }
                    
                    const newPrice = prevData.summary.price * priceMultiplier;
                    newSummary = { ...prevData.summary, price: newPrice };
                    
                     if (pair === tradingPair) {
                         newPriceData = [...prevData.priceData.slice(1), {
                            time: formatTime(new Date()),
                            price: newPrice,
                        }];
                    }
                }

                let updatedData = { ...prevData, summary: newSummary, priceData: newPriceData };
                
                // For active pair, also update order book and trades for visual effect
                if (pair === tradingPair) {
                     const newAsks = prevData.orderBook.asks.map(order => ({ ...order, price: order.price * 0.99 + newSummary.price * 0.01 })).sort((a,b) => a.price - b.price);
                     const newBids = prevData.orderBook.bids.map(order => ({ ...order, price: order.price * 0.99 + newSummary.price * 0.01 })).sort((a,b) => b.price - a.price);

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
                    updatedData = { ...updatedData, orderBook: { asks: newAsks, bids: newBids }, trades: newTrades };
                }
                
                newAllData.set(pair, updatedData);
            });
            return newAllData;
        });

    }, 2500); // Update every 2.5 seconds

    return () => clearInterval(interval);
  }, [isInitialised, tradingPair, settings]);

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
