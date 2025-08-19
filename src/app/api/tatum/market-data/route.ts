
import { NextResponse } from 'next/server';
import axios from 'axios';
import { z } from 'zod';

const TATUM_API_KEY = process.env.TATUM_API_KEY;

const AssetDataSchema = z.object({
  id: z.string(),
  symbol: z.string(),
  priceUsd: z.string(),
  changePercent24Hr: z.string(),
  volumeUsd24Hr: z.string(),
  high: z.string(),
  low: z.string(),
});

const InputSchema = z.object({
  assetIds: z.array(z.string()),
});

export async function POST(request: Request) {
  if (!TATUM_API_KEY) {
    return NextResponse.json({ error: 'Tatum API key is not configured.' }, { status: 500 });
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

  const assetDataPromises = input.assetIds.map(async (assetId) => {
    try {
      const response = await axios.get(`https://api.tatum.io/v4/market/price/${assetId}`, {
        headers: { 'x-api-key': TATUM_API_KEY },
      });
      const rate = response.data;
      
      const tickerResponse = await axios.get(`https://api.tatum.io/v4/market/ticker/${assetId}/USDT`, {
          headers: { 'x-api-key': TATUM_API_KEY },
      });
      const ticker = tickerResponse.data;

      if (rate && rate.value && ticker) {
        return {
          id: assetId.toLowerCase(),
          symbol: assetId,
          priceUsd: rate.value.toString(),
          changePercent24Hr: ticker.change || '0',
          volumeUsd24Hr: ticker.volume || '0',
          high: ticker.high || '0',
          low: ticker.low || '0',
        };
      }
      return null;
    } catch (error) {
      // Don't log entire error object in production
      console.error(`Error fetching Tatum data for asset ${assetId}`);
      return null;
    }
  });

  const results = await Promise.all(assetDataPromises);
  const realTimeData = results.reduce((acc, asset) => {
    if (asset) {
      acc[asset.symbol] = asset;
    }
    return acc;
  }, {} as Record<string, z.infer<typeof AssetDataSchema>>);

  return NextResponse.json(realTimeData);
}
