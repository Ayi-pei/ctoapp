
import { NextResponse } from 'next/server';
import axios from 'axios';

const COINGECKO_API_KEY = process.env.COINGECKO_API_KEY;
const COINGECKO_API_URL = 'https://api.coingecko.com/api/v3';

async function fetchMarkets(ids: string) {
  if (!COINGECKO_API_KEY) {
    throw new Error('CoinGecko API key is not configured');
  }
  const headers = { 'x-cg-demo-api-key': COINGECKO_API_KEY };
  const response = await axios.get(`${COINGECKO_API_URL}/coins/markets`, {
    params: {
      vs_currency: 'usd',
      ids,
      order: 'market_cap_desc',
      per_page: ids.split(',').length.toString(),
      page: '1',
      sparkline: 'false',
      price_change_percentage: '24h',
    },
    headers
  });
  return response.data;
}

async function fetchOhlc(pairId: string) {
  if (!COINGECKO_API_KEY) {
    throw new Error('CoinGecko API key is not configured');
  }
  const headers = { 'x-cg-demo-api-key': COINGECKO_API_KEY };
  const response = await axios.get(`${COINGECKO_API_URL}/coins/${pairId}/ohlc`, {
    params: {
      vs_currency: 'usd',
      days: '1',
    },
    headers
  });
  return response.data;
}


export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const source = searchParams.get('source');
  const endpoint = searchParams.get('endpoint');
  
  if (source !== 'coingecko') {
    return NextResponse.json({ error: 'Invalid or unsupported data source' }, { status: 400 });
  }

  try {
    let data;
    if (endpoint === 'markets') {
        const ids = searchParams.get('ids');
        if (!ids) {
             return NextResponse.json({ error: 'Missing ids parameter for markets endpoint' }, { status: 400 });
        }
        data = await fetchMarkets(ids);

    } else if (endpoint === 'ohlc') {
        const pairId = searchParams.get('pairId');
        if (!pairId) {
            return NextResponse.json({ error: 'Missing pairId parameter for ohlc endpoint' }, { status: 400 });
        }
        data = await fetchOhlc(pairId);
    } else {
        return NextResponse.json({ error: 'Invalid endpoint or missing parameters for coingecko' }, { status: 400 });
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
