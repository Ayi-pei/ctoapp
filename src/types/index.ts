

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
  trading_pair?: string; // Optional because it might be contextually known
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

// A secure version of the User type, without the password.
// This should be used in the frontend application state.
export type SecureUser = Omit<User, 'password'>;


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
    // Staking requirement fields
    stakingAsset?: string;
    stakingAmount?: number;
    // Hourly product fields
    duration_hours?: number;
    hourly_rate?: number;
};


// Represents a generic reward/commission log entry
export type RewardLog = {
    id: string;
    user_id: string;
    type: 'dailyTask' | 'team' | 'event' | 'system';
    amount: number;
    source_id?: string; // e.g., taskId, orderId
    source_username?: string; // e.g. the downline user who generated the commission
    source_level?: number;
    created_at: string;
    description?: string;
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

export type TaskTriggerType = 'contract_trade' | 'spot_trade' | 'investment';

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
  trigger: TaskTriggerType;
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

// Represents an action log for admin operations
export type ActionLog = {
    id: string;
    entity_type: 'request' | 'task_completion' | 'activity_participation' | 'reward';
    entity_id: string;
    action: 'approve' | 'reject' | 'update' | 'delete' | 'create' | 'user_complete';
    operator_id: string;
    operator_username: string;
    created_at: string;
    details: string;
};

// Represents a P2P Swap Order
export type SwapOrder = {
    id: string;
    userId: string;       // The user who created the order (seller/maker)
    username: string;
    fromAsset: string;
    fromAmount: number;
    toAsset: string;
    toAmount: number;
    status: 'open' | 'pending_payment' | 'pending_confirmation' | 'completed' | 'cancelled' | 'disputed';
    createdAt: string;
    takerId?: string;     // The user who accepted the order (buyer/taker)
    takerUsername?: string;
    paymentProofUrl?: string; // Data URL of the uploaded image
};

// Represents a single option contract (call or put)
export type OptionContract = {
  contract_id: string;
  strike_price: number;
  last_price: number;
  bid: number;
  ask: number;
  change: number;
  change_percent: number;
  volume: number;
  open_interest: number;
  implied_volatility: number;
  in_the_money: boolean;
  // Greeks
  delta: number;
  gamma: number;
  theta: number;
  vega: number;
  rho: number;
};

// Represents the full options chain for a specific expiration date
export type OptionsChain = {
    expiration_date: string;
    calls: OptionContract[];
    puts: OptionContract[];
};

// Navigation item type
export type NavItem = {
    href: string;
    label: string;
    icon: React.ElementType;
    subItems?: NavItem[];
};
