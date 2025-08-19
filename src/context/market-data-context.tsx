
"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { availablePairs, MarketSummary, OHLC } from '@/types';
import { useSettings } from './settings-context';
import axios from 'axios';

const CRYPTO_PAIRS = ['BTC/USDT', 'ETH/USDT', 'SOL/USDT', 'XRP/USDT', 'LTC/USDT', 'BNB/USDT', 'MATIC/USDT', 'DOGE/USDT', 'ADA/USDT', 'SHIB/USDT', 'AVAX/USDT', 'LINK/USDT', 'DOT/USDT', 'UNI/USDT', 'TRX/USDT', 'XLM/USDT', 'VET/USDT', 'EOS/USDT', 'FIL/USDT', 'ICP/USDT'];
const GOLD_PAIRS = ['XAU/USD'];
const FOREX_PAIRS = ['EUR/USD', 'GBP/USD'];
const FUTURES_PAIRS = ['OIL/USD', 'XAG/USD', 'NAS100/USD'];


const API_SOURCES = ['coingecko', 'coinpaprika'];

const randomInRange = (min: number, max: number) => Math.random() * (max - min) + min;

const apiIdMap: Record<string, { coingecko?: string, coinpaprika?: string, yahoo?: string }> = {
    'BTC/USDT': { coingecko: 'bitcoin', coinpaprika: 'btc-bitcoin', yahoo: 'BTC-USD' },
    'ETH/USDT': { coingecko: 'ethereum', coinpaprika: 'eth-ethereum', yahoo: 'ETH-USD' },
    'SOL/USDT': { coingecko: 'solana', coinpaprika: 'sol-solana', yahoo: 'SOL-USD' },
    'XRP/USDT': { coingecko: 'ripple', coinpaprika: 'xrp-xrp', yahoo: 'XRP-USD' },
    'LTC/USDT': { coingecko: 'litecoin', coinpaprika: 'ltc-litecoin', yahoo: 'LTC-USD' },
    'BNB/USDT': { coingecko: 'binancecoin', coinpaprika: 'bnb-binance-coin', yahoo: 'BNB-USD' },
    'MATIC/USDT': { coingecko: 'matic-network', coinpaprika: 'matic-polygon', yahoo: 'MATIC-USD' },
    'DOGE/USDT': { coingecko: 'dogecoin', coinpaprika: 'doge-dogecoin', yahoo: 'DOGE-USD' },
    'ADA/USDT': { coingecko: 'cardano', coinpaprika: 'ada-cardano', yahoo: 'ADA-USD' },
    'SHIB/USDT': { coingecko: 'shiba-inu', coinpaprika: 'shib-shiba-inu', yahoo: 'SHIB-USD' },
    'AVAX/USDT': { coingecko: 'avalanche-2', coinpaprika: 'avax-avalanche', yahoo: 'AVAX-USD' },
    'LINK/USDT': { coingecko: 'chainlink', coinpaprika: 'link-chainlink', yahoo: 'LINK-USD' },
    'DOT/USDT': { coingecko: 'polkadot', coinpaprika: 'dot-polkadot', yahoo: 'DOT-USD' },
    'UNI/USDT': { coingecko: 'uniswap', coinpaprika: 'uni-uniswap', yahoo: 'UNI-USD' },
    'TRX/USDT': { coingecko: 'tron', coinpaprika: 'trx-tron', yahoo: 'TRX-USD' },
    'XLM/USDT': { coingecko: 'stellar', coinpaprika: 'xlm-stellar', yahoo: 'XLM-USD' },
    'VET/USDT': { coingecko: 'vechain', coinpaprika: 'vet-vechain', yahoo: 'VET-USD' },
    'EOS/USDT': { coingecko: 'eos', coinpaprika: 'eos-eos', yahoo: 'EOS-USD' },
    'FIL/USDT': { coingecko: 'filecoin', coinpaprika: 'fil-filecoin', yahoo: 'FIL-USD' },
    'ICP/USDT': { coingecko: 'internet-computer', coinpaprika: 'icp-internet-computer', yahoo: 'ICP-USD' },
    // Non-crypto mappings
    'XAU/USD': { yahoo: 'GC=F' }, // Gold Futures
    'EUR/USD': { yahoo: 'EURUSD=X' },
    'GBP/USD': { yahoo: 'GBPUSD=X' },
    'OIL/USD': { yahoo: 'CL=F' }, // Crude Oil Futures
    'XAG/USD': { yahoo: 'SI=F' }, // Silver Futures
    'NAS100/USD': { yahoo: 'NQ=F' }, // Nasdaq 100 Futures
};

type ApiState = {
    [key: string]: { remaining: number; weight: number };
}

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
    const { settings, timedMarketPresets } = useSettings();
    const [tradingPair, setTradingPair] = useState(availablePairs[0]);
    const [klineData, setKlineData] = useState<Record<string, OHLC[]>>({});
    const [summaryData, setSummaryData] = useState<MarketSummary[]>([]);
    
    // THIS IS THE NEW SOURCE OF TRUTH FOR ALL TRADING LOGIC
    const getLatestPrice = useCallback((pair: string): number => {
        return summaryData.find(s => s.pair === pair)?.price || 0;
    }, [summaryData]);
    
    const fetchCryptoData = useCallback(async (isRetry = false) => {
        const storedIndex = localStorage.getItem('apiSourceIndex');
        const currentIndex = storedIndex ? parseInt(storedIndex, 10) : 0;
        let currentSource = API_SOURCES[currentIndex];

        const ids = CRYPTO_PAIRS.map(pair => apiIdMap[pair]?.[currentSource as keyof typeof apiIdMap['BTC/USDT']]).filter(Boolean);
        
        if (ids.length === 0) return;

        try {
            const response = await axios.get('/api/market-data', {
                params: {
                    source: currentSource,
                    endpoint: 'markets',
                    ids: ids.join(','),
                }
            });

            const newSummaryData = response.data as MarketSummary[];
            
            setSummaryData(prev => {
                const updatedData = [...prev];
                newSummaryData.forEach(newItem => {
                    const index = updatedData.findIndex(item => item.pair === newItem.pair);
                    if (index !== -1) {
                        updatedData[index] = { ...updatedData[index], ...newItem};
                    } else {
                        updatedData.push(newItem);
                    }
                });
                return updatedData;
            });

        } catch (error) {
            console.error(`Error fetching crypto summary from ${currentSource}:`, error);
             if (axios.isAxiosError(error) && (error.response?.status === 429 || error.response?.status === 403)) {
                const nextIndex = (currentIndex + 1) % API_SOURCES.length;
                localStorage.setItem('apiSourceIndex', nextIndex.toString());
                if (!isRetry) {
                   setTimeout(() => fetchCryptoData(true), 1000); 
                }
            }
        }
    }, []);

    const fetchYahooData = useCallback(async () => {
        const nonCryptoPairs = [...GOLD_PAIRS, ...FOREX_PAIRS, ...FUTURES_PAIRS];
        const symbolsToFetch = nonCryptoPairs.map(pair => apiIdMap[pair]?.yahoo).filter(Boolean) as string[];

        const promises = symbolsToFetch.map(async (symbol) => {
            try {
                const response = await axios.get(`/api/quote/${symbol}`);
                const data = response.data;
                const pair = Object.keys(apiIdMap).find(key => apiIdMap[key]?.yahoo === symbol) || "Unknown";
                
                return {
                    pair: pair,
                    price: data.regularMarketPrice || 0,
                    change: data.regularMarketChangePercent * 100 || 0,
                    volume: data.regularMarketVolume || 0,
                    high: data.regularMarketDayHigh || 0,
                    low: data.regularMarketDayLow || 0,
                    icon: `/images/instrument-icons/${pair.split('/')[0].toLowerCase()}.png`,
                } as MarketSummary;
            } catch (error) {
                console.error(`Failed to fetch from Yahoo for ${symbol}:`, error);
                return null;
            }
        });
        
        const results = await Promise.all(promises);
        const newSummaryData = results.filter(Boolean) as MarketSummary[];

        setSummaryData(prev => {
            const updatedData = [...prev];
            newSummaryData.forEach(newItem => {
                const index = updatedData.findIndex(item => item.pair === newItem.pair);
                if (index !== -1) {
                    updatedData[index] = { ...updatedData[index], ...newItem};
                } else {
                    updatedData.push(newItem);
                }
            });
            return updatedData.sort((a, b) => availablePairs.indexOf(a.pair) - availablePairs.indexOf(b.pair));
        });

    }, []);

    const fetchKlineData = useCallback(async (pair: string) => {
        const coingeckoId = apiIdMap[pair]?.coingecko;
        if (!coingeckoId) return;

        try {
            const response = await axios.get('/api/market-data', {
                params: {
                    source: 'coingecko',
                    endpoint: 'ohlc',
                    pairId: coingeckoId,
                }
            });

            const newOhlcData: OHLC[] = response.data;
            setKlineData(prev => ({ ...prev, [pair]: newOhlcData }));

        } catch (error) {
            console.error(`Error fetching k-line data for ${pair} via coingecko proxy:`, error);
        }
    }, []);


    // Initial data fetch and periodic refresh
    useEffect(() => {
        fetchCryptoData();
        fetchYahooData();
        const cryptoInterval = setInterval(fetchCryptoData, 60000); // 1 minute for crypto
        const yahooInterval = setInterval(fetchYahooData, 15000); // 15 seconds for real markets

        return () => {
            clearInterval(cryptoInterval);
            clearInterval(yahooInterval);
        };
    }, [fetchCryptoData, fetchYahooData]);

    // Fetch K-line data when trading pair changes
    useEffect(() => {
        if (tradingPair) {
            fetchKlineData(tradingPair);
        }
    }, [tradingPair, fetchKlineData]);


    const cryptoSummaryData = summaryData.filter(s => CRYPTO_PAIRS.includes(s.pair));
    const goldSummaryData = summaryData.filter(s => GOLD_PAIRS.includes(s.pair));
    const forexSummaryData = summaryData.filter(s => FOREX_PAIRS.includes(s.pair));
    const futuresSummaryData = summaryData.filter(s => FUTURES_PAIRS.includes(s.pair));


    const contextValue: MarketContextType = {
        tradingPair,
        changeTradingPair: setTradingPair,
        availablePairs,
        summaryData,
        cryptoSummaryData,
        goldSummaryData,
        forexSummaryData,
        futuresSummaryData,
        klineData,
        getLatestPrice,
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
