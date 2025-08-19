
import { NextResponse } from 'next/server';
import axios from 'axios';
import { z } from 'zod';
import type { SystemSettings, MarketIntervention } from '@/context/system-settings-context';

const TATUM_API_KEY = process.env.TATUM_API_KEY;
const SYSTEM_SETTINGS_STORAGE_KEY = 'tradeflow_system_settings_v4';

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

// This is a server-side simulation. In a real app, this would be a DB call.
// We are assuming the client (admin) has saved the settings to a known key.
const getSystemSettingsFromStorage = (): SystemSettings | null => {
    // This is a placeholder. On a server, you can't access localStorage.
    // When moving to a real DB like Supabase, you would fetch this from the DB.
    // For now, we return null to indicate we should use real data.
    // The logic to apply overrides is here, but it needs a real data source.
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
    
    // For a more dynamic feel, we can simulate movement within the range
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
    
    // Add some small random noise
    newPrice *= (1 + (Math.random() - 0.5) * 0.001);


    return {
        ...data,
        priceUsd: newPrice.toString(),
        high: Math.max(parseFloat(data.high), newPrice).toString(),
        low: Math.min(parseFloat(data.low), newPrice).toString(),
    };
};


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

  // On the server, we can't access localStorage directly.
  // This is a placeholder for where you'd fetch settings from a real database (e.g., Supabase).
  // For the demo, we are assuming no interventions are active unless we can read them.
  // This logic is designed to be easily swappable with a DB call.
  const systemSettings = getSystemSettingsFromStorage();
  const interventions = systemSettings?.marketInterventions || [];

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
        let assetData = {
          id: assetId.toLowerCase(),
          symbol: assetId,
          priceUsd: rate.value.toString(),
          changePercent24Hr: ticker.change || '0',
          volumeUsd24Hr: ticker.volume || '0',
          high: ticker.high || '0',
          low: ticker.low || '0',
        };
        
        // This is where server-side override would happen if settings were in a DB.
        // For now, this logic will not run because getSystemSettingsFromStorage returns null.
        // Once Supabase is integrated, this will work.
        if (interventions.length > 0) {
            assetData = applyMarketIntervention(assetId, assetData, interventions);
        }

        return assetData;
      }
      return null;
    } catch (error) {
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

