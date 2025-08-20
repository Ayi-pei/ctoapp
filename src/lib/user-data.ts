
import { Investment, CommissionLog, ContractTrade, SpotTrade } from '@/types';

const INITIAL_BALANCES: { [key: string]: { available: number; frozen: number } } = {
    USDT: { available: 0, frozen: 0 },
    BTC: { available: 0, frozen: 0 },
    ETH: { available: 0, frozen: 0 },
    SOL: { available: 0, frozen: 0 },
    XRP: { available: 0, frozen: 0 },
    LTC: { available: 0, frozen: 0 },
    BNB: { available: 0, frozen: 0 },
    MATIC: { available: 0, frozen: 0 },
    DOGE: { available: 0, frozen: 0 },
    ADA: { available: 0, frozen: 0 },
    SHIB: { available: 0, frozen: 0 },
    AVAX: { available: 0, frozen: 0 },
    LINK: { available: 0, frozen: 0 },
    DOT: { available: 0, frozen: 0 },
    UNI: { available: 0, frozen: 0 },
    TRX: { available: 0, frozen: 0 },
    XLM: { available: 0, frozen: 0 },
    VET: { available: 0, frozen: 0 },
    EOS: { available: 0, frozen: 0 },
    FIL: { available: 0, frozen: 0 },
    ICP: { available: 0, frozen: 0 },
};

export type UserData = {
    balances: { [key: string]: { available: number; frozen: number } };
    investments: Investment[];
    activeContractTrades: ContractTrade[];
    historicalTrades: (SpotTrade | ContractTrade)[];
    commissionLogs: CommissionLog[];
    lastCheckInDate?: string;
    consecutiveCheckIns?: number;
};

const getDefaultUserData = (): UserData => ({
    balances: JSON.parse(JSON.stringify(INITIAL_BALANCES)), // Deep copy
    investments: [],
    activeContractTrades: [],
    historicalTrades: [],
    commissionLogs: [],
    lastCheckInDate: undefined,
    consecutiveCheckIns: 0,
});


export function getUserData(userId: string): UserData {
    if (typeof window === 'undefined') {
        return getDefaultUserData();
    }
    const userStorageKey = `tradeflow_user_${userId}`;
    const storedData = localStorage.getItem(userStorageKey);
    if (storedData) {
        try {
            const parsedData = JSON.parse(storedData);
            // Merge with defaults to ensure all properties exist
            return {
                ...getDefaultUserData(),
                ...parsedData,
                balances: {
                    ...getDefaultUserData().balances,
                    ...(parsedData.balances || {})
                }
            };
        } catch (e) {
            console.error(`Failed to parse user data for ${userId}`, e);
            return getDefaultUserData();
        }
    }
    return getDefaultUserData();
}

export function saveUserData(userId: string, data: UserData) {
     if (typeof window === 'undefined') {
        return;
    }
    const userStorageKey = `tradeflow_user_${userId}`;
    try {
        localStorage.setItem(userStorageKey, JSON.stringify(data));
    } catch (e) {
        console.error(`Failed to save user data for ${userId}`, e);
    }
}
