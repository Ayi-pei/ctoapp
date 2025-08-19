
import { NextResponse } from 'next/server';
import axios from 'axios';

const COINGECKO_API_KEY = process.env.COINGECKO_API_KEY;
const COINPAPRIKA_API_URL = 'https://api.coinpaprika.com/v1';

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


export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const ids = searchParams.get('ids');
    const type = searchParams.get('type'); // 'summary' or 'kline'
    const pair = searchParams.get('pair'); // for kline

    if (!type) {
        return NextResponse.json({ error: 'Request type is required' }, { status: 400 });
    }

    // --- Summary Data Fetching ---
    if (type === 'summary' && ids) {
        try {
            const coingeckoIds = ids.split(',');
            const response = await axios.get('https://api.coingecko.com/api/v3/simple/price', {
                params: {
                    ids: coingeckoIds.join(','),
                    vs_currencies: 'usd',
                    include_24hr_vol: 'true',
                    include_24hr_change: 'true',
                },
                headers: {
                    'x-cg-demo-api-key': COINGECKO_API_KEY
                }
            });
            const data = response.data;
            const summary = Object.entries(data).map(([id, value]: [string, any]) => {
                const pairKey = Object.keys(apiIdMap).find(key => apiIdMap[key].coingecko === id);
                return {
                    id: id,
                    pair: pairKey || id.toUpperCase(),
                    price: value.usd,
                    change: value.usd_24h_change || 0,
                    volume: value.usd_24h_vol || 0,
                };
            });
            return NextResponse.json(summary);
        } catch (error) {
             console.error("CoinGecko API error in proxy:", error);
             return NextResponse.json({ error: 'Failed to fetch from CoinGecko' }, { status: 502 });
        }
    }

    // --- Kline Data Fetching ---
    if (type === 'kline' && pair) {
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

    return NextResponse.json({ error: 'Invalid request parameters' }, { status: 400 });
}
