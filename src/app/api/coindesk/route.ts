
import { NextResponse } from 'next/server';
import axios from 'axios';
import { MarketSummary } from '@/types';

// This is a new API proxy route for fetching data from CoinDesk.
export async function GET(request: Request) {
    // CoinDesk API is simple and doesn't require specific IDs per asset in the free tier
    try {
        const response = await axios.get('https://api.coindesk.com/v1/bpi/currentprice.json');
        const data = response.data.bpi;
        
        // The free CoinDesk API primarily provides BTC, EUR, GBP data.
        // We will extract BTC and format it to match our MarketSummary type.
        const btcData = data.USD;
        if (!btcData) {
            return NextResponse.json({ error: 'BTC data not found in CoinDesk response' }, { status: 404 });
        }

        const formattedData: Record<string, MarketSummary> = {
            'BTC/USDT': {
                pair: 'BTC/USDT',
                price: btcData.rate_float,
                change: 0, // CoinDesk v1 API doesn't provide change/volume
                volume: 0,
                high: 0,
                low: 0,
            }
        };

        // We can add more mappings here if the API provides them, but it's limited.
        // This provider is a fallback and will be supplemented by others.

        return NextResponse.json(formattedData);
    } catch (error) {
        console.error('CoinDesk API proxy error:', error);
        return NextResponse.json({ error: 'Failed to fetch from CoinDesk API' }, { status: 502 });
    }
}
