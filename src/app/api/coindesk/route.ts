
import { NextResponse } from 'next/server';
import axios from 'axios';
import { z } from 'zod';
import { MarketSummary, availablePairs } from '@/types';

// This is a new API proxy route specifically for fetching summary data from CoinDesk.
// It now correctly uses GET and expects instruments from the query string.
export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const instrumentsParam = searchParams.get('instruments');

    // If no instruments are provided, default to all available crypto pairs.
    // This makes the API flexible for specific or general queries.
    const instruments = instrumentsParam ? instrumentsParam.split(',') : availablePairs.filter(p => !p.includes('-PERP') && !['XAU/USD', 'EUR/USD', 'GBP/USD'].includes(p));

    if (!instruments || instruments.length === 0) {
        return NextResponse.json({});
    }

    try {
        const response = await axios.get('https://data-api.coindesk.com/index/cc/v1/latest/tick', {
            params: {
                market: 'cadli',
                instruments: instruments.join(','),
                apply_mapping: true,
                groups: 'ID,VALUE,MOVING_24_HOUR,CURRENT_DAY', // Request only the data we need
            }
        });

        const formattedData: Record<string, MarketSummary> = {};
        
        response.data.payload.forEach((asset: any) => {
            const pair = asset.id.replace(':', '/');
            
            // Find the icon from our static types definition or use a placeholder
            const iconUrl = availablePairs.find(p => p === pair)
                ? `https://assets.coingecko.com/coins/images/${asset.id.split(':')[0].toLowerCase()}/large.png`
                : 'https://assets.coingecko.com/coins/images/1/large/bitcoin.png';

            formattedData[pair] = {
                pair: pair,
                price: asset.value || 0,
                change: asset.moving_24_hour?.change_percentage || 0,
                volume: asset.current_day?.volume || 0,
                high: asset.current_day?.high || 0,
                low: asset.current_day?.low || 0,
                icon: iconUrl, 
            };
        });
        
        return NextResponse.json(formattedData);

    } catch (error) {
        if (axios.isAxiosError(error)) {
            console.error("CoinDesk API proxy error:", error.response?.data || error.message);
            return NextResponse.json({ error: 'Failed to fetch from CoinDesk', details: error.response?.data }, { status: error.response?.status || 502 });
        }
        console.error("CoinDesk API proxy error (non-axios):", error);
        return NextResponse.json({ error: 'An internal server error occurred' }, { status: 500 });
    }
}
