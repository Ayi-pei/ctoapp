
"use client";

import { useState, useEffect, useCallback } from 'react';
import { Trade } from '@/types';

export const useBalance = (initialBalance: number) => {
    const [balance, setBalance] = useState(initialBalance);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const storedBalance = localStorage.getItem('userBalance');
        if (storedBalance) {
            setBalance(parseFloat(storedBalance));
        }
        setIsLoading(false);
    }, []);

    useEffect(() => {
        if (!isLoading) {
            localStorage.setItem('userBalance', balance.toString());
        }
    }, [balance, isLoading]);

    const placeTrade = useCallback((trade: Omit<Trade, 'id' | 'time' | 'price'>) => {
        setBalance(prevBalance => prevBalance - trade.amount);
        // Here you would also add logic to handle winning/losing the trade after the period
        // For simulation, we are just deducting the amount.
    }, []);

    return { balance, placeTrade, isLoading };
};
