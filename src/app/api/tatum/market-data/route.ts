
import { NextResponse } from 'next/server';
import axios from 'axios';
import { z } from 'zod';

const TATUM_API_KEY = process.env.TATUM_API_KEY;

// Define the expected input schema from the client-side request
const InputSchema = z.object({
  assetIds: z.array(z.string()),
});


export async function POST(request: Request) {
  // Check if the API key is available from environment variables.
  if (!TATUM_API_KEY) {
    return NextResponse.json({ error: 'Tatum API key is not configured.' }, { status: 500 });
  }

  // Parse and validate the incoming request body.
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

  // Map each asset ID to a promise that fetches its data from Tatum.
  const assetDataPromises = input.assetIds.map(async (assetId) => {
    try {
      const priceResponse = await axios.get(`https://api.tatum.io/v4/market/price/${assetId}`, {
        headers: { 'x-api-key': TATUM_API_KEY },
      });
      
      const tickerResponse = await axios.get(`https://api.tatum.io/v4/market/ticker/${assetId}/USDT`, {
          headers: { 'x-api-key': TATUM_API_KEY },
      });

      const rate = priceResponse.data;
      const ticker = tickerResponse.data;

      if (rate && rate.value && ticker) {
        const assetData = {
          id: assetId.toLowerCase(),
          symbol: assetId,
          priceUsd: rate.value.toString(),
          changePercent24Hr: ticker.change || '0',
          volumeUsd24Hr: ticker.volume || '0',
          high: ticker.high || '0',
          low: ticker.low || '0',
        };
        
        return assetData;
      }
      return null;
    } catch (error) {
      console.error(`Error fetching Tatum data for asset ${assetId}:`, error);
      return null;
    }
  });

  const results = await Promise.all(assetDataPromises);
  
  const realTimeData = results.reduce((acc, asset) => {
    if (asset) {
      acc[asset.symbol] = asset;
    }
    return acc;
  }, {} as Record<string, any>);

  return NextResponse.json(realTimeData);
}
