
"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { availablePairs, MarketSummary, OHLC } from '@/types';
import axios from 'axios';
import { useSystemSettings } from './system-settings-context';

const CRYPTO_PAIRS = ['BTC/USDT', 'ETH/USDT', 'SOL/USDT', 'XRP/USDT', 'LTC/USDT', 'BNB/USDT', 'MATIC/USDT', 'DOGE/USDT', 'ADA/USDT', 'SHIB/USDT', 'AVAX/USDT', 'LINK/USDT', 'DOT/USDT', 'UNI/USDT', 'TRX/USDT', 'XLM/USDT', 'VET/USDT', 'EOS/USDT', 'FIL/USDT', 'ICP/USDT'];
const GOLD_PAIRS = ['XAU/USD'];
const FOREX_PAIRS = ['EUR/USD', 'GBP/USD'];
const FUTURES_PAIRS = ['OIL/USD', 'XAG/USD', 'NAS100/USD']; // Note: OIL and NAS100 are placeholders as we don't have a free API for them now.

const apiIdMap: Record<string, { coingecko?: string; alphavantage?: { from?: string; to?: string; symbol?: string; market?: string }; iconId?: string; }> = {
    'BTC/USDT': { coingecko: 'bitcoin' },
    'ETH/USDT': { coingecko: 'ethereum' },
    'SOL/USDT': { coingecko: 'solana' },
    'XRP/USDT': { coingecko: 'ripple' },
    'LTC/USDT': { coingecko: 'litecoin' },
    'BNB/USDT': { coingecko: 'binancecoin' },
    'MATIC/USDT': { coingecko: 'matic-network' },
    'DOGE/USDT': { coingecko: 'dogecoin' },
    'ADA/USDT': { coingecko: 'cardano' },
    'SHIB/USDT': { coingecko: 'shiba-inu' },
    'AVAX/USDT': { coingecko: 'avalanche-2' },
    'LINK/USDT': { coingecko: 'chainlink' },
    'DOT/USDT': { coingecko: 'polkadot' },
    'UNI/USDT': { coingecko: 'uniswap' },
    'TRX/USDT': { coingecko: 'tron' },
    'XLM/USDT': { coingecko: 'stellar' },
    'VET/USDT': { coingecko: 'vechain' },
    'EOS/USDT': { coingecko: 'eos' },
    'FIL/USDT': { coingecko: 'filecoin' },
    'ICP/USDT': { coingecko: 'internet-computer' },
    'XAU/USD': { alphavantage: { symbol: 'XAU', market: 'USD' }, iconId: 'xau' },
    'EUR/USD': { alphavantage: { from: 'EUR', to: 'USD' }, iconId: 'eur' },
    'GBP/USD': { alphavantage: { from: 'GBP', to: 'USD' }, iconId: 'gbp' },
    // Placeholders for now, as AlphaVantage doesn't provide them easily for free
    'OIL/USD': { iconId: 'oil' },
    'XAG/USD': { iconId: 'xag' }, // Silver
    'NAS100/USD': { iconId: 'nas100' },
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

// --- Data Fetching Functions ---
const fetchCoinGeckoData = async (): Promise<Record<string, MarketSummary>> => {
    const coingeckoIds = CRYPTO_PAIRS.map(pair => apiIdMap[pair]?.coingecko).filter(Boolean) as string[];
    try {
        const response = await axios.post('/api/coingecko', { assetIds: coingeckoIds });
        return response.data;
    } catch (error) {
        console.warn("CoinGecko API fetch failed. It will be retried.", error);
        return {}; // Return empty on error
    }
}

const fetchCoinDeskData = async (): Promise<Record<string, MarketSummary>> => {
     try {
        const response = await axios.get('/api/coindesk');
        return response.data;
    } catch (error) {
        console.warn("CoinDesk API fetch failed. It will be retried.", error);
        return {};
    }
}

const fetchAlphaVantageData = async (): Promise<Record<string, MarketSummary>> => {
    const avPairs = FOREX_PAIRS.concat(GOLD_PAIRS);
    const avData: Record<string, MarketSummary> = {};

    for (const pair of avPairs) {
        const params = apiIdMap[pair]?.alphavantage;
        if (!params) continue;
        
        try {
            const response = await axios.get('/api/alphavantage', { params });
            const data = response.data;
            avData[pair] = {
                pair: pair,
                price: parseFloat(data.price),
                change: parseFloat(data.change) || 0,
                high: parseFloat(data.high) || 0,
                low: parseFloat(data.low) || 0,
                volume: 0, // AV does not provide volume for free forex/gold
                icon: `/icons/${apiIdMap[pair]?.iconId}.svg`,
            };
        } catch (error) {
            console.warn(`AlphaVantage fetch for ${pair} failed.`, error);
        }
    }
    return avData;
}
// --- End Data Fetching ---


export function MarketDataProvider({ children }: { children: ReactNode }) {
    const { systemSettings } = useSystemSettings();
    const [tradingPair, setTradingPair] = useState(availablePairs[0]);
    const [klineData, setKlineData] = useState<Record<string, OHLC[]>>({});
    const [summaryData, setSummaryData] = useState<MarketSummary[]>([]);
    
    // This state will hold the "true" prices from the API
    const [baseApiData, setBaseApiData] = useState<Record<string, MarketSummary>>({});
    
    // State to rotate crypto API providers
    const [cryptoProvider, setCryptoProvider] = useState<'coingecko' | 'coindesk'>('coingecko');

    const getLatestPrice = useCallback((pair: string): number => {
        return summaryData.find(s => s.pair === pair)?.price || 0;
    }, [summaryData]);
    
    // Fetch real data from APIs less frequently to save requests
    useEffect(() => {
        const fetchRealData = async () => {
            
            // Fetch crypto data using the rotating provider
            let cryptoData;
            if (cryptoProvider === 'coingecko') {
                cryptoData = await fetchCoinGeckoData();
            } else {
                cryptoData = await fetchCoinDeskData();
            }
            
            // Fetch non-crypto data
            const otherData = await fetchAlphaVantageData();

            const newBaseData = { ...cryptoData, ...otherData };

            if(Object.keys(newBaseData).length > 0) {
                 setBaseApiData(prev => ({ ...prev, ...newBaseData }));
            }
            
            // Rotate provider for the next fetch
            setCryptoProvider(prev => prev === 'coingecko' ? 'coindesk' : 'coingecko');
        };

        fetchRealData(); // Fetch on initial load
        const interval = setInterval(fetchRealData, 30000); // And then every 30 seconds

        return () => clearInterval(interval);
    }, [cryptoProvider]); // Re-run this effect when the provider changes

    // High-frequency simulation logic
    useEffect(() => {
        const simulationInterval = setInterval(() => {
            if (Object.keys(baseApiData).length === 0) return;

            const now = new Date();
            const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
            
            const newSummaries = Object.values(baseApiData).map(summary => {
                let newPrice = summary.price;
                const intervention = systemSettings.marketInterventions.find(i => 
                    i.tradingPair === summary.pair && 
                    i.startTime <= currentTime && 
                    i.endTime >= currentTime
                );
                
                if (intervention) {
                    const { minPrice, maxPrice, trend } = intervention;
                    const priceRange = maxPrice - minPrice;
                    if (trend === 'up') {
                        newPrice = minPrice + ((newPrice - minPrice + priceRange * 0.05) % priceRange);
                    } else if (trend === 'down') {
                        newPrice = maxPrice - ((maxPrice - newPrice + priceRange * 0.05) % priceRange);
                    } else { // random
                        newPrice += (Math.random() - 0.5) * (priceRange * 0.1); // Fluctuate within 10% of range
                        newPrice = Math.max(minPrice, Math.min(maxPrice, newPrice));
                    }
                } else {
                    const volatility = 0.0005; // Base volatility for simulation
                    newPrice *= (1 + (Math.random() - 0.5) * volatility);
                }

                return { ...summary, price: newPrice };
            });

            setSummaryData(newSummaries);

            // Update K-line data with simulated prices
            setKlineData(prevKline => {
                const newKline = { ...prevKline };
                newSummaries.forEach(summary => {
                    const pairData = newKline[summary.pair] || [];
                    const lastDataPoint = pairData[pairData.length - 1];

                    const latestOhlc: OHLC = {
                        time: now.getTime(),
                        open: summary.price, high: summary.price,
                        low: summary.price, close: summary.price,
                    };
                    
                    if (lastDataPoint && (now.getTime() - lastDataPoint.time) < 60000) { // Aggregate within a minute
                        lastDataPoint.close = summary.price;
                        lastDataPoint.high = Math.max(lastDataPoint.high, summary.price);
                        lastDataPoint.low = Math.min(lastDataPoint.low, summary.price);
                    } else {
                        newKline[summary.pair] = [...pairData, latestOhlc].slice(-200); // Keep last 200 points
                    }
                });
                return newKline;
            });

        }, 2000); // Simulate every 2 seconds

        return () => clearInterval(simulationInterval);
    }, [baseApiData, systemSettings.marketInterventions]);


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
