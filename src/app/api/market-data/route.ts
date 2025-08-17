
import { NextResponse } from 'next/server';
import axios from 'axios';

const COINGECKO_API_KEY = process.env.COINGECKO_API_KEY;
const COINGECKO_API_URL = 'https://api.coingecko.com/api/v3';

const COINPAPRIKA_API_URL = 'https://api.coinpaprika.com/v1';

// --- CoinGecko Functions ---

async function fetchFromCoinGecko(endpoint: string, params: Record<string, string>) {
  if (!COINGECKO_API_KEY) {
    throw new Error('CoinGecko API key is not configured');
  }
  const headers = { 'x-cg-demo-api-key': COINGECKO_API_KEY };
  const response = await axios.get(`${COINGECKO_API_URL}${endpoint}`, { params, headers });
  return response.data;
}

async function fetchCoinGeckoMarkets(ids: string) {
    const data = await fetchFromCoinGecko('/coins/markets', {
        vs_currency: 'usd',
        ids,
        order: 'market_cap_desc',
        per_page: ids.split(',').length.toString(),
        page: '1',
        sparkline: 'false',
        price_change_percentage: '24h',
    });
    // Adapt data structure
    return data.map((d: any) => ({
        pair: `${d.symbol.toUpperCase()}/USDT`, // Reconstruct the pair name
        price: d.current_price,
        change: d.price_change_percentage_24h,
        volume: d.total_volume,
        high: d.high_24h,
        low: d.low_24h,
        icon: d.image,
    }));
}

async function fetchCoinGeckoOhlc(pairId: string) {
    const data = await fetchFromCoinGecko(`/coins/${pairId}/ohlc`, {
        vs_currency: 'usd',
        days: '1',
    });
    // Adapt data structure
    return data.map((d: number[]) => ({
        time: d[0],
        open: d[1],
        high: d[2],
        low: d[3],
        close: d[4],
    }));
}

// --- Coinpaprika Functions ---

async function fetchFromCoinpaprika(endpoint: string, params: Record<string, string> = {}) {
    const response = await axios.get(`${COINPAPRIKA_API_URL}${endpoint}`, { params });
    return response.data;
}

async function fetchCoinpaprikaMarkets() {
    const data = await fetchFromCoinpaprika('/tickers');
    // Adapt data structure
    const cryptoData = data.filter((d: any) => d.rank > 0 && d.rank <= 20); // Limit to top 20 for performance
    
    return cryptoData.map((d: any) => ({
        pair: `${d.symbol}/USDT`,
        price: d.quotes.USD.price,
        change: d.quotes.USD.percent_change_24h,
        volume: d.quotes.USD.volume_24h,
        high: null, // Coinpaprika tickers don't provide 24h high/low
        low: null,
        icon: `https://static.coinpaprika.com/coin/${d.id}/logo.png`,
    }));
}

async function fetchCoinpaprikaOhlc(pairId: string) {
    const data = await fetchFromCoinpaprika(`/coins/${pairId}/ohlcv/historical`, {
        quote: 'usd',
        interval: '5m',
    });
    // Adapt data structure
    return data.map((d: any) => ({
        time: new Date(d.time_open).getTime(),
        open: d.open,
        high: d.high,
        low: d.low,
        close: d.close,
    }));
}


// --- Main Handler ---

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const source = searchParams.get('source');
  const endpoint = searchParams.get('endpoint');
  
  if (!source) {
    return NextResponse.json({ error: 'Missing source parameter' }, { status: 400 });
  }

  try {
    let data;

    if (endpoint === 'markets') {
      if (source === 'coingecko') {
        const ids = searchParams.get('ids');
        if (!ids) return NextResponse.json({ error: 'Missing ids parameter for coingecko markets' }, { status: 400 });
        data = await fetchCoinGeckoMarkets(ids);
      } else if (source === 'coinpaprika') {
        data = await fetchCoinpaprikaMarkets();
      } else {
        return NextResponse.json({ error: `Unsupported source for markets: ${source}` }, { status: 400 });
      }

    } else if (endpoint === 'ohlc') {
      const pairId = searchParams.get('pairId');
      if (!pairId) return NextResponse.json({ error: 'Missing pairId parameter for ohlc' }, { status: 400 });
      
      if (source === 'coingecko') {
        data = await fetchCoinGeckoOhlc(pairId);
      } else if (source === 'coinpaprika') {
        data = await fetchCoinpaprikaOhlc(pairId);
      } else {
         return NextResponse.json({ error: `Unsupported source for ohlc: ${source}` }, { status: 400 });
      }

    } else {
        return NextResponse.json({ error: 'Invalid endpoint specified' }, { status: 400 });
    }
    
    return NextResponse.json(data);

  } catch (error) {
    console.error(`API request failed for source ${source}:`, error);
    if (axios.isAxiosError(error) && error.response) {
       return NextResponse.json({ error: `Failed to fetch from ${source}`, details: error.response.data }, { status: error.response.status });
    }
    return NextResponse.json({ error: 'An unknown error occurred' }, { status: 500 });
  }
}
