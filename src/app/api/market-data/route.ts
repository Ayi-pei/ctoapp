
import { NextResponse } from 'next/server';
import axios from 'axios';

const COINGECKO_API_KEY = process.env.COINGECKO_API_KEY;

const apiIdMap: Record<string, { coingecko?: string, coinpaprika?: string }> = {
    'BTC/USDT': { coingecko: 'bitcoin', coinpaprika: 'btc-bitcoin' },
    'ETH/USDT': { coingecko: 'ethereum', coinpaprika: 'eth-ethereum' },
    'SOL/USDT': { coingecko: 'solana', coinpaprika: 'sol-solana' },
    'XRP/USDT': { coingecko: 'ripple', coinpaprika: 'xrp-xrp' },
    'LTC/USDT': { coingecko: 'litecoin', coinpaprika: 'ltc-litecoin' },
    'BNB/USDT': { coingecko: 'binancecoin', coinpaprika: 'bnb-binance-coin' },
    'MATIC/USDT': { coingecko: 'matic-network', coinpaprika: 'matic-polygon' },
    'DOGE/USDT': { coingecko: 'dogecoin', coinpaprika: 'doge-dogecoin' },
    'ADA/USDT': { coingecko: 'cardano', coinpaprika: 'ada-cardano' },
    'SHIB/USDT': { coingecko: 'shiba-inu', coinpaprika: 'shib-shiba-inu' },
     'AVAX/USDT': { coingecko: 'avalanche-2', coinpaprika: 'avax-avalanche' },
    'LINK/USDT': { coingecko: 'chainlink', coinpaprika: 'link-chainlink' },
    'DOT/USDT': { coingecko: 'polkadot', coinpaprika: 'dot-polkadot' },
    'UNI/USDT': { coingecko: 'uniswap', coinpaprika: 'uni-uniswap' },
    'TRX/USDT': { coingecko: 'tron', coinpaprika: 'trx-tron' },
    'XLM/USDT': { coingecko: 'stellar', coinpaprika: 'xlm-stellar' },
    'VET/USDT': { coingecko: 'vechain', coinpaprika: 'vet-vechain' },
    'EOS/USDT': { coingecko: 'eos', coinpaprika: 'eos-eos' },
    'FIL/USDT': { coingecko: 'filecoin', coinpaprika: 'fil-filecoin' },
    'ICP/USDT': { coingecko: 'internet-computer', coinpaprika: 'icp-internet-computer' },
};


// This route is now dedicated to fetching K-line data from CoinGecko.
// Summary data fetching has been moved to dedicated, rotating API routes.
export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const pair = searchParams.get('pair');

    if (!pair) {
        return NextResponse.json({ error: 'Trading pair is required' }, { status: 400 });
    }

    const coingeckoId = apiIdMap[pair]?.coingecko;
    if (!coingeckoId) {
        return NextResponse.json({ error: 'K-line data not available for this pair' }, { status: 404 });
    }

    try {
        const response = await axios.get(`https://api.coingecko.com/api/v3/coins/${coingeckoId}/ohlc`, {
            params: {
                vs_currency: 'usd',
                days: '1',
            },
             headers: {
                'x-cg-demo-api-key': COINGECKO_API_KEY
            }
        });
        const ohlcData = response.data.map((d: number[]) => ({
            time: d[0],
            open: d[1],
            high: d[2],
            low: d[3],
            close: d[4],
        }));
        return NextResponse.json(ohlcData);
    } catch (error) {
        console.error(`CoinGecko kline error for ${pair}:`, error);
        return NextResponse.json({ error: 'Failed to fetch k-line data' }, { status: 502 });
    }
}

