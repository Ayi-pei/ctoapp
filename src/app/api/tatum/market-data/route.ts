
import { NextResponse } from 'next/server';
import axios from 'axios';
import { z } from 'zod';
import type { SystemSettings, MarketIntervention } from '@/context/system-settings-context';

const TATUM_API_KEY = process.env.TATUM_API_KEY;

// This is a placeholder for a real database call.
const getSystemSettingsFromStorage = (): SystemSettings | null => {
    return null;
}

const applyMarketIntervention = (assetId: string, data: any, interventions: MarketIntervention[]): any => {
    const pair = `${assetId}/USDT`;
    const now = new Date();
    const currentTime = now.getHours() * 60 + now.getMinutes();

    const activeIntervention = interventions.find(i => {
        if (i.tradingPair !== pair) return false;
        const [startH, startM] = i.startTime.split(':').map(Number);
        const startTime = startH * 60 + startM;
        const [endH, endM] = i.endTime.split(':').map(Number);
        const endTime = endH * 60 + endM;
        return currentTime >= startTime && currentTime <= endTime;
    });

    if (!activeIntervention) {
        return data;
    }

    let newPrice;
    const { minPrice, maxPrice, trend } = activeIntervention;
    
    const timePassed = currentTime - (activeIntervention.startTime.split(':').map(Number)[0] * 60 + activeIntervention.startTime.split(':').map(Number)[1]);
    const totalDuration = (activeIntervention.endTime.split(':').map(Number)[0] * 60 + activeIntervention.endTime.split(':').map(Number)[1]) - (activeIntervention.startTime.split(':').map(Number)[0] * 60 + activeIntervention.startTime.split(':').map(Number)[1]);
    const progress = totalDuration > 0 ? timePassed / totalDuration : 0;


    if (trend === 'up') {
        newPrice = minPrice + (maxPrice - minPrice) * progress;
    } else if (trend === 'down') {
        newPrice = maxPrice - (maxPrice - minPrice) * progress;
    } else { // random
        newPrice = minPrice + Math.random() * (maxPrice - minPrice);
    }
    
    newPrice *= (1 + (Math.random() - 0.5) * 0.001);


    return {
        ...data,
        priceUsd: newPrice.toString(),
        high: Math.max(parseFloat(data.high), newPrice).toString(),
        low: Math.min(parseFloat(data.low), newPrice).toString(),
    };
};

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

  const systemSettings = getSystemSettingsFromStorage();
  const interventions = systemSettings?.marketInterventions || [];

  // Map each asset ID to a promise that fetches its data from Tatum.
  const assetDataPromises = input.assetIds.map(async (assetId) => {
    try {
      // --- Axios Configuration for Price ---
      // This is the actual `axios.get` call.
      // The configuration is passed directly as the second argument.
      const priceResponse = await axios.get(`https://api.tatum.io/v4/market/price/${assetId}`, {
        // The `headers` object is the most common part of the configuration.
        // Here, we are setting the `x-api-key` header, which is required for authentication with the Tatum API.
        headers: { 'x-api-key': TATUM_API_KEY },
      });
      
      // --- Axios Configuration for Ticker ---
      // Another call to a different endpoint to get more data (like 24h change).
      const tickerResponse = await axios.get(`https://api.tatum.io/v4/market/ticker/${assetId}/USDT`, {
          // The configuration is identical in this case.
          headers: { 'x-api-key': TATUM_API_KEY },
      });

      const rate = priceResponse.data;
      const ticker = tickerResponse.data;

      if (rate && rate.value && ticker) {
        let assetData = {
          id: assetId.toLowerCase(),
          symbol: assetId,
          priceUsd: rate.value.toString(),
          changePercent24Hr: ticker.change || '0',
          volumeUsd24Hr: ticker.volume || '0',
          high: ticker.high || '0',
          low: ticker.low || '0',
        };
        
        if (interventions.length > 0) {
            assetData = applyMarketIntervention(assetId, assetData, interventions);
        }

        return assetData;
      }
      return null;
    } catch (error) {
      console.error(`Error fetching Tatum data for asset ${assetId}:`, error);
      // If one asset fails, we return null so that `Promise.all` doesn't fail completely.
      return null;
    }
  });

  // Wait for all the individual API calls to complete.
  const results = await Promise.all(assetDataPromises);
  
  // Filter out any failed requests and format the successful ones into a dictionary.
  const realTimeData = results.reduce((acc, asset) => {
    if (asset) {
      acc[asset.symbol] = asset;
    }
    return acc;
  }, {} as Record<string, any>);

  return NextResponse.json(realTimeData);
}
