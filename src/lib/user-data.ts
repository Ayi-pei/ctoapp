
"use client";

import { ContractTrade, SpotTrade, Investment, CommissionLog } from '@/types';

const INITIAL_BALANCES_USER: { [key: string]: { available: number; frozen: number } } = {
    USDT: { available: 10000, frozen: 0 },
    BTC: { available: 0.1, frozen: 0 },
    ETH: { available: 2, frozen: 0 },
    SOL: { available: 20, frozen: 0 },
    XRP: { available: 1000, frozen: 0 },
};

export interface UserData {
  balances: { [key: string]: { available: number; frozen: number } };
  investments: Investment[];
  activeContractTrades: ContractTrade[];
  historicalTrades: (SpotTrade | ContractTrade)[];
  commissionLogs: CommissionLog[];
  lastCheckInDate?: string;
  consecutiveCheckIns?: number;
}

const defaultUserData: UserData = {
    balances: INITIAL_BALANCES_USER,
    investments: [],
    activeContractTrades: [],
    historicalTrades: [],
    commissionLogs: [],
    lastCheckInDate: undefined,
    consecutiveCheckIns: 0,
};

export function getUserData(userId: string): UserData {
    if (typeof window === 'undefined') {
        return defaultUserData;
    }
    try {
        const item = window.localStorage.getItem(`user-data-${userId}`);
        if (!item) {
            // For new users, let's also give them a default set of balances
             const initialData = { ...defaultUserData, balances: INITIAL_BALANCES_USER };
             window.localStorage.setItem(`user-data-${userId}`, JSON.stringify(initialData));
             return initialData;
        }
        return JSON.parse(item);
    } catch (error) {
        console.error("Error reading from local storage", error);
        return defaultUserData;
    }
}

export function saveUserData(userId: string, data: UserData): void {
     if (typeof window === 'undefined') {
        return;
    }
    try {
        const item = JSON.stringify(data);
        window.localStorage.setItem(`user-data-${userId}`, item);
    } catch (error) {
        console.error("Error saving to local storage", error);
    }
}
