
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
  type: 'buy' | 'sell';
  amount: number; // This is the amount in USDT for the contract
};

// Represents a user's spot trade action
export type SpotTrade = {
    type: 'buy' | 'sell';
    baseAsset: string;
    quoteAsset: string;
    amount: number; // amount of base asset
    total: number; // total in quote asset
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
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string; // ISO date string
};
