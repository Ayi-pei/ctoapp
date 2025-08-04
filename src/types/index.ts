
export type Order = {
  price: number;
  size: number;
  total: number;
};

export type Trade = {
  id: string;
  type: 'buy' | 'sell';
  price: number;
  amount: number;
  time: string;
};

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
