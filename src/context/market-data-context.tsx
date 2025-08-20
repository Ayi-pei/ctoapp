
"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { MarketSummary, OHLC, availablePairs as allAvailablePairs } from '@/types';
import axios from 'axios';
import { useSystemSettings } from './system-settings-context';

const CRYPTO_PAIRS = allAvailablePairs.filter(p => !p.includes('-PERP') && !['XAU/USD', 'EUR/USD', 'GBP/USD'].includes(p));

const apiIdMap: Record<string, { coingecko?: string; }> = {
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
};


interface MarketContextType {
    tradingPair: string;
    changeTradingPair: (pair: string) => void;
    availablePairs: string[];
    summaryData: MarketSummary[];
    cryptoSummaryData: MarketSummary[];
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
        console.warn("CoinGecko API fetch failed.", error);
        return {};
    }
}

const fetchCoinDeskData = async (): Promise<Record<string, MarketSummary>> => {
     try {
        const response = await axios.get('/api/coindesk');
        return response.data;
    } catch (error) {
        console.warn("CoinDesk API fetch failed.", error);
        return {};
    }
}
// --- End Data Fetching ---

// --- Initial Data Generation ---
const generateInitialKlineData = (basePrice: number, points: number): OHLC[] => {
    const data: OHLC[] = [];
    let price = basePrice;
    const now = Date.now();
    for (let i = 0; i < points; i++) {
        const time = now - (points - i) * 1000; // 1 second interval
        const open = price;
        const close = price * (1 + (Math.random() - 0.5) * 0.0005);
        const high = Math.max(open, close);
        const low = Math.min(open, close);
        data.push({ time, open, high, low, close });
        price = close;
    }
    return data;
};

const INITIAL_BTC_PRICE = 68000;
const initialTradingPair = CRYPTO_PAIRS[0];

const initialKlineData: Record<string, OHLC[]> = {
    [initialTradingPair]: generateInitialKlineData(INITIAL_BTC_PRICE, 60), // 60 points for 1 minute at 1s interval
};

const initialSummaryData: MarketSummary[] = [{
    pair: initialTradingPair,
    price: initialKlineData[initialTradingPair][initialKlineData[initialTradingPair].length - 1].close,
    change: 1.5,
    volume: 50000,
    high: INITIAL_BTC_PRICE * 1.02,
    low: INITIAL_BTC_PRICE * 0.98,
    icon: 'https://assets.coingecko.com/coins/images/1/large/bitcoin.png'
}];
// --- End Initial Data Generation ---


export function MarketDataProvider({ children }: { children: ReactNode }) {
    const { systemSettings } = useSystemSettings();
    const [tradingPair, setTradingPair] = useState(initialTradingPair);
    
    // This is the "buffer" for real data fetched from APIs.
    const [baseApiData, setBaseApiData] = useState<Record<string, MarketSummary>>({});
    
    // These states are DERIVED from the simulation and are used to render the UI.
    const [summaryData, setSummaryData] = useState<MarketSummary[]>(initialSummaryData);
    const [klineData, setKlineData] = useState<Record<string, OHLC[]>>(initialKlineData);

    const [cryptoProvider, setCryptoProvider] = useState<'coingecko' | 'coindesk'>('coingecko');

    const getLatestPrice = useCallback((pair: string): number => {
        return summaryData.find(s => s.pair === pair)?.price || 0;
    }, [summaryData]);
    
    // Low-frequency fetch for real data from ALL external APIs. This ONLY updates the `baseApiData` buffer.
    useEffect(() => {
        const fetchRealData = async () => {
            console.log(`Fetching crypto data from: ${cryptoProvider}`);
            const cryptoPromise = cryptoProvider === 'coingecko' ? fetchCoinGeckoData() : fetchCoinDeskData();
            const cryptoData = await cryptoPromise;

            if (Object.keys(cryptoData).length > 0) {
                setBaseApiData(prevData => ({ ...prevData, ...cryptoData }));
            }

            setCryptoProvider(prev => prev === 'coingecko' ? 'coindesk' : 'coingecko');
        };

        const timer = setTimeout(fetchRealData, 1000); // Fetch after 1s on initial load
        const interval = setInterval(fetchRealData, 60000); // Then fetch every 60 seconds

        return () => {
            clearTimeout(timer);
            clearInterval(interval);
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [cryptoProvider]); 

    // High-frequency simulation logic. Reads from `baseApiData` and updates UI-facing states.
    useEffect(() => {
        const simulationInterval = setInterval(() => {
            const now = new Date();
            const hours = now.getHours();
            const minutes = now.getMinutes();
            const currentTime = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
            
            // Determine which dataset to use as the source of truth for simulation
            const sourceForSim = Object.keys(baseApiData).length > 0
                ? Object.values(baseApiData)
                : summaryData; // Fallback to last simulated data if API hasn't responded

            const newSimulatedSummaries = sourceForSim.map(summary => {
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
                    } else {
                        newPrice += (Math.random() - 0.5) * (priceRange * 0.1);
                        newPrice = Math.max(minPrice, Math.min(maxPrice, newPrice));
                    }
                } else {
                    const volatility = 0.0005; 
                    newPrice *= (1 + (Math.random() - 0.5) * volatility);
                }

                // Make sure the new price is reflected in a new summary object
                return { ...summary, price: newPrice };
            });

            setSummaryData(newSimulatedSummaries);

            setKlineData(prevKline => {
                const newKline = { ...prevKline };
                newSimulatedSummaries.forEach(summary => {
                    const pairData = newKline[summary.pair] || [];
                    const lastDataPoint = pairData.length > 0 ? pairData[pairData.length - 1] : null;
                    const currentPrice = summary.price;
                    const nowTime = now.getTime();

                    // Check if we are in a new 1-minute window
                    if (lastDataPoint && nowTime - lastDataPoint.time < 60000) {
                        lastDataPoint.close = currentPrice;
                        lastDataPoint.high = Math.max(lastDataPoint.high, currentPrice);
                        lastDataPoint.low = Math.min(lastDataPoint.low, currentPrice);
                    } else {
                        const newPoint: OHLC = {
                            time: nowTime,
                            open: lastDataPoint?.close || currentPrice,
                            high: currentPrice,
                            low: currentPrice,
                            close: currentPrice,
                        };
                        newKline[summary.pair] = [...pairData, newPoint].slice(-200); 
                    }
                });
                return newKline;
            });

        }, 1000); // Set to 1 second for higher frequency simulation

        return () => clearInterval(simulationInterval);
    }, [baseApiData, systemSettings.marketInterventions, summaryData]);

    const contextValue: MarketContextType = {
        tradingPair,
        changeTradingPair: setTradingPair,
        availablePairs: CRYPTO_PAIRS,
        summaryData,
        cryptoSummaryData: summaryData.filter(s => CRYPTO_PAIRS.includes(s.pair)),
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
