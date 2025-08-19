
// Represents a single point in a price chart
export type PriceDataPoint = {
    time: string;
    price: number;
};

// Represents a single point for a K-line chart (closing price)
export type KlineDataPoint = {
    time: string;
    price: number;
};

// Represents a single point for a candlestick chart (OHLC)
export type OHLC = {
  time: number;
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
    icon?: string; // Optional icon URL from API
};


// Main set of available trading pairs
export const availablePairs = [
    'BTC/USDT', 'ETH/USDT', 'SOL/USDT', 'XRP/USDT', 'LTC/USDT',
    'BNB/USDT', 'MATIC/USDT', 'DOGE/USDT', 'ADA/USDT', 'SHIB/USDT',
    'AVAX/USDT', 'LINK/USDT', 'DOT/USDT', 'UNI/USDT', 'TRX/USDT',
    'XLM/USDT', 'VET/USDT', 'EOS/USDT', 'FIL/USDT', 'ICP/USDT',
    'XAU/USD', 'EUR/USD', 'GBP/USD',
    'OIL/USD', 'XAG/USD', 'NAS100/USD'
];

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
    avatar_url?: string;
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
  trading_pair: string;
};

// Represents a raw trade event from a WebSocket stream
export type TradeRaw = {
    stream: string;
    price: number;
    quantity: number;
    timestamp: number;
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
    price: number;
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

// For hourly investment products
export type InvestmentTier = {
    hours: number;
    rate: number; // Hourly rate
};


// Represents a user's investment in a product
export type Investment = {
    id: string;
    user_id: string;
    product_name: string;
    amount: number; // principal
    created_at: string;
    settlement_date: string;
    status: 'active' | 'settled';
    category: 'staking' | 'finance';
    profit?: number;
    // For different product types
    productType?: 'daily' | 'hourly';
    // Daily product fields
    daily_rate?: number;
    period?: number;
    // Hourly product fields
    duration_hours?: number;
    hourly_rate?: number;
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

// Represents a daily task configured by an admin
export type DailyTask = {
  id: string;
  title: string;
  description: string;
  reward: number; // USDT reward
  reward_type: 'usdt' | 'credit_score';
  link: string; // e.g. /trade?tab=contract
  imgSrc?: string;
  status: 'published' | 'draft';
};


// Represents the completion state of a task for a user for a specific day
export type UserTaskState = {
  taskId: string;
  date: string; // YYYY-MM-DD
  completed: boolean;
};

// Represents a limited-time activity configured by an admin
export type LimitedTimeActivity = {
    id: string;
    title: string;
    description: string;
    rewardRule: string;
    howToClaim: string;
    expiresAt: string; // ISO date string
    imgSrc?: string;
    status: 'published' | 'draft';
    createdAt: string; // ISO date string
};
