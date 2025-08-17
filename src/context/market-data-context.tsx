
"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { availablePairs, MarketSummary, OHLC } from '@/types';
import { useSettings } from './settings-context';
import { useAdminSettings } from './admin-settings-context';
import axios, { AxiosError } from 'axios';

const CRYPTO_PAIRS = ['BTC/USDT', 'ETH/USDT', 'SOL/USDT', 'XRP/USDT', 'LTC/USDT', 'BNB/USDT', 'MATIC/USDT', 'DOGE/USDT', 'ADA/USDT', 'SHIB/USDT', 'AVAX/USDT', 'LINK/USDT', 'DOT/USDT', 'UNI/USDT', 'TRX/USDT', 'XLM/USDT', 'VET/USDT', 'EOS/USDT', 'FIL/USDT', 'ICP/USDT'];
const GOLD_PAIRS = ['XAU/USD'];
const FOREX_PAIRS = ['EUR/USD', 'GBP/USD'];

const API_SOURCES = ['coingecko', 'coinpaprika'];

const randomInRange = (min: number, max: number) => Math.random() * (max - min) + min;

const apiIdMap: Record<string, { coingecko?: string, coinpaprika?: string }> = {
    'BTC/USDT': { coingecko: 'bitcoin', coinpaprika: 'btc-bitcoin' },
    'ETH/USDT': { coingecko: 'ethereum', coinpaprika: 'eth-ethereum' },
    'SOL/USDT': { coingecko: 'solana', coinpaprika: 'sol-solana' },
    'XRP/USDT': { coingecko: 'ripple', coinpaprika: 'xrp-xrp' },
    'LTC/USDT': { coingecko: 'litecoin', coinpaprika: 'ltc-litecoin' },
    'BNB/USDT': { coingecko: 'binancecoin', coinpaprika: 'bnb-binance-coin' },
    'MATIC/USDT': { coingecko: 'matic-network', coinpaprika: 'matic-polygon' },
    'DOGE/USDT': { coingecko: 'dogecoin', coinpaprika: 'doge-dogecoin' },
    'ADA/USDT': { coingecko: 'cardano', coinpaprika: 'ada-cardano' },
    'SHIB/USDT': { coingecko: 'shiba-inu', coinpaprika: 'shib-shiba-inu' },
    'AVAX/USDT': { coingecko: 'avalanche-2', coinpaprika: 'avax-avalanche' },
    'LINK/USDT': { coingecko: 'chainlink', coinpaprika: 'link-chainlink' },
    'DOT/USDT': { coingecko: 'polkadot', coinpaprika: 'dot-polkadot' },
    'UNI/USDT': { coingecko: 'uniswap', coinpaprika: 'uni-uniswap' },
    'TRX/USDT': { coingecko: 'tron', coinpaprika: 'trx-tron' },
    'XLM/USDT': { coingecko: 'stellar', coinpaprika: 'xlm-stellar' },
    'VET/USDT': { coingecko: 'vechain', coinpaprika: 'vet-vechain' },
    'EOS/USDT': { coingecko: 'eos', coinpaprika: 'eos-eos' },
    'FIL/USDT': { coingecko: 'filecoin', coinpaprika: 'fil-filecoin' },
    'ICP/USDT': { coingecko: 'internet-computer', coinpaprika: 'icp-internet-computer' },
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
    klineData: Record<string, OHLC[]>;
    getLatestPrice: (pair: string) => number;
}

const MarketContext = createContext<MarketContextType | undefined>(undefined);

export function MarketDataProvider({ children }: { children: ReactNode }) {
    const { settings } = useSettings();
    const { overrides: adminOverrides } = useAdminSettings();
    const [tradingPair, setTradingPair] = useState(availablePairs[0]);
    const [klineData, setKlineData] = useState<Record<string, OHLC[]>>({});
    const [summaryData, setSummaryData] = useState<MarketSummary[]>([]);
    const [simulatedPrices, setSimulatedPrices] = useState<Record<string, number>>({});

    const [apiSourceIndex, setApiSourceIndex] = useState(0);

    const changeTradingPair = (pair: string) => {
        if (availablePairs.includes(pair)) {
            setTradingPair(pair);
        }
    };
    
    // THIS IS THE NEW SOURCE OF TRUTH FOR ALL TRADING LOGIC
    const getLatestPrice = useCallback((pair: string): number => {
        return simulatedPrices[pair] || summaryData.find(s => s.pair === pair)?.price || 0;
    }, [simulatedPrices, summaryData]);


    const fetchMarketData = useCallback(async (isRetry = false) => {
        const currentSource = API_SOURCES[apiSourceIndex];
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
                    const existingItem = updatedData[index];

                    // Initialize simulated price if it doesn't exist
                    setSimulatedPrices(prevPrices => {
                        if (!prevPrices[newItem.pair]) {
                            return { ...prevPrices, [newItem.pair]: newItem.price };
                        }
                        return prevPrices;
                    });
                    
                    if (index !== -1) {
                        updatedData[index] = { ...existingItem, ...newItem};
                    } else {
                        updatedData.push(newItem);
                    }
                });
                return updatedData;
            });

        } catch (error) {
            console.error(`Error fetching market summary from ${currentSource}:`, error);
            if (axios.isAxiosError(error) && (error.response?.status === 429 || error.response?.status === 403)) {
                if (!isRetry) {
                    setApiSourceIndex(prev => (prev + 1) % API_SOURCES.length);
                    setTimeout(() => fetchMarketData(true), 1000); 
                }
            }
        }
    }, [apiSourceIndex]);

    const fetchKlineData = useCallback(async (pair: string) => {
        if (!CRYPTO_PAIRS.includes(pair)) return;
        
        const currentSource = 'coingecko';
        const coingeckoId = apiIdMap[pair]?.coingecko;
        
        if (!coingeckoId) return;

        try {
            const response = await axios.get('/api/market-data', {
                params: {
                    source: currentSource,
                    endpoint: 'ohlc',
                    pairId: coingeckoId,
                }
            });

            const newOhlcData: OHLC[] = response.data;
            setKlineData(prev => ({ ...prev, [pair]: newOhlcData }));

        } catch (error) {
            console.error(`Error fetching k-line data for ${pair} via ${currentSource} proxy:`, error);
        }
    }, []);

    useEffect(() => {
        const marketInterval = setInterval(fetchMarketData, 60000); // Fetch market summary every minute
        const klineInterval = setInterval(() => {
             availablePairs.forEach(pair => fetchKlineData(pair));
        }, 300000); // Fetch klines every 5 minutes is enough for visuals

        fetchMarketData();
        availablePairs.forEach(pair => fetchKlineData(pair));

        return () => {
            clearInterval(marketInterval);
            clearInterval(klineInterval);
        };
    }, [fetchMarketData, fetchKlineData]);


    // Second-by-second simulation engine
    useEffect(() => {
        const simulationInterval = setInterval(() => {
            const now = new Date();
            const currentMinutes = now.getHours() * 60 + now.getMinutes();

            const newPrices: Record<string, number> = {};

            availablePairs.forEach(pair => {
                const adminOverride = adminOverrides[pair];
                const pairSettings = settings[pair];
                const lastSimulatedPrice = simulatedPrices[pair] || summaryData.find(s => s.pair === pair)?.price || 0;

                let nextPrice = lastSimulatedPrice;
                let overrideApplied = false;

                // 1. Highest Priority: Admin real-time override
                if (adminOverride?.active && adminOverride.overridePrice !== undefined) {
                    nextPrice = adminOverride.overridePrice;
                    overrideApplied = true;
                    console.log(`[ADMIN OVERRIDE] Price for ${pair} set to ${nextPrice}`);
                }
                // 2. Second Priority: Scheduled market overrides from settings
                else if (pairSettings?.marketOverrides?.length) {
                    for (const override of pairSettings.marketOverrides) {
                        const [startH, startM] = override.startTime.split(':').map(Number);
                        const [endH, endM] = override.endTime.split(':').map(Number);
                        const startMinutes = startH * 60 + startM;
                        const endMinutes = endH * 60 + endM;

                        if (currentMinutes >= startMinutes && currentMinutes <= endMinutes) {
                            nextPrice = randomInRange(override.minPrice, override.maxPrice);
                            overrideApplied = true;
                            console.log(`[SCHEDULED OVERRIDE] Price for ${pair} set to ${nextPrice} (Range: ${override.minPrice}-${override.maxPrice})`);
                            break;
                        }
                    }
                }
                
                // 3. Default Simulation Logic (if no overrides are active)
                if (!overrideApplied) {
                    const volatility = pairSettings?.volatility || 0.0005;
                    const trendStrength = 0.0001;
                    
                    let trendEffect = 0;
                    if (pairSettings?.trend === 'up') trendEffect = trendStrength;
                    if (pairSettings?.trend === 'down') trendEffect = -trendStrength;
                    
                    const randomFactor = (Math.random() - 0.5) * volatility;
                    nextPrice = lastSimulatedPrice * (1 + trendEffect + randomFactor);
                }

                // For non-crypto pairs, ensure a baseline price if it's 0
                if (!CRYPTO_PAIRS.includes(pair) && nextPrice === 0) {
                     nextPrice = pair.startsWith('XAU') ? 2300 : 1.1;
                }
                
                newPrices[pair] = nextPrice;
            });
            
            setSimulatedPrices(prev => ({...prev, ...newPrices}));

        }, 1000); // Run simulation every second

        return () => clearInterval(simulationInterval);
    }, [settings, adminOverrides, simulatedPrices, summaryData]);


    const cryptoSummaryData = summaryData.filter(s => CRYPTO_PAIRS.includes(s.pair));
    const goldSummaryData = summaryData.filter(s => GOLD_PAIRS.includes(s.pair));
    const forexSummaryData = summaryData.filter(s => FOREX_PAIRS.includes(s.pair));


    const contextValue: MarketContextType = {
        tradingPair,
        changeTradingPair,
        availablePairs,
        summaryData,
        cryptoSummaryData,
        goldSummaryData,
        forexSummaryData,
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
