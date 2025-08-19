
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
    
    const getLatestPrice = useCallback((pair: string): number => {
        return summaryData.find(s => s.pair === pair)?.price || 0;
    }, [summaryData]);

    const processDataWithClientOverrides = useCallback((fetchedData: MarketSummary[]) => {
        return fetchedData.map(item => {
            const pairSettings = systemSettings.marketSettings[item.pair];
            if (!pairSettings || !pairSettings.trend || pairSettings.trend === 'normal') {
                return item;
            }

            let newPrice = item.price;
            const trendFactor = pairSettings.trend === 'up' ? 1.0001 : 0.9999;
            const volatility = pairSettings.volatility || 0.05;
            const randomFactor = 1 + (Math.random() - 0.5) * volatility;
            
            newPrice = newPrice * trendFactor * randomFactor;

            return { ...item, price: newPrice };
        });
    }, [systemSettings.marketSettings]);
    
    const fetchCryptoData = useCallback(async () => {
        const tatumIds = CRYPTO_PAIRS.map(pair => apiIdMap[pair]?.tatum).filter(Boolean) as string[];
        
        try {
            const response = await axios.post('/api/tatum/market-data', { assetIds: tatumIds });
            if (response.data && Object.keys(response.data).length > 0) {
                const newSummaryData = Object.values(response.data).map((asset: any) => {
                    const iconId = apiIdMap[`${asset.symbol}/USDT`]?.iconId || asset.symbol.toLowerCase();
                    return {
                        pair: `${asset.symbol}/USDT`,
                        price: parseFloat(asset.priceUsd) || 0,
                        change: parseFloat(asset.changePercent24Hr) || 0,
                        volume: parseFloat(asset.volumeUsd24Hr) || 0,
                        high: parseFloat(asset.high) || 0,
                        low: parseFloat(asset.low) || 0,
                        icon: `https://static.tatum.io/assets/images/logo/crypto-logos/${iconId}.svg`,
                    }
                });
                
                const processedData = processDataWithClientOverrides(newSummaryData);

                setSummaryData(prev => {
                    const existingNonCrypto = prev.filter(d => !CRYPTO_PAIRS.includes(d.pair));
                    return [...existingNonCrypto, ...processedData].sort((a, b) => availablePairs.indexOf(a.pair) - availablePairs.indexOf(b.pair));
                });
                return;
            }
        } catch (error) {
            console.warn("Tatum API fetch failed.", error);
        }

    }, [processDataWithClientOverrides]);

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
                    price: data.regularMarketPrice || 0,
                    change: (data.regularMarketChangePercent || 0) * 100,
                    volume: data.regularMarketVolume || 0,
                    high: data.regularMarketDayHigh || 0,
                    low: data.regularMarketDayLow || 0,
                    icon: iconId ? `/images/instrument-icons/${iconId}.png` : `https://placehold.co/32x32.png`,
                } as MarketSummary;
            } catch (error) {
                console.error(`Failed to fetch from Yahoo for ${symbol}`);
                return null;
            }
        });
        
        const results = await Promise.all(promises);
        const newSummaryData = results.filter(Boolean) as MarketSummary[];
        const processedData = processDataWithClientOverrides(newSummaryData);

        setSummaryData(prev => {
            const existingCrypto = prev.filter(p => CRYPTO_PAIRS.includes(p.pair));
            return [...existingCrypto, ...processedData].sort((a, b) => availablePairs.indexOf(a.pair) - availablePairs.indexOf(b.pair));
        });

    }, [processDataWithClientOverrides]);

    const fetchKlineData = useCallback(async (pair: string) => {
        try {
            if (!CRYPTO_PAIRS.includes(pair)) return;
            const response = await axios.get(`/api/market-data`, {
                params: { type: 'kline', pair: pair }
            });
            setKlineData(prev => ({ ...prev, [pair]: response.data }));
        } catch (error) {
            console.error(`Error fetching k-line data for ${pair} from proxy:`, error);
        }
    }, []);
    
     useEffect(() => {
        const updateKlineWithSummary = () => {
            setKlineData(prevKlineData => {
                const newKlineData = { ...prevKlineData };
                summaryData.forEach(summary => {
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
        };

        const cryptoInterval = setInterval(fetchCryptoData, 5000);
        const yahooInterval = setInterval(fetchYahooData, 5000);
        
        fetchCryptoData();
        fetchYahooData();

        const updateInterval = setInterval(updateKlineWithSummary, 2000);

        return () => {
            clearInterval(cryptoInterval);
            clearInterval(yahooInterval);
            clearInterval(updateInterval);
        };
    }, [fetchCryptoData, fetchYahooData]);


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
