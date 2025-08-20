
"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { availablePairs, MarketSummary, OHLC } from '@/types';
import axios from 'axios';
import { useSystemSettings } from './system-settings-context';

const CRYPTO_PAIRS = ['BTC/USDT', 'ETH/USDT', 'SOL/USDT', 'XRP/USDT', 'LTC/USDT', 'BNB/USDT', 'MATIC/USDT', 'DOGE/USDT', 'ADA/USDT', 'SHIB/USDT', 'AVAX/USDT', 'LINK/USDT', 'DOT/USDT', 'UNI/USDT', 'TRX/USDT', 'XLM/USDT', 'VET/USDT', 'EOS/USDT', 'FIL/USDT', 'ICP/USDT'];
const GOLD_PAIRS = ['XAU/USD'];
const FOREX_PAIRS = ['EUR/USD', 'GBP/USD'];
const FUTURES_PAIRS = ['OIL/USD', 'XAG/USD', 'NAS100/USD'];

const apiIdMap: Record<string, { coingecko?: string, yahoo?: string, tatum?: string, iconId?: string }> = {
    'BTC/USDT': { coingecko: 'bitcoin', yahoo: 'BTC-USD', tatum: 'BTC' },
    'ETH/USDT': { coingecko: 'ethereum', yahoo: 'ETH-USD', tatum: 'ETH' },
    'SOL/USDT': { coingecko: 'solana', yahoo: 'SOL-USD', tatum: 'SOL' },
    'XRP/USDT': { coingecko: 'ripple', yahoo: 'XRP-USD', tatum: 'XRP' },
    'LTC/USDT': { coingecko: 'litecoin', yahoo: 'LTC-USD', tatum: 'LTC' },
    'BNB/USDT': { coingecko: 'binancecoin', yahoo: 'BNB-USD', tatum: 'BNB' },
    'MATIC/USDT': { coingecko: 'matic-network', yahoo: 'MATIC-USD', tatum: 'MATIC' },
    'DOGE/USDT': { coingecko: 'dogecoin', yahoo: 'DOGE-USD', tatum: 'DOGE' },
    'ADA/USDT': { coingecko: 'cardano', yahoo: 'ADA-USD', tatum: 'ADA' },
    'SHIB/USDT': { coingecko: 'shiba-inu', yahoo: 'SHIB-USD', tatum: 'SHIB' },
    'AVAX/USDT': { coingecko: 'avalanche-2', yahoo: 'AVAX-USD', tatum: 'AVAX', iconId: 'avalanche' },
    'LINK/USDT': { coingecko: 'chainlink', yahoo: 'LINK-USD', tatum: 'LINK' },
    'DOT/USDT': { coingecko: 'polkadot', yahoo: 'DOT-USD', tatum: 'DOT' },
    'UNI/USDT': { coingecko: 'uniswap', yahoo: 'UNI-USD', tatum: 'UNI' },
    'TRX/USDT': { coingecko: 'tron', yahoo: 'TRX-USD', tatum: 'TRON' },
    'XLM/USDT': { coingecko: 'stellar', yahoo: 'XLM-USD', tatum: 'XLM' },
    'VET/USDT': { coingecko: 'vechain', yahoo: 'VET-USD', tatum: 'VET' },
    'EOS/USDT': { coingecko: 'eos', yahoo: 'EOS-USD', tatum: 'EOS' },
    'FIL/USDT': { coingecko: 'filecoin', yahoo: 'FIL-USD', tatum: 'FIL' },
    'ICP/USDT': { coingecko: 'internet-computer', yahoo: 'ICP-USD', tatum: 'ICP' },
    'XAU/USD': { yahoo: 'GC=F', iconId: 'xau', tatum: 'XAU' },
    'EUR/USD': { yahoo: 'EURUSD=X', iconId: 'eur' },
    'GBP/USD': { yahoo: 'GBPUSD=X', iconId: 'gbp' },
    'OIL/USD': { yahoo: 'CL=F', iconId: 'oil' },
    'XAG/USD': { yahoo: 'SI=F', iconId: 'xag', tatum: 'XAG' },
    'NAS100/USD': { yahoo: 'NQ=F', iconId: 'nas100' },
};


type ApiProvider = 'Tatum' | 'CoinGecko';
const API_PROVIDERS: ApiProvider[] = ['Tatum', 'CoinGecko'];
const ROTATION_INTERVAL_SECONDS = 30; // 30s * 2 providers = 60s cycle

interface MarketContextType {
    tradingPair: string;
    changeTradingPair: (pair: string) => void;
    availablePairs: string[];
    summaryData: MarketSummary[];
    cryptoSummaryData: MarketSummary[];
    goldSummaryData: MarketSummary[];
    forexSummaryData: MarketSummary[];
    futuresSummaryData: MarketSummary[];
    klineData: Record<string, OHLC[]>;
    getLatestPrice: (pair: string) => number;
}

const MarketContext = createContext<MarketContextType | undefined>(undefined);

export function MarketDataProvider({ children }: { children: ReactNode }) {
    const { systemSettings } = useSystemSettings();
    const [tradingPair, setTradingPair] = useState(availablePairs[0]);
    const [klineData, setKlineData] = useState<Record<string, OHLC[]>>({});
    const [summaryData, setSummaryData] = useState<MarketSummary[]>([]);
    const [apiProviderIndex, setApiProviderIndex] = useState(0);
    const [latestPrice, setLatestPrice] = useState<Record<string, number>>({});
    
    // --- Data Buffering and Smoothing ---
    const [dataBuffer, setDataBuffer] = useState<MarketSummary[][]>([]);
    const [isBufferingComplete, setIsBufferingComplete] = useState(false);


    const getLatestPriceCallback = useCallback((pair: string): number => {
        return latestPrice[pair] || summaryData.find(s => s.pair === pair)?.price || 0;
    }, [latestPrice, summaryData]);


    const processDataWithClientOverrides = useCallback((fetchedData: MarketSummary[]) => {
        const interventions = systemSettings.marketInterventions || [];
        if (interventions.length === 0) return fetchedData;

        return fetchedData.map(item => {
            const now = new Date();
            // Assuming server time is UTC, adjust for Beijing time (UTC+8) for comparison
            const beijingTime = new Date(now.getTime() + 8 * 60 * 60 * 1000);
            const currentHours = beijingTime.getUTCHours();
            const currentMinutes = beijingTime.getUTCMinutes();
            const currentTimeInMinutes = currentHours * 60 + currentMinutes;

            const activeIntervention = interventions.find(i => {
                if (i.tradingPair !== item.pair) return false;
                const [startH, startM] = i.startTime.split(':').map(Number);
                const startTime = startH * 60 + startM;
                const [endH, endM] = i.endTime.split(':').map(Number);
                const endTime = endH * 60 + endM;
                return currentTimeInMinutes >= startTime && currentTimeInMinutes <= endTime;
            });
            
            if (!activeIntervention) {
                return item;
            }

            let newPrice;
            const { minPrice, maxPrice, trend } = activeIntervention;
             const [startH, startM] = activeIntervention.startTime.split(':').map(Number);
            const startTimeInMinutes = startH * 60 + startM;
            const [endH, endM] = activeIntervention.endTime.split(':').map(Number);
            const endTimeInMinutes = endH * 60 + endM;
            const timePassed = currentTimeInMinutes - startTimeInMinutes;
            const totalDuration = endTimeInMinutes - startTimeInMinutes;
            const progress = totalDuration > 0 ? timePassed / totalDuration : 0;


            if (trend === 'up') {
                newPrice = minPrice + (maxPrice - minPrice) * progress;
            } else if (trend === 'down') {
                newPrice = maxPrice - (maxPrice - minPrice) * progress;
            } else { // random
                newPrice = minPrice + Math.random() * (maxPrice - minPrice);
            }
            
            newPrice *= (1 + (Math.random() - 0.5) * 0.001);

            return { 
                ...item, 
                price: newPrice,
                high: Math.max(item.high ?? newPrice, newPrice),
                low: Math.min(item.low ?? newPrice, newPrice)
            };
        });
    }, [systemSettings.marketInterventions]);

    const mergeSummaryData = useCallback((newData: Record<string, MarketSummary>) => {
        if (Object.keys(newData).length === 0) return [];
    
        let updatedData = [...summaryData];
        let hasChanged = false;
    
        for (const pair in newData) {
            const index = updatedData.findIndex(item => item.pair === pair);
            const newItem = { ...(updatedData[index] || {}), ...newData[pair] };
            if (index > -1) {
                updatedData[index] = newItem;
            } else {
                updatedData.push(newItem);
            }
            hasChanged = true;
        }
    
        if (hasChanged) {
             return updatedData.sort((a, b) => availablePairs.indexOf(a.pair) - availablePairs.indexOf(b.pair));
        }
        return updatedData;
    
    }, [summaryData]);
    
    const fetchTatumData = useCallback(async () => {
        const tatumIds = CRYPTO_PAIRS.map(pair => apiIdMap[pair]?.tatum).filter(Boolean) as string[];
        try {
            const response = await axios.post('/api/tatum/market-data', { assetIds: tatumIds });
            if (response.data && Object.keys(response.data).length > 0) {
                const mappedData = Object.values(response.data).reduce((acc: Record<string, MarketSummary>, asset: any) => {
                    const iconId = apiIdMap[`${asset.symbol}/USDT`]?.iconId || asset.symbol.toLowerCase();
                    const pair = `${asset.symbol}/USDT`;
                    acc[pair] = {
                        pair: pair,
                        price: parseFloat(asset.priceUsd) || 0,
                        change: parseFloat(asset.changePercent24Hr) || 0,
                        volume: parseFloat(asset.volumeUsd24Hr) || 0,
                        high: parseFloat(asset.high) || 0,
                        low: parseFloat(asset.low) || 0,
                        icon: `https://static.tatum.io/assets/images/logo/crypto-logos/${iconId}.svg`,
                    };
                    return acc;
                }, {});
                return mappedData;
            }
        } catch (error) {
            console.warn("Tatum API fetch failed.", error);
        }
        return {};
    }, []);

    const fetchCoinGeckoData = useCallback(async () => {
        const coingeckoIds = CRYPTO_PAIRS.map(pair => apiIdMap[pair]?.coingecko).filter(Boolean) as string[];
        try {
            const response = await axios.post('/api/coingecko', { assetIds: coingeckoIds });
            if (response.data && Object.keys(response.data).length > 0) {
                return response.data;
            }
        } catch (error) {
            console.warn("CoinGecko API fetch failed.", error);
        }
        return {};
    }, []);

    const fetchYahooData = useCallback(async () => {
        const nonCryptoPairs = [...GOLD_PAIRS, ...FOREX_PAIRS, ...FUTURES_PAIRS];
        const symbolsToFetch = nonCryptoPairs.map(pair => apiIdMap[pair]?.yahoo).filter(Boolean) as string[];
        let fetchedData: Record<string, MarketSummary> = {};

        const tatumCommodityIds = nonCryptoPairs
            .filter(pair => apiIdMap[pair]?.tatum)
            .map(pair => apiIdMap[pair]?.tatum) as string[];


        const yahooPromises = symbolsToFetch.map(async (symbol) => {
             const pairKey = Object.keys(apiIdMap).find(key => apiIdMap[key]?.yahoo === symbol) || "Unknown";
            try {
                const response = await axios.get(`/api/quote/${symbol}`);
                const data = response.data;
                const iconId = apiIdMap[pairKey]?.iconId;

                return {
                    pair: pairKey,
                    price: parseFloat(data.regularMarketPrice) || 0,
                    change: (parseFloat(data.regularMarketChangePercent) || 0) * 100,
                    volume: parseFloat(data.regularMarketVolume) || 0,
                    high: parseFloat(data.regularMarketDayHigh) || 0,
                    low: parseFloat(data.regularMarketDayLow) || 0,
                    icon: iconId ? `/images/${iconId}.png` : `https://placehold.co/32x32.png`,
                } as MarketSummary;
            } catch (error) {
                console.error(`Failed to fetch from Yahoo for ${symbol}.`);
                if (tatumCommodityIds.includes(apiIdMap[pairKey]?.tatum || '')) {
                    try {
                        const tatumResponse = await axios.post('/api/tatum/market-data', { assetIds: [apiIdMap[pairKey]?.tatum] });
                         const assetData = Object.values(tatumResponse.data)[0] as any;
                         if (assetData) {
                             return {
                                 pair: pairKey,
                                 price: parseFloat(assetData.priceUsd) || 0,
                                 change: parseFloat(assetData.changePercent24Hr) || 0,
                                 volume: parseFloat(assetData.volumeUsd24Hr) || 0,
                                 high: parseFloat(assetData.high) || 0,
                                 low: parseFloat(assetData.low) || 0,
                                 icon: `/images/${apiIdMap[pairKey]?.iconId}.png`,
                             } as MarketSummary
                         }
                    } catch (tatumError) {
                        console.error(`Tatum fallback failed for ${pairKey}:`, tatumError);
                    }
                }
                return null;
            }
        });
        
        const results = await Promise.all(yahooPromises);
        results.filter(Boolean).forEach(item => {
            if(item) fetchedData[item.pair] = item;
        });

        return fetchedData;
    }, []);
    
    // Main data fetching effect
     useEffect(() => {
        const fetchData = async () => {
            let cryptoData;
            const provider = API_PROVIDERS[apiProviderIndex];
            switch (provider) {
                case 'Tatum': cryptoData = await fetchTatumData(); break;
                case 'CoinGecko': cryptoData = await fetchCoinGeckoData(); break;
            }
            const yahooData = await fetchYahooData();

            const mergedRawData = { ...(cryptoData || {}), ...(yahooData || {}) };
            const processedData = processDataWithClientOverrides(Object.values(mergedRawData));
            
            // Immediately update the 'real-time' price for trading calculations
            setLatestPrice(prev => {
                const newLatest = { ...prev };
                processedData.forEach(item => {
                    newLatest[item.pair] = item.price;
                });
                return newLatest;
            });
            
             // Push new data into buffer
             if (processedData.length > 0) {
                 setDataBuffer(prev => [...prev, processedData]);
             }
        };

        fetchData(); // Initial fetch
        const dataFetchInterval = setInterval(fetchData, 5000);
        const rotationInterval = setInterval(() => {
            setApiProviderIndex(prev => (prev + 1) % API_PROVIDERS.length);
        }, ROTATION_INTERVAL_SECONDS * 1000);

        // Start playback after a delay
        const bufferingTimeout = setTimeout(() => {
            setIsBufferingComplete(true);
        }, 60000); // 1 minute buffer time

        return () => {
            clearInterval(dataFetchInterval);
            clearInterval(rotationInterval);
            clearTimeout(bufferingTimeout);
        };
    }, [apiProviderIndex, fetchTatumData, fetchCoinGeckoData, fetchYahooData, processDataWithClientOverrides]);

    // Playback effect
    useEffect(() => {
        if (!isBufferingComplete || dataBuffer.length === 0) {
            // During buffering, show live data to avoid blank screen
            if (dataBuffer.length > 0) {
                setSummaryData(dataBuffer[dataBuffer.length - 1]);
            }
            return;
        }

        const playbackInterval = setInterval(() => {
            setDataBuffer(prev => {
                if (prev.length > 0) {
                    const [nextFrame, ...rest] = prev;
                    setSummaryData(nextFrame);
                    return rest;
                }
                // If buffer is empty, just show the last available frame
                return [];
            });
        }, 2000); // 2-second playback interval

        return () => clearInterval(playbackInterval);
    }, [isBufferingComplete, dataBuffer]);

    // Update K-Line data based on the displayed summary data
    useEffect(() => {
        setKlineData(prevKlineData => {
            const newKlineData = { ...prevKlineData };
            summaryData.forEach(summary => {
                if (!newKlineData[summary.pair]) newKlineData[summary.pair] = [];
                
                const latestOhlc: OHLC = {
                    time: new Date().getTime(),
                    open: summary.price, high: summary.high,
                    low: summary.low, close: summary.price,
                };
                
                const pairData = newKlineData[summary.pair];
                const lastDataPoint = pairData[pairData.length - 1];

                if (lastDataPoint && new Date(lastDataPoint.time).getMinutes() === new Date().getMinutes()) {
                    lastDataPoint.close = summary.price;
                    lastDataPoint.high = Math.max(lastDataPoint.high, summary.price);
                    lastDataPoint.low = Math.min(lastDataPoint.low, summary.price);
                } else {
                    newKlineData[summary.pair] = [...pairData, latestOhlc].slice(-100);
                }
            });
            return newKlineData;
        });

    }, [summaryData]);


    const contextValue: MarketContextType = {
        tradingPair,
        changeTradingPair: setTradingPair,
        availablePairs,
        summaryData,
        cryptoSummaryData: summaryData.filter(s => CRYPTO_PAIRS.includes(s.pair)),
        goldSummaryData: summaryData.filter(s => GOLD_PAIRS.includes(s.pair)),
        forexSummaryData: summaryData.filter(s => FOREX_PAIRS.includes(s.pair)),
        futuresSummaryData: summaryData.filter(s => FUTURES_PAIRS.includes(s.pair)),
        klineData,
        getLatestPrice: getLatestPriceCallback,
    };

    return (
        <MarketContext.Provider value={contextValue}>
            {children}
        </MarketContext.Provider>
    );
}

export function useMarket() {
    const context = useContext(MarketContext);
    if (context === undefined) {
        throw new Error('useMarket must be used within a MarketDataProvider');
    }
    return context;
}

    