
"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import axios from 'axios';
import { OptionsChain, OptionContract } from '@/types';

// --- Default/Mock Data ---
const generateMockGreeks = () => ({
  delta: parseFloat((Math.random() * (0.8 - 0.2) + 0.2).toFixed(4)),
  gamma: parseFloat((Math.random() * 0.1).toFixed(4)),
  theta: parseFloat((-Math.random() * 0.05).toFixed(4)),
  vega: parseFloat((Math.random() * 0.1).toFixed(4)),
  rho: parseFloat((Math.random() * 0.02).toFixed(4)),
});

const generateMockContract = (strike: number, type: 'call' | 'put', underlyingPrice: number): OptionContract => {
  const price = Math.max(0.01, parseFloat((Math.random() * 5).toFixed(2)));
  const change = parseFloat(((Math.random() - 0.5) * 2).toFixed(2));
  return {
    contract_id: `${type}-${strike}-${Date.now()}`,
    strike_price: strike,
    last_price: price,
    bid: parseFloat((price * 0.98).toFixed(2)),
    ask: parseFloat((price * 1.02).toFixed(2)),
    change: change,
    change_percent: parseFloat(((change / price) * 100).toFixed(2)),
    volume: Math.floor(Math.random() * 1000),
    open_interest: Math.floor(Math.random() * 5000),
    implied_volatility: parseFloat((Math.random() * (0.8 - 0.3) + 0.3).toFixed(4)),
    in_the_money: type === 'call' ? underlyingPrice > strike : underlyingPrice < strike,
    ...generateMockGreeks(),
  };
};

const generateMockChain = (symbol: string): OptionsChain[] => {
  const underlyingPrice = symbol === 'IBM' ? 170 : symbol === 'AAPL' ? 210 : symbol === 'TSLA' ? 180 : 500;
  const strikeStep = symbol === 'IBM' ? 5 : symbol === 'AAPL' ? 10 : symbol === 'TSLA' ? 10 : 25;
  const baseStrike = Math.floor(underlyingPrice / strikeStep) * strikeStep;
  
  const chains: OptionsChain[] = [];
  for (let i = 1; i <= 3; i++) {
    const expirationDate = new Date();
    expirationDate.setDate(expirationDate.getDate() + i * 7);
    const strikes = Array.from({length: 5}, (_, j) => baseStrike + (j - 2) * strikeStep);
    chains.push({
      expiration_date: expirationDate.toISOString().split('T')[0],
      calls: strikes.map(strike => generateMockContract(strike, 'call', underlyingPrice)),
      puts: strikes.map(strike => generateMockContract(strike, 'put', underlyingPrice)),
    });
  }
  return chains;
};

// --- Context Definition ---
interface OptionsContextType {
  optionsChain: OptionsChain[];
  isLoading: boolean;
  error: string | null;
  selectedSymbol: string;
  changeSymbol: (symbol: string) => void;
  availableSymbols: string[];
}

const OptionsContext = createContext<OptionsContextType | undefined>(undefined);

export function OptionsProvider({ children }: { children: ReactNode }) {
  const [optionsChain, setOptionsChain] = useState<OptionsChain[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedSymbol, setSelectedSymbol] = useState('IBM');
  const availableSymbols = ['IBM', 'AAPL', 'TSLA', 'MSFT'];

  // --- Data Fetching and Simulation ---
  const fetchOptionsData = useCallback(async (symbol: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await axios.get('/api/alpha-vantage', {
        params: {
          symbol: symbol,
          function: 'HISTORICAL_OPTIONS'
        }
      });
      
      if (response.data && response.data.data && Array.isArray(response.data.data) && response.data.data.length > 0) {
        setOptionsChain(response.data.data);
      } else {
        // Fallback to mock data if API fails or returns empty/invalid data
        console.warn(`Failed to fetch real options data for ${symbol}, falling back to mock data.`);
        setOptionsChain(generateMockChain(symbol));
      }
    } catch (e) {
      console.error('Error fetching options data:', e);
      setError(`Could not fetch options data for ${symbol}.`);
      setOptionsChain(generateMockChain(symbol)); // Always provide mock data on error
    } finally {
      setIsLoading(false);
    }
  }, []);

  // --- Effects ---
  // Initial fetch and hourly refetch
  useEffect(() => {
    fetchOptionsData(selectedSymbol);
    const interval = setInterval(() => fetchOptionsData(selectedSymbol), 60 * 60 * 1000); // 1 hour
    return () => clearInterval(interval);
  }, [selectedSymbol, fetchOptionsData]);

  const simulateContractChange = (contract: OptionContract): OptionContract => {
    const change = (Math.random() - 0.5) * 0.05 * contract.last_price;
    const newPrice = Math.max(0.01, contract.last_price + change);
    return {
      ...contract,
      last_price: newPrice,
      change: change,
      change_percent: (change / contract.last_price) * 100,
      bid: Math.max(0.01, newPrice * (1 - Math.random() * 0.02)),
      ask: newPrice * (1 + Math.random() * 0.02),
      implied_volatility: Math.max(0, contract.implied_volatility + (Math.random() - 0.5) * 0.01),
    };
  };

  // High-frequency simulation
  useEffect(() => {
    const simulationInterval = setInterval(() => {
      setOptionsChain(prevChain =>
        prevChain.map(chain => ({
          ...chain,
          calls: Array.isArray(chain.calls) ? chain.calls.map(c => simulateContractChange(c)) : [],
          puts: Array.isArray(chain.puts) ? chain.puts.map(p => simulateContractChange(p)) : [],
        }))
      );
    }, 3000); // Simulate every 3 seconds

    return () => clearInterval(simulationInterval);
  }, []);

  const changeSymbol = (symbol: string) => {
    setSelectedSymbol(symbol);
  };

  const value = {
    optionsChain,
    isLoading,
    error,
    selectedSymbol,
    changeSymbol,
    availableSymbols,
  };

  return (
    <OptionsContext.Provider value={value}>
      {children}
    </OptionsContext.Provider>
  );
}

export function useOptions() {
  const context = useContext(OptionsContext);
  if (context === undefined) {
    throw new Error('useOptions must be used within an OptionsProvider');
  }
  return context;
}
