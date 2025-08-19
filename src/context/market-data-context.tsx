
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
    'XAU/USD': { yahoo: 'GC=F', iconId: 'xau' },
    'EUR/USD': { yahoo: 'EURUSD=X', iconId: 'eur' },
    'GBP/USD': { yahoo: 'GBPUSD=X', iconId: 'gbp' },
    'OIL/USD': { yahoo: 'CL=F', iconId: 'oil' },
    'XAG/USD': { yahoo: 'SI=F', iconId: 'xag' },
    'NAS100/USD': { yahoo: 'NQ=F', iconId: 'nas100' },
};

type ApiProvider = 'Tatum' | 'CoinDesk' | 'CoinGecko';
const API_PROVIDERS: ApiProvider[] = ['Tatum', 'CoinDesk', 'CoinGecko'];
const ROTATION_INTERVAL_SECONDS = 20; // 20s * 3 providers = 60s cycle

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
    
    const getLatestPrice = useCallback((pair: string): number => {
        return summaryData.find(s => s.pair === pair)?.price || 0;
    }, [summaryData]);

    const processDataWithClientOverrides = useCallback((fetchedData: MarketSummary[]) => {
        const interventions = systemSettings.marketInterventions || [];
        if (interventions.length === 0) return fetchedData;

        return fetchedData.map(item => {
            const now = new Date();
            const currentTime = now.getHours() * 60 + now.getMinutes();

            const activeIntervention = interventions.find(i => {
                if (i.tradingPair !== item.pair) return false;
                const [startH, startM] = i.startTime.split(':').map(Number);
                const startTime = startH * 60 + startM;
                const [endH, endM] = i.endTime.split(':').map(Number);
                const endTime = endH * 60 + endM;
                return currentTime >= startTime && currentTime <= endTime;
            });
            
            if (!activeIntervention) {
                return item;
            }

            let newPrice;
            const { minPrice, maxPrice, trend } = activeIntervention;
            
            const timePassed = currentTime - (activeIntervention.startTime.split(':').map(Number)[0] * 60 + activeIntervention.startTime.split(':').map(Number)[1]);
            const totalDuration = (activeIntervention.endTime.split(':').map(Number)[0] * 60 + activeIntervention.endTime.split(':').map(Number)[1]) - (activeIntervention.startTime.split(':').map(Number)[0] * 60 + activeIntervention.startTime.split(':').map(Number)[1]);
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
        if (Object.keys(newData).length === 0) return;

        setSummaryData(prev => {
            const updatedData = { ...prev.reduce((acc, item) => ({ ...acc, [item.pair]: item }), {}) };
            for (const pair in newData) {
                updatedData[pair] = { ...updatedData[pair], ...newData[pair] };
            }
            return Object.values(updatedData).sort((a, b) => availablePairs.indexOf(a.pair) - availablePairs.indexOf(b.pair));
        });
    }, []);
    
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
                mergeSummaryData(mappedData);
            }
        } catch (error) {
            console.warn("Tatum API fetch failed, will try next provider.", error);
        }
    }, [mergeSummaryData]);

    const fetchCoinGeckoData = useCallback(async () => {
        const coingeckoIds = CRYPTO_PAIRS.map(pair => apiIdMap[pair]?.coingecko).filter(Boolean) as string[];
        try {
            const response = await axios.post('/api/coingecko', { assetIds: coingeckoIds });
            if (response.data && Object.keys(response.data).length > 0) {
                mergeSummaryData(response.data);
            }
        } catch (error) {
            console.warn("CoinGecko API fetch failed, will try next provider.", error);
        }
    }, [mergeSummaryData]);

    const fetchCoinDeskData = useCallback(async () => {
        try {
            const response = await axios.get('/api/coindesk');
            if (response.data && Object.keys(response.data).length > 0) {
                 mergeSummaryData(response.data);
            }
        } catch (error) {
            console.warn("CoinDesk API fetch failed, will try next provider.", error);
        }
    }, [mergeSummaryData]);

    const fetchYahooData = useCallback(async () => {
        const nonCryptoPairs = [...GOLD_PAIRS, ...FOREX_PAIRS, ...FUTURES_PAIRS];
        const symbolsToFetch = nonCryptoPairs.map(pair => apiIdMap[pair]?.yahoo).filter(Boolean) as string[];

        const promises = symbolsToFetch.map(async (symbol) => {
            try {
                const response = await axios.get(`/api/quote/${symbol}`);
                const data = response.data;
                const pairKey = Object.keys(apiIdMap).find(key => apiIdMap[key]?.yahoo === symbol) || "Unknown";
                const iconId = apiIdMap[pairKey]?.iconId;

                return {
                    pair: pairKey,
                    price: parseFloat(data.regularMarketPrice) || 0,
                    change: (parseFloat(data.regularMarketChangePercent) || 0) * 100,
                    volume: parseFloat(data.regularMarketVolume) || 0,
                    high: parseFloat(data.regularMarketDayHigh) || 0,
                    low: parseFloat(data.regularMarketDayLow) || 0,
                    icon: iconId ? `/images/instrument-icons/${iconId}.png` : `https://placehold.co/32x32.png`,
                } as MarketSummary;
            } catch (error) {
                console.error(`Failed to fetch from Yahoo for ${symbol}.`, error);
                return null;
            }
        });
        
        const results = await Promise.all(promises);
        const yahooData = (results.filter(Boolean) as MarketSummary[]).reduce((acc: Record<string, MarketSummary>, item) => {
            acc[item.pair] = item;
            return acc;
        }, {});
        mergeSummaryData(yahooData);
    }, [mergeSummaryData]);

    const fetchKlineData = useCallback(async (pair: string) => {
        try {
            if (!CRYPTO_PAIRS.includes(pair)) return;
            const response = await axios.get(`/api/market-data`, {
                params: { pair: pair }
            });
            setKlineData(prev => ({ ...prev, [pair]: response.data }));
        } catch (error) {
            console.error(`Error fetching k-line data for ${pair} from proxy:`, error);
        }
    }, []);
    
    // Main data fetching effect with rotation
     useEffect(() => {
        const fetchCryptoWithRotation = () => {
            const provider = API_PROVIDERS[apiProviderIndex];
            switch (provider) {
                case 'Tatum':
                    fetchTatumData();
                    break;
                case 'CoinDesk':
                    fetchCoinDeskData();
                    break;
                case 'CoinGecko':
                    fetchCoinGeckoData();
                    break;
            }
        };

        const rotationTimer = setInterval(() => {
            setApiProviderIndex(prev => (prev + 1) % API_PROVIDERS.length);
        }, ROTATION_INTERVAL_SECONDS * 1000);
        
        fetchCryptoWithRotation(); // Initial fetch
        const cryptoInterval = setInterval(fetchCryptoWithRotation, 5000);
        
        fetchYahooData(); // Non-crypto data
        const yahooInterval = setInterval(fetchYahooData, 5000);

        return () => {
            clearInterval(cryptoInterval);
            clearInterval(yahooInterval);
            clearInterval(rotationTimer);
        };
    }, [apiProviderIndex, fetchTatumData, fetchCoinGeckoData, fetchCoinDeskData, fetchYahooData]);

    // This effect runs after summaryData is updated by any provider
    useEffect(() => {
        const processedData = processDataWithClientOverrides(summaryData);
        
        setKlineData(prevKlineData => {
            const newKlineData = { ...prevKlineData };
            processedData.forEach(summary => {
                if (!newKlineData[summary.pair]) {
                    newKlineData[summary.pair] = [];
                }
                const latestOhlc: OHLC = {
                    time: new Date().getTime(),
                    open: summary.price,
                    high: summary.high,
                    low: summary.low,
                    close: summary.price,
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

    }, [summaryData, processDataWithClientOverrides]);


    useEffect(() => {
        if (tradingPair && CRYPTO_PAIRS.includes(tradingPair)) {
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
