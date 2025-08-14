

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
  user_id: string;
  trading_pair: string;
  order_type: 'contract';
  type: 'buy' | 'sell'; // buy for long, sell for short
  amount: number; // This is the amount in USDT for the contract
  entry_price: number;
  settlement_time: string; // ISO date string
  period: number; // in seconds
  profit_rate: number; // e.g., 0.85 for 85%
  status: 'active' | 'settled';
  // Fields below are added after settlement
  settlement_price?: number;
  outcome?: 'win' | 'loss';
  profit?: number; // can be negative
  created_at: string;
  // Properties for frontend rendering
  userId: string;
  tradingPair: string;
  orderType: 'contract';
  createdAt: string;
};

// Represents a user's spot trade action
export type SpotTrade = {
    id: string;
    user_id: string;
    trading_pair: string;
    order_type: 'spot';
    type: 'buy' | 'sell';
    base_asset: string;
    quote_asset: string;
    amount: number; // amount of base asset
    total: number; // total in quote asset
    status: 'filled' | 'cancelled';
    created_at: string;
    // Properties for frontend rendering
    userId?: string;
    tradingPair: string;
    orderType: 'spot';
    baseAsset: string;
    quoteAsset: string;
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
  user_id: string; // uuid
  userId?: string; // username, optional for rendering
  type: 'deposit' | 'withdrawal' | 'adjustment';
  asset: string;
  amount: number;
  address?: string; // for withdrawals
  transaction_hash?: string; // for deposits as proof
  transactionHash?: string; // for deposits as proof (frontend)
  status: 'pending' | 'approved' | 'rejected';
  created_at: string; // ISO date string
  createdAt: string; // ISO date string (frontend)
};

// Represents a user's password reset request
export type PasswordResetRequest = {
  id: string;
  user_id: string;
  type: 'password_reset';
  new_password: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string; // ISO date string
  // Properties for frontend rendering
  userId: string;
  newPassword: string;
  createdAt: string;
};


export type Investment = {
    id: string;
    productName: string;
    amount: number;
    date: string;
}

    
