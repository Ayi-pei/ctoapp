
"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback, useRef } from 'react';
import { availablePairs, MarketSummary, OHLC } from '@/types';
import { useSettings } from './settings-context';
import { useAdminSettings } from './admin-settings-context';
import axios, { AxiosError } from 'axios';

const CRYPTO_PAIRS = ['BTC/USDT', 'ETH/USDT', 'SOL/USDT', 'XRP/USDT', 'LTC/USDT', 'BNB/USDT', 'MATIC/USDT', 'DOGE/USDT', 'ADA/USDT', 'SHIB/USDT', 'AVAX/USDT', 'LINK/USDT', 'DOT/USDT', 'UNI/USDT', 'TRX/USDT', 'XLM/USDT', 'VET/USDT', 'EOS/USDT', 'FIL/USDT', 'ICP/USDT'];
const GOLD_PAIRS = ['XAU/USD'];
const FOREX_PAIRS = ['EUR/USD', 'GBP/USD'];

const API_SOURCES = ['coingecko', 'coinpaprika'];

const randomInRange = (min: number, max: number) => Math.random() * (max - min) + min;

// Unified ID mapping for different APIs
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
    [key: string]: { remaining: number };
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
    
    // State to track API usage
    const [apiState, setApiState] = useState<ApiState>({
        coingecko: { remaining: 10000 },
        coinpaprika: { remaining: 20000 },
    });

    const changeTradingPair = (pair: string) => {
        if (availablePairs.includes(pair)) {
            setTradingPair(pair);
        }
    };

    const getLatestPrice = useCallback((pair: string): number => {
        const kline = klineData[pair];
        if (kline && kline.length > 0) {
            return kline[kline.length - 1].close;
        }

        const summary = summaryData.find(s => s.pair === pair);
        return summary?.price || 0;
    }, [summaryData, klineData]);


    const selectApiSource = () => {
        // Find the API with the most remaining requests
        const availableApis = Object.entries(apiState).filter(([, state]) => state.remaining > 0);
        if (availableApis.length === 0) {
            console.warn("All API quotas exceeded.");
            return null; // No available APIs
        }
        
        const bestApi = availableApis.reduce((best, current) => {
            return current[1].remaining > best[1].remaining ? current : best;
        });

        return bestApi[0];
    };


    const fetchMarketData = useCallback(async () => {
        const currentSource = selectApiSource();
        if (!currentSource) return;

        const ids = CRYPTO_PAIRS.map(pair => apiIdMap[pair]?.[currentSource as keyof typeof apiIdMap['BTC/USDT']]).filter(Boolean);
        if (ids.length === 0) {
            return;
        }

        try {
            const response = await axios.get('/api/market-data', {
                params: {
                    source: currentSource,
                    endpoint: 'markets',
                    ids: ids.join(','),
                }
            });

            // Decrement remaining requests count on success
            setApiState(prev => ({
                ...prev,
                [currentSource]: { remaining: prev[currentSource].remaining - 1 }
            }));

            const newSummaryData = response.data as MarketSummary[];
            
            setSummaryData(prev => {
                const updatedData = [...prev];
                newSummaryData.forEach(newItem => {
                    const index = updatedData.findIndex(item => item.pair === newItem.pair);
                    if (index !== -1) {
                        updatedData[index] = newItem;
                    } else {
                        updatedData.push(newItem);
                    }
                });
                return updatedData;
            });

        } catch (error) {
            console.error(`Error fetching market summary from ${currentSource}:`, error);
            if (axios.isAxiosError(error) && (error.response?.status === 429 || error.response?.status === 403)) {
                console.warn(`Quota likely exceeded for ${currentSource}. Setting remaining to 0.`);
                setApiState(prev => ({
                    ...prev,
                    [currentSource]: { remaining: 0 }
                }));
            }
        }
    }, [apiState]);

    const fetchKlineData = useCallback(async (pair: string) => {
        if (!CRYPTO_PAIRS.includes(pair)) {
            return;
        }
        
        const currentSource = selectApiSource();
        if (!currentSource) return;

        const apiId = apiIdMap[pair]?.[currentSource as keyof typeof apiIdMap['BTC/USDT']];
        
        if (!apiId) {
            console.warn(`No API ID found for ${pair} on source ${currentSource}.`);
            return;
        };

        try {
            const response = await axios.get('/api/market-data', {
                params: {
                    source: currentSource,
                    endpoint: 'ohlc',
                    pairId: apiId,
                }
            });

            setApiState(prev => ({
                ...prev,
                [currentSource]: { remaining: prev[currentSource].remaining - 1 }
            }));

            const newOhlcData: OHLC[] = response.data;
            setKlineData(prev => ({ ...prev, [pair]: newOhlcData }));

        } catch (error) {
            console.error(`Error fetching k-line data for ${pair} via ${currentSource} proxy:`, error);
             if (axios.isAxiosError(error) && (error.response?.status === 429 || error.response?.status === 403)) {
                console.warn(`Quota likely exceeded for ${currentSource} on kline fetch. Setting remaining to 0.`);
                setApiState(prev => ({
                    ...prev,
                    [currentSource]: { remaining: 0 }
                }));
            }
        }
    }, [apiState]);

    // Initial data fetch
    useEffect(() => {
        fetchMarketData();
        availablePairs.forEach(pair => fetchKlineData(pair));
    }, []); // eslint-disable-line react-hooks/exhaustive-deps


    useEffect(() => {
        const marketInterval = setInterval(fetchMarketData, 60000); // Fetch market summary every minute
        const klineInterval = setInterval(() => {
             availablePairs.forEach(pair => {
                fetchKlineData(pair);
            });
        }, 60000); // Fetch klines every minute

        return () => {
            clearInterval(marketInterval);
            clearInterval(klineInterval);
        };
    }, [fetchMarketData, fetchKlineData]);


    useEffect(() => {
        // This effect generates mock data for non-crypto pairs and applies admin overrides
        const interval = setInterval(() => {
            const now = new Date();
            const currentMinutes = now.getHours() * 60 + now.getMinutes();

            setSummaryData(prevSummary => 
                prevSummary.map(item => {
                    const adminOverride = adminOverrides[item.pair];
                    if (adminOverride?.active && adminOverride.overridePrice !== undefined) {
                        return { ...item, price: adminOverride.overridePrice };
                    }
                    
                    const pairSettings = settings[item.pair];
                    if (pairSettings?.marketOverrides) {
                         for (const override of pairSettings.marketOverrides) {
                            const [startH, startM] = override.startTime.split(':').map(Number);
                            const [endH, endM] = override.endTime.split(':').map(Number);
                            const startMinutes = startH * 60 + startM;
                            const endMinutes = endH * 60 + endM;

                            if (currentMinutes >= startMinutes && currentMinutes <= endMinutes) {
                                return { ...item, price: randomInRange(override.minPrice, override.maxPrice) };
                            }
                        }
                    }
                    
                    // Mock data generation only for non-crypto pairs
                    if (!CRYPTO_PAIRS.includes(item.pair)) {
                        const lastPrice = item.price || (item.pair.startsWith('XAU') ? 2300 : 1.1);
                        const volatility = item.pair.startsWith('XAU') ? 0.0005 : 0.0001;
                        const newPrice = lastPrice * (1 + (Math.random() - 0.5) * volatility);
                        
                        setKlineData(prevKline => {
                            const pairKline = prevKline[item.pair] || [];
                            const newPoint = { time: Date.now(), open: lastPrice, high: Math.max(lastPrice, newPrice), low: Math.min(lastPrice, newPrice), close: newPrice };
                            const updatedKline = [...pairKline.slice(-99), newPoint];
                            return { ...prevKline, [item.pair]: updatedKline };
                        });
                        
                        return { ...item, price: newPrice };
                    }
                    
                    return item;
                })
            );

        }, 5000); // K-line simulation runs every 5 seconds

        return () => clearInterval(interval);
    }, [settings, adminOverrides]);


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
