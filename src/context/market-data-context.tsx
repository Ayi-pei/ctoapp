
"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { availablePairs, MarketSummary, OHLC } from '@/types';
import axios from 'axios';
import { useSystemSettings } from './system-settings-context';

const CRYPTO_PAIRS = ['BTC/USDT', 'ETH/USDT', 'SOL/USDT', 'XRP/USDT', 'LTC/USDT', 'BNB/USDT', 'MATIC/USDT', 'DOGE/USDT', 'ADA/USDT', 'SHIB/USDT', 'AVAX/USDT', 'LINK/USDT', 'DOT/USDT', 'UNI/USDT', 'TRX/USDT', 'XLM/USDT', 'VET/USDT', 'EOS/USDT', 'FIL/USDT', 'ICP/USDT'];
const GOLD_PAIRS = ['XAU/USD'];
const FOREX_PAIRS = ['EUR/USD', 'GBP/USD'];
const FUTURES_PAIRS = ['OIL/USD', 'XAG/USD', 'NAS100/USD'];

const apiIdMap: Record<string, { coingecko?: string; alphavantage?: { from?: string; to?: string; symbol?: string; market?: string }; tatum?: string; iconId?: string; }> = {
    'BTC/USDT': { coingecko: 'bitcoin', tatum: 'BTC' },
    'ETH/USDT': { coingecko: 'ethereum', tatum: 'ETH' },
    'SOL/USDT': { coingecko: 'solana', tatum: 'SOL' },
    'XRP/USDT': { coingecko: 'ripple', tatum: 'XRP' },
    'LTC/USDT': { coingecko: 'litecoin', tatum: 'LTC' },
    'BNB/USDT': { coingecko: 'binancecoin', tatum: 'BNB' },
    'MATIC/USDT': { coingecko: 'matic-network', tatum: 'MATIC' },
    'DOGE/USDT': { coingecko: 'dogecoin', tatum: 'DOGE' },
    'ADA/USDT': { coingecko: 'cardano', tatum: 'ADA' },
    'SHIB/USDT': { coingecko: 'shiba-inu', tatum: 'SHIB' },
    'AVAX/USDT': { coingecko: 'avalanche-2', tatum: 'AVAX', iconId: 'avalanche' },
    'LINK/USDT': { coingecko: 'chainlink', tatum: 'LINK' },
    'DOT/USDT': { coingecko: 'polkadot', tatum: 'DOT' },
    'UNI/USDT': { coingecko: 'uniswap', tatum: 'UNI' },
    'TRX/USDT': { coingecko: 'tron', tatum: 'TRON' },
    'XLM/USDT': { coingecko: 'stellar', tatum: 'XLM' },
    'VET/USDT': { coingecko: 'vechain', tatum: 'VET' },
    'EOS/USDT': { coingecko: 'eos', tatum: 'EOS' },
    'FIL/USDT': { coingecko: 'filecoin', tatum: 'FIL' },
    'ICP/USDT': { coingecko: 'internet-computer', tatum: 'ICP' },
    'XAU/USD': { alphavantage: { symbol: 'XAU', market: 'USD'}, iconId: 'xau', tatum: 'XAU' },
    'EUR/USD': { alphavantage: { from: 'EUR', to: 'USD' }, iconId: 'eur' },
    'GBP/USD': { alphavantage: { from: 'GBP', to: 'USD' }, iconId: 'gbp' },
    // Futures are not directly supported by these free APIs, placeholders remain
    'OIL/USD': { iconId: 'oil' },
    'XAG/USD': { tatum: 'XAG', iconId: 'xag' },
    'NAS100/USD': { iconId: 'nas100' },
};


type ApiProvider = 'Tatum' | 'CoinGecko' | 'CoinDesk';
const API_PROVIDERS: ApiProvider[] = ['Tatum', 'CoinGecko', 'CoinDesk'];
const ROTATION_INTERVAL_SECONDS = 20; // Rotate every 20 seconds

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

    const fetchTatumData = useCallback(async () => {
        const tatumIds = CRYPTO_PAIRS.map(pair => apiIdMap[pair]?.tatum).filter(Boolean) as string[];
        try {
            const response = await axios.post('/api/tatum/market-data', { assetIds: tatumIds });
            if (response.data && Object.keys(response.data).length > 0) {
                return Object.values(response.data).reduce((acc: Record<string, MarketSummary>, asset: any) => {
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
    
    const fetchCoinDeskData = useCallback(async () => {
        try {
            const response = await axios.get('/api/coindesk');
            if (response.data && Object.keys(response.data).length > 0) {
                 if (response.data['BTC/USDT']) {
                    response.data['BTC/USDT'].icon = `https://static.tatum.io/assets/images/logo/crypto-logos/btc.svg`;
                 }
                return response.data;
            }
        } catch(error) {
            console.warn("CoinDesk API fetch failed.", error);
        }
        return {};
    }, []);

    const fetchAlphaVantageData = useCallback(async (pairs: string[]) => {
        const results: Record<string, MarketSummary> = {};
        for (const pair of pairs) {
            const params = apiIdMap[pair]?.alphavantage;
            if (!params) continue;
            try {
                const response = await axios.get('/api/alphavantage', { params });
                const data = response.data;
                const iconId = apiIdMap[pair]?.iconId;

                results[pair] = {
                    pair,
                    price: parseFloat(data.price),
                    change: parseFloat(data.change) || 0,
                    volume: 0,
                    high: parseFloat(data.high) || 0,
                    low: parseFloat(data.low) || 0,
                    icon: iconId ? `/icons/${iconId}.svg` : undefined,
                };
            } catch (error) {
                console.warn(`Alpha Vantage fetch for ${pair} failed.`, error);
                // Fallback to Tatum for Gold/Silver if AlphaVantage fails
                const tatumId = apiIdMap[pair]?.tatum;
                if (tatumId) {
                    try {
                        const tatumResponse = await axios.post('/api/tatum/market-data', { assetIds: [tatumId] });
                        if (tatumResponse.data && tatumResponse.data[tatumId]) {
                            const asset = tatumResponse.data[tatumId];
                             results[pair] = {
                                pair: pair,
                                price: parseFloat(asset.priceUsd) || 0,
                                change: parseFloat(asset.changePercent24Hr) || 0,
                                volume: parseFloat(asset.volumeUsd24Hr) || 0,
                                high: parseFloat(asset.high) || 0,
                                low: parseFloat(asset.low) || 0,
                                icon: `/icons/${apiIdMap[pair]?.iconId}.svg`,
                            };
                        }
                    } catch (tatumError) {
                         console.warn(`Tatum fallback for ${pair} failed.`, tatumError);
                    }
                }
            }
        }
        return results;
    }, []);
    
     useEffect(() => {
        const fetchData = async () => {
            let cryptoData;
            const provider = API_PROVIDERS[apiProviderIndex];
            switch (provider) {
                case 'Tatum': cryptoData = await fetchTatumData(); break;
                case 'CoinGecko': cryptoData = await fetchCoinGeckoData(); break;
                case 'CoinDesk': cryptoData = await fetchCoinDeskData(); break;
            }

            const nonCryptoPairs = [...FOREX_PAIRS, ...GOLD_PAIRS, ...FUTURES_PAIRS];
            const nonCryptoData = await fetchAlphaVantageData(nonCryptoPairs);
            
            const mergedRawData = { ...(cryptoData || {}), ...nonCryptoData };
            const processedData = processDataWithClientOverrides(Object.values(mergedRawData));
            
            if (processedData.length > 0) {
                 setDataBuffer(prev => [...prev, processedData]);
            }
        };

        fetchData();
        const dataFetchInterval = setInterval(fetchData, 5000);
        const rotationInterval = setInterval(() => {
            setApiProviderIndex(prev => (prev + 1) % API_PROVIDERS.length);
        }, ROTATION_INTERVAL_SECONDS * 1000);

        const bufferingTimeout = setTimeout(() => {
            setIsBufferingComplete(true);
        }, 60000);

        return () => {
            clearInterval(dataFetchInterval);
            clearInterval(rotationInterval);
            clearTimeout(bufferingTimeout);
        };
    }, [apiProviderIndex, fetchTatumData, fetchCoinGeckoData, fetchCoinDeskData, fetchAlphaVantageData, processDataWithClientOverrides]);

    useEffect(() => {
        if (dataBuffer.length === 0) return;

        if (!isBufferingComplete) {
            setSummaryData(dataBuffer[dataBuffer.length - 1]);
            setLatestPrice(prev => {
                const newLatest = { ...prev };
                dataBuffer[dataBuffer.length - 1].forEach(item => {
                    newLatest[item.pair] = item.price;
                });
                return newLatest;
            });
            return;
        }

        const playbackInterval = setInterval(() => {
            setDataBuffer(prev => {
                if (prev.length > 0) {
                    const [nextFrame, ...rest] = prev;
                    setSummaryData(nextFrame);
                    setLatestPrice(prevLatest => {
                        const newLatest = { ...prevLatest };
                        nextFrame.forEach(item => {
                            newLatest[item.pair] = item.price;
                        });
                        return newLatest;
                    });
                    return rest;
                }
                return [];
            });
        }, 2000);

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
