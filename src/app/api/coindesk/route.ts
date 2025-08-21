
import { NextResponse } from 'next/server';
import axios from 'axios';
import { MarketSummary, availablePairs } from '@/types';
import { supabase, isSupabaseEnabled } from '@/lib/supabaseClient';

// A mapping to get reliable icons, as API sources can be inconsistent.
const iconMap: Record<string, string> = {
    'BTC/USDT': 'https://assets.coingecko.com/coins/images/1/large/bitcoin.png',
    'ETH/USDT': 'https://assets.coingecko.com/coins/images/279/large/ethereum.png',
    'SOL/USDT': 'https://assets.coingecko.com/coins/images/4128/large/solana.png',
    // Add other mappings as needed
};


export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const instrumentsParam = searchParams.get('instruments');

  const instruments = instrumentsParam
    ? instrumentsParam.split(',')
    : availablePairs.filter(
        p => !p.includes('-PERP') && !['XAU/USD', 'EUR/USD', 'GBP/USD'].includes(p)
      );

  if (!instruments.length) return NextResponse.json({});

  try {
    const response = await axios.get(
      'https://data-api.coindesk.com/index/cc/v1/latest/tick',
      {
        params: {
          market: 'cadli',
          instruments: instruments.join(','),
          apply_mapping: true,
          groups: 'ID,VALUE,MOVING_24_HOUR,CURRENT_DAY',
        },
        headers: {
          'x-api-key': process.env.COINDESK_API_KEY,
        },
      }
    );

    const formattedData: Record<string, MarketSummary> = {};
    const dataToUpsert: Omit<MarketSummary, 'pair'>[] & { pair: string }[] = [];

    response.data.payload.forEach((asset: any) => {
      const pair = asset.id.replace(':', '/');
      
      const iconUrl = iconMap[pair] || `https://placehold.co/32x32.png`;

      const summary: MarketSummary = {
        pair,
        price: asset.value ?? 0,
        change: asset.moving_24_hour?.change_percentage ?? 0,
        volume: asset.current_day?.volume ?? 0,
        high: asset.current_day?.high ?? 0,
        low: asset.current_day?.low ?? 0,
        icon: iconUrl,
      };
      
      formattedData[pair] = summary;
      dataToUpsert.push({ ...summary, updated_at: new Date() } as any);
    });

    if (isSupabaseEnabled && dataToUpsert.length > 0) {
        const { error: upsertError } = await supabase.from('market_summary_data').upsert(dataToUpsert, { onConflict: 'pair' });
        if (upsertError) {
            console.error("Supabase upsert error in CoinDesk route:", upsertError);
        }
    }

    return NextResponse.json(formattedData);

  } catch (error) {
    if (axios.isAxiosError(error)) {
        console.error('CoinDesk API proxy error:', error.response?.data || error.message);
        return NextResponse.json(
            { error: 'Failed to fetch from CoinDesk', details: error.response?.data },
            { status: error.response?.status || 502 }
        );
    }
    console.error('CoinDesk API proxy error (unknown):', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
