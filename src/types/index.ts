

export const availablePairs = ['BTC/USDT', 'ETH/USDT', 'SOL/USDT', 'XRP/USDT', 'LTC/USDT', 'BNB/USDT', 'MATIC/USDT', 'DOGE/USDT', 'ADA/USDT', 'SHIB/USDT', 'XAU/USD', 'EUR/USD', 'GBP/USD'];

export type Order = {
  price: number;
  size: number;
  total: number;
};

// Represents a market-wide trade event for the history
export type MarketTrade = {
  id: string;
  type: 'buy' | 'sell';
  price: number;
  amount: number;
  time: string;
};


// Represents a user's contract trade action
export type ContractTrade = {
  id: string;
  userId: string;
  tradingPair: string;
  orderType: 'contract';
  type: 'buy' | 'sell'; // buy for long, sell for short
  amount: number; // This is the amount in USDT for the contract
  entryPrice: number;
  settlementTime: number; // a timestamp in ms
  period: number; // in seconds
  profitRate: number; // e.g., 0.85 for 85%
  status: 'active' | 'settled';
  // Fields below are added after settlement
  settlementPrice?: number;
  outcome?: 'win' | 'loss';
  profit?: number; // can be negative
  createdAt: string;
};

// Represents a user's spot trade action
export type SpotTrade = {
    id: string;
    userId: string;
    tradingPair: string;
    orderType: 'spot';
    type: 'buy' | 'sell';
    baseAsset: string;
    quoteAsset: string;
    amount: number; // amount of base asset
    total: number; // total in quote asset
    status: 'filled' | 'cancelled';
    createdAt: string;
}


export type PriceDataPoint = {
  time: string;
  price: number;
};

export type MarketSummary = {
    pair: string;
    price: number;
    change: number;
    volume: number;
    high: number;
    low: number;
};

// Represents a user's deposit or withdrawal request
export type Transaction = {
  id: string;
  userId: string; // username
  type: 'deposit' | 'withdrawal';
  asset: string;
  amount: number;
  address?: string; // for withdrawals
  transactionHash?: string; // for deposits as proof
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string; // ISO date string
};

// Represents a user's password reset request
export type PasswordResetRequest = {
  id: string;
  userId: string;
  type: 'password_reset';
  newPassword: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string; // ISO date string
};


export type CommissionLog = {
    id: string;
    uplineUsername: string; // User receiving the commission
    sourceUsername: string; // User who generated the commission
    sourceLevel: number; // 1, 2, or 3
    tradeAmount: number;
    commissionRate: number;
    commissionAmount: number;
    createdAt: string; // ISO date string
}

export type Investment = {
    id: string;
    productName: string;
    amount: number;
    date: string;
}
