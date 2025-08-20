
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
    'AVAX/USDT': { coingecko: 'avalanche-2', tatum: 'AVAX' },
    'LINK/USDT': { coingecko: 'chainlink', tatum: 'LINK' },
    'DOT/USDT': { coingecko: 'polkadot', tatum: 'DOT' },
    'UNI/USDT': { coingecko: 'uniswap', tatum: 'UNI' },
    'TRX/USDT': { coingecko: 'tron', tatum: 'TRX' },
    'XLM/USDT': { coingecko: 'stellar', tatum: 'XLM' },
    'VET/USDT': { coingecko: 'vechain', tatum: 'VET' },
    'EOS/USDT': { coingecko: 'eos', tatum: 'EOS' },
    'FIL/USDT': { coingecko: 'filecoin', tatum: 'FIL' },
    'ICP/USDT': { coingecko: 'internet-computer', tatum: 'ICP' },
    'XAU/USD': { alphavantage: { symbol: 'XAU', market: 'USD' }, tatum: 'XAU', iconId: 'xau' },
    'EUR/USD': { alphavantage: { from: 'EUR', to: 'USD' }, iconId: 'eur' },
    'GBP/USD': { alphavantage: { from: 'GBP', to: 'USD' }, iconId: 'gbp' },
    'OIL/USD': { iconId: 'oil' },
    'XAG/USD': { tatum: 'XAG', iconId: 'xag' },
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

export function MarketDataProvider({ children }: { children: ReactNode }) {
    const { systemSettings } = useSystemSettings();
    const [tradingPair, setTradingPair] = useState(availablePairs[0]);
    const [klineData, setKlineData] = useState<Record<string, OHLC[]>>({});
    const [summaryData, setSummaryData] = useState<MarketSummary[]>([]);
    
    // This state will hold the "true" prices from the API
    const [baseApiData, setBaseApiData] = useState<Record<string, MarketSummary>>({});

    const getLatestPrice = useCallback((pair: string): number => {
        return summaryData.find(s => s.pair === pair)?.price || 0;
    }, [summaryData]);
    
    // Fetch real data from APIs less frequently to save requests
    useEffect(() => {
        const fetchRealData = async () => {
            const tatumIds = [...CRYPTO_PAIRS, 'XAU/USD', 'XAG/USD'].map(pair => apiIdMap[pair]?.tatum).filter(Boolean) as string[];
            
            try {
                const response = await axios.post('/api/tatum/market-data', { assetIds: tatumIds });
                const tatumData = response.data;

                const newBaseData: Record<string, MarketSummary> = {};
                
                Object.values(tatumData).forEach((asset: any) => {
                    const pair = asset.id === 'XAU' ? 'XAU/USD' : asset.id === 'XAG' ? 'XAG/USD' : `${asset.symbol.toUpperCase()}/USDT`;
                    const iconId = apiIdMap[pair]?.iconId;
                    newBaseData[pair] = {
                        pair,
                        price: parseFloat(asset.priceUsd) || 0,
                        change: parseFloat(asset.changePercent24Hr) || 0,
                        volume: parseFloat(asset.volumeUsd24Hr) || 0,
                        high: parseFloat(asset.high) || 0,
                        low: parseFloat(asset.low) || 0,
                        icon: iconId ? `/icons/${iconId}.svg` : `https://static.coinpaprika.com/coin/${asset.id}/logo.png`,
                    };
                });
                setBaseApiData(prev => ({ ...prev, ...newBaseData }));

            } catch (error) {
                console.warn("Tatum API fetch failed.", error);
            }
        };

        fetchRealData(); // Fetch on initial load
        const interval = setInterval(fetchRealData, 30000); // And then every 30 seconds

        return () => clearInterval(interval);
    }, []);

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
