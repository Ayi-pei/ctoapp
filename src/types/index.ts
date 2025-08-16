



// Represents a single point in a price chart
export type PriceDataPoint = {
    time: string;
    price: number;
};

// Represents a single point for a candlestick chart (OHLC)
export type KlineDataPoint = {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
};


// Represents a summary of market data for a trading pair
export type MarketSummary = {
    pair: string;
    price: number;
    change: number;
    volume: number;
    high: number;
    low: number;
};


// Main set of available trading pairs
export const availablePairs = ['BTC/USDT', 'ETH/USDT', 'SOL/USDT', 'XRP/USDT', 'LTC/USDT', 'BNB/USDT', 'MATIC/USDT', 'DOGE/USDT', 'ADA/USDT', 'SHIB/USDT', 'XAU/USD', 'EUR/USD', 'GBP/USD'];

// Represents a user's profile, mirroring the public.users table
export type User = {
    id: string;
    username: string;
    nickname: string;
    email: string;
    inviter_id: string | null;
    is_admin: boolean;
    is_test_user: boolean;
    is_frozen: boolean;
    invitation_code: string;
    created_at: string;
    password?: string; // For mock DB
    credit_score: number;
    last_login_at?: string;
};

export type Announcement = {
  id: string;
  title: string;
  content: string;
  date: string;
  user_id?: string; // Optional: for user-specific announcements
  is_read?: boolean; // Optional: for user to mark as read
}


// Represents an order in the order book
export type Order = {
  price: number;
  size: number;
  total: number;
};

// Represents a market-wide trade event for the history view
export type MarketTrade = {
  id: string;
  type: 'buy' | 'sell';
  price: number;
  amount: number;
  time: string;
};


// Represents a user's contract trade
export type ContractTrade = {
  id: string;
  user_id: string;
  trading_pair: string;
  type: 'buy' | 'sell'; 
  amount: number; 
  entry_price: number;
  settlement_time: string;
  period: number; 
  profit_rate: number;
  status: 'active' | 'settled';
  settlement_price?: number;
  outcome?: 'win' | 'loss';
  profit?: number; 
  created_at: string;
  orderType: 'contract'; // Frontend property
};

// Represents a user's spot trade
export type SpotTrade = {
    id: string;
    user_id: string;
    trading_pair: string;
    type: 'buy' | 'sell';
    base_asset: string;
    quote_asset: string;
    amount: number; 
    total: number; 
    status: 'filled' | 'cancelled';
    created_at: string;
    orderType: 'spot'; // Frontend property
}


// Represents a user's deposit, withdrawal, or admin adjustment
export type Transaction = {
  id: string;
  user_id: string; 
  type: 'deposit' | 'withdrawal' | 'adjustment';
  asset: string;
  amount: number;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string; 
  address?: string; 
  transaction_hash?: string;
  // Properties for frontend rendering, optional
  user?: { username: string };
};

// Represents a user's password reset request submitted to admin
export type PasswordResetRequest = {
  id: string;
  user_id: string;
  type: 'password_reset';
  new_password: string; // The new password to be set
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  user?: { username: string };
};

export type AnyRequest = Transaction | PasswordResetRequest;


// Represents a user's investment in a product
export type Investment = {
    id: string;
    user_id: string;
    product_name: string;
    amount: number; // principal
    created_at: string;
    settlement_date: string;
    daily_rate: number;
    period: number;
    status: 'active' | 'settled';
    profit?: number;
};


// Represents a commission log entry
export type CommissionLog = {
    id: string;
    upline_user_id: string;
    source_user_id: string;
    source_username: string;
    source_level: number;
    trade_amount: number;
    commission_rate: number;
    commission_amount: number;
    created_at: string;
};

// Represents a member in the downline/team - now it is just the User type
// We keep the alias for clarity in components
export type DownlineMember = User & { level?: number };


// Represents the JSON response from the register_new_user function
export type RegisterUserResponse = {
    status: 'success' | 'error';
    user_id?: string;
    message: string;
};
