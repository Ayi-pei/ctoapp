
import { NextResponse } from 'next/server';
import axios from 'axios';
import { MarketSummary } from '@/types';

export async function GET(request: Request) {
    try {
        const response = await axios.get('https://api.coindesk.com/v1/bpi/currentprice/BTC.json');
        const data = response.data;
        
        const btcData = data.bpi.USD;
        if (!btcData) {
            return NextResponse.json({ error: 'BTC data not found in CoinDesk response' }, { status: 404 });
        }

        const twentyFourHourResponse = await axios.get('https://api.coindesk.com/v2/spot/price/BTC/USD/24h');
        const twentyFourHourData = twentyFourHourResponse.data.data;
        
        const changePercent = twentyFourHourData?.price_24h_percentage_change || 0;

        const formattedData: Record<string, MarketSummary> = {
            'BTC/USDT': {
                pair: 'BTC/USDT',
                price: btcData.rate_float,
                change: parseFloat(changePercent) * 100,
                volume: 0, 
                high: 0,
                low: 0,
                icon: 'https://assets.coingecko.com/coins/images/1/large/bitcoin.png'
            }
        };

        return NextResponse.json(formattedData);
    } catch (error) {
        console.error('CoinDesk API proxy error:', error);
        return NextResponse.json({ error: 'Failed to fetch from CoinDesk API' }, { status: 502 });
    }
}
