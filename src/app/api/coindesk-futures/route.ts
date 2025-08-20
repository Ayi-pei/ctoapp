
import { NextResponse } from 'next/server';
import axios from 'axios';
import { z } from 'zod';
import { MarketSummary } from '@/types';

const COINDESK_API_KEY = process.env.COINDESK_API_KEY;

const InputSchema = z.object({
  instruments: z.array(z.string()),
});

// Mapping from our app's pair format to CoinDesk's instrument format
const instrumentMap: Record<string, string> = {
    'XAG/USD': 'XAGUSD', // Example, may need adjustment based on exact CoinDesk symbol
    'OIL/USD': 'WTIUSD',  // Example for WTI Oil
    // NAS100 is an index, might not be in this futures API. Placeholder.
};
const marketMap: Record<string, string> = {
    'XAG/USD': 'bitmex', // Assumption, find correct market
    'OIL/USD': 'bitmex', // Assumption
}


export async function POST(request: Request) {
    if (!COINDESK_API_KEY) {
        return NextResponse.json({ error: 'CoinDesk API key is not configured.' }, { status: 500 });
    }

    let input;
    try {
        const body = await request.json();
        input = InputSchema.parse(body);
    } catch (error) {
        return NextResponse.json({ error: 'Invalid input format.' }, { status: 400 });
    }
    
    const instruments = input.instruments.map(pair => instrumentMap[pair]).filter(Boolean);
    if (instruments.length === 0) {
        return NextResponse.json({});
    }

    try {
        const response = await axios.get('https://data-api.coindesk.com/futures/v1/latest/tick', {
            params: {
                market: 'bitmex', // Using a common market, may need to be dynamic later
                instruments: instruments.join(','),
                groups: 'CURRENT_YEAR'
            },
            headers: {
                'X-CoinDesk-Api-Key': COINDESK_API_KEY
            }
        });

        const data = response.data.Data;
        const formattedData: Record<string, MarketSummary> = {};

        for (const appPair of input.instruments) {
            const coindeskInstrument = instrumentMap[appPair];
            const instrumentData = data[coindeskInstrument];
            if (instrumentData) {
                 const price = (instrumentData.CURRENT_YEAR_HIGH + instrumentData.CURRENT_YEAR_LOW) / 2; // Approximate price
                 formattedData[appPair] = {
                    pair: appPair,
                    price: price,
                    change: instrumentData.CURRENT_YEAR_CHANGE_PERCENTAGE || 0,
                    volume: instrumentData.CURRENT_YEAR_VOLUME || 0,
                    high: instrumentData.CURRENT_YEAR_HIGH || 0,
                    low: instrumentData.CURRENT_YEAR_LOW || 0,
                    // Icon logic is handled client-side
                };
            }
        }
        
        return NextResponse.json(formattedData);

    } catch (error) {
        console.error("CoinDesk Futures API proxy error:", error);
        return NextResponse.json({ error: 'Failed to fetch from CoinDesk Futures API' }, { status: 502 });
    }
}
