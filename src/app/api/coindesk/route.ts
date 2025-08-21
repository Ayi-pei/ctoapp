import { NextResponse } from 'next/server';
import axios from 'axios';
import { MarketSummary, availablePairs } from '@/types';

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
          'x-api-key': process.env.COINDESK_API_KEY, // 使用环境变量，不暴露给前端
        },
      }
    );

    const formattedData: Record<string, MarketSummary> = {};

    response.data.payload.forEach((asset: any) => {
      const pair = asset.id.replace(':', '/');
      const iconUrl =
        availablePairs.find(p => p === pair) ??
        'https://assets.coingecko.com/coins/images/1/large/bitcoin.png';

      formattedData[pair] = {
        pair,
        price: asset.value ?? 0,
        change: asset.moving_24_hour?.change_percentage ?? 0,
        volume: asset.current_day?.volume ?? 0,
        high: asset.current_day?.high ?? 0,
        low: asset.current_day?.low ?? 0,
        icon: iconUrl,
      };
    });

    return NextResponse.json(formattedData);
  } catch (error) {
    console.error('CoinDesk API proxy error:', axios.isAxiosError(error) ? error.response?.data || error.message : error);
    return NextResponse.json(
      { error: 'Failed to fetch from CoinDesk', details: axios.isAxiosError(error) ? error.response?.data : undefined },
      { status: axios.isAxiosError(error) ? error.response?.status || 502 : 500 }
    );
  }
}
