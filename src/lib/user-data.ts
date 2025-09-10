// Simple client-side user data store using localStorage.
// This is a lightweight mock persistence used by BalanceContext to simulate user balances and investments.

import type { Investment, ContractTrade, SpotTrade, CommissionLog } from '@/types';


export type UserData = {
  balances: { [asset: string]: { available: number; frozen: number } };
  investments: Investment[];
  activeContractTrades: ContractTrade[];
  historicalTrades: (SpotTrade | ContractTrade)[];
  commissionLogs: CommissionLog[];
  lastCheckInDate?: string;
  consecutiveCheckIns?: number;
};

const STORAGE_KEY_PREFIX = 'srfinance:user:';

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
  XAU: { available: 0, frozen: 0 },
  USD: { available: 0, frozen: 0 },
  EUR: { available: 0, frozen: 0 },
  GBP: { available: 0, frozen: 0 },
};

function getStorageKey(userId: string) {
  return `${STORAGE_KEY_PREFIX}${userId}`;
}

export function getUserData(userId: string): UserData {
  if (typeof window === 'undefined') {
    // SSR safety: return empty defaults
    return {
      balances: { ...INITIAL_BALANCES },
      investments: [],
      activeContractTrades: [],
      historicalTrades: [],
      commissionLogs: [],
      lastCheckInDate: undefined,
      consecutiveCheckIns: 0,
    };
  }
  const key = getStorageKey(userId);
  const raw = window.localStorage.getItem(key);
  if (!raw) {
    const fresh: UserData = {
      balances: { ...INITIAL_BALANCES },
      investments: [],
      activeContractTrades: [],
      historicalTrades: [],
      commissionLogs: [],
      lastCheckInDate: undefined,
      consecutiveCheckIns: 0,
    };
    window.localStorage.setItem(key, JSON.stringify(fresh));
    return fresh;
  }
  try {
    return JSON.parse(raw) as UserData;
  } catch {
    const fresh: UserData = {
      balances: { ...INITIAL_BALANCES },
      investments: [],
      activeContractTrades: [],
      historicalTrades: [],
      commissionLogs: [],
      lastCheckInDate: undefined,
      consecutiveCheckIns: 0,
    };
    window.localStorage.setItem(key, JSON.stringify(fresh));
    return fresh;
  }
}

export function saveUserData(userId: string, data: UserData) {
  if (typeof window === 'undefined') return;
  const key = getStorageKey(userId);
  window.localStorage.setItem(key, JSON.stringify(data));
}
