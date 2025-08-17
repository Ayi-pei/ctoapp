// /src/app/api/market-data/route.ts
import { NextResponse } from 'next/server';
import axios from 'axios';

const COINGECKO_API_KEY = process.env.COINGECKO_API_KEY;
const TATUM_API_KEY = process.env.TATUM_API_KEY;

const COINGECKO_API_URL = 'https://api.coingecko.com/api/v3';
const TATUM_API_URL = 'https://api.tatum.io/v4';

async function fetchFromCoinGecko(endpoint: string, params: Record<string, string>) {
  if (!COINGECKO_API_KEY) {
    throw new Error('CoinGecko API key is not configured');
  }
  const headers = { 'x-cg-demo-api-key': COINGECKO_API_KEY };
  const response = await axios.get(`${COINGECKO_API_URL}${endpoint}`, { params, headers });
  return response.data;
}

async function fetchFromTatum(endpoint: string, params: Record<string, string>) {
  if (!TATUM_API_KEY) {
    throw new Error('Tatum API key is not configured');
  }
  const headers = { 'x-api-key': TATUM_API_KEY };
  
  if (endpoint.startsWith('/coins/markets')) {
     const ids = params.ids.split(',');
     const responses = await Promise.all(ids.map(id => 
        axios.get(`${TATUM_API_URL}/market/price/${id.toUpperCase()}`, { headers }).catch(err => {
          console.warn(`Tatum failed for ${id}:`, err.message);
          return null; // Return null on failure to avoid breaking Promise.all
        })
     ));
     
     // Normalize Tatum response to look like CoinGecko's
     return responses
      .filter(res => res !== null) // Filter out failed requests
      .map((res, index) => ({
         id: ids[index], // This might be slightly off if some requests fail, but should be okay for now
         current_price: res.data.value,
         price_change_percentage_24h: 0, // Not available in this Tatum endpoint
         total_volume: 0, // Not available
         high_24h: 0, // Not available
         low_24h: 0, // Not available
         image: '', // Not available
     }));
  }
  return [];
}


export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const source = searchParams.get('source') || 'coingecko'; // Default to coingecko
  const endpoint = searchParams.get('endpoint');
  const ids = searchParams.get('ids');
  const pairId = searchParams.get('pairId');

  const params: Record<string, string> = {};
  if (ids) params.ids = ids;
  if (pairId) params.pairId = pairId;


  try {
    let data;
    switch (source) {
      case 'coingecko':
        if (endpoint === 'markets' && ids) {
             data = await fetchFromCoinGecko('/coins/markets', {
                vs_currency: 'usd',
                ids,
                order: 'market_cap_desc',
                per_page: ids.split(',').length.toString(),
                page: '1',
                sparkline: 'false',
                price_change_percentage: '24h',
            });
        } else if (endpoint === 'ohlc' && pairId) {
            data = await fetchFromCoinGecko(`/coins/${pairId}/ohlc`, {
                vs_currency: 'usd',
                days: '1',
            });
        } else {
             return NextResponse.json({ error: 'Invalid endpoint for coingecko' }, { status: 400 });
        }
        break;

      case 'tatum':
         if (endpoint === 'markets' && ids) {
             data = await fetchFromTatum('/coins/markets', { ids });
         } else {
             // Fallback to coingecko for OHLC if tatum doesn't support it easily
             console.warn("Tatum OHLC not implemented, falling back to CoinGecko");
             if (endpoint === 'ohlc' && pairId) {
                data = await fetchFromCoinGecko(`/coins/${pairId}/ohlc`, {
                    vs_currency: 'usd',
                    days: '1',
                });
             } else {
                return NextResponse.json({ error: 'Invalid endpoint for tatum' }, { status: 400 });
             }
         }
        break;
      
      default:
        return NextResponse.json({ error: 'Invalid data source' }, { status: 400 });
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
