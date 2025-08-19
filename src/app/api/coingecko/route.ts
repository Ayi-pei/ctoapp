
import { NextResponse } from 'next/server';
import axios from 'axios';
import { z } from 'zod';
import { MarketSummary } from '@/types';

const COINGECKO_API_KEY = process.env.COINGECKO_API_KEY;

const InputSchema = z.object({
  assetIds: z.array(z.string()),
});

// This is a new API proxy route specifically for fetching summary data from CoinGecko.
export async function POST(request: Request) {
    if (!COINGECKO_API_KEY) {
        return NextResponse.json({ error: 'CoinGecko API key is not configured.' }, { status: 500 });
    }

    let input;
    try {
        const body = await request.json();
        input = InputSchema.parse(body);
    } catch (error) {
        return NextResponse.json({ error: 'Invalid input format.' }, { status: 400 });
    }

    if (!input.assetIds || input.assetIds.length === 0) {
        return NextResponse.json({});
    }

    try {
        const response = await axios.get('https://api.coingecko.com/api/v3/coins/markets', {
            params: {
                ids: input.assetIds.join(','),
                vs_currency: 'usd',
            },
            headers: {
                'x-cg-demo-api-key': COINGECKO_API_KEY
            }
        });

        const formattedData: Record<string, MarketSummary> = {};
        response.data.forEach((asset: any) => {
            const pair = `${asset.symbol.toUpperCase()}/USDT`;
            formattedData[pair] = {
                pair: pair,
                price: asset.current_price || 0,
                change: asset.price_change_percentage_24h || 0,
                volume: asset.total_volume || 0,
                high: asset.high_24h || 0,
                low: asset.low_24h || 0,
                icon: asset.image,
            };
        });
        
        return NextResponse.json(formattedData);

    } catch (error) {
        console.error("CoinGecko API proxy error:", error);
        return NextResponse.json({ error: 'Failed to fetch from CoinGecko' }, { status: 502 });
    }
}
