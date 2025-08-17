// /src/app/api/market-data/route.ts
import { NextResponse } from 'next/server';
import axios from 'axios';

const COINGECKO_API_KEY = process.env.COINGECKO_API_KEY;
const API_URL = 'https://api.coingecko.com/api/v3';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const endpoint = searchParams.get('endpoint');
  const ids = searchParams.get('ids');
  const pairId = searchParams.get('pairId');

  if (!COINGECKO_API_KEY) {
    return NextResponse.json({ error: 'API key is not configured' }, { status: 500 });
  }

  const headers = {
    'x-cg-demo-api-key': COINGECKO_API_KEY,
  };

  try {
    let response;
    if (endpoint === 'markets') {
      if (!ids) {
        return NextResponse.json({ error: 'Missing "ids" parameter for markets endpoint' }, { status: 400 });
      }
      response = await axios.get(`${API_URL}/coins/markets`, {
        params: {
          vs_currency: 'usd',
          ids: ids,
          order: 'market_cap_desc',
          per_page: ids.split(',').length,
          page: 1,
          sparkline: false,
          price_change_percentage: '24h',
        },
        headers,
      });
    } else if (endpoint === 'ohlc') {
      if (!pairId) {
        return NextResponse.json({ error: 'Missing "pairId" parameter for ohlc endpoint' }, { status: 400 });
      }
      response = await axios.get(`${API_URL}/coins/${pairId}/ohlc`, {
        params: {
          vs_currency: 'usd',
          days: '1',
        },
        headers,
      });
    } else {
      return NextResponse.json({ error: 'Invalid endpoint' }, { status: 400 });
    }
    
    return NextResponse.json(response.data);

  } catch (error) {
    console.error('API request failed:', error);
    if (axios.isAxiosError(error) && error.response) {
       return NextResponse.json({ error: 'Failed to fetch from CoinGecko', details: error.response.data }, { status: error.response.status });
    }
    return NextResponse.json({ error: 'An unknown error occurred' }, { status: 500 });
  }
}
