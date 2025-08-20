
import { NextResponse } from 'next/server';
import axios from 'axios';
import { z } from 'zod';
import type { SystemSettings, MarketIntervention } from '@/context/system-settings-context';

const TATUM_API_KEY = process.env.TATUM_API_KEY;

// This is a placeholder for a real database call.
// In a real app, this would fetch settings from a DB like Supabase.
const getSystemSettingsFromStorage = (): SystemSettings | null => {
    if (typeof window === 'undefined') return null;
    const storedSettings = localStorage.getItem('tradeflow_system_settings_v4');
    if (storedSettings) {
        return JSON.parse(storedSettings) as SystemSettings;
    }
    return null;
}

const applyMarketIntervention = (assetId: string, data: any, interventions: MarketIntervention[]): any => {
    const validPairs = [`${assetId}/USDT`, `${assetId}/USD`];
    
    // Get current UTC time
    const utcNow = new Date();
    // Convert to Beijing Time (UTC+8)
    const beijingNow = new Date(utcNow.getTime() + (8 * 60 * 60 * 1000));
    const beijingHours = beijingNow.getUTCHours(); // Use getUTCHours() on the UTC-based date
    const beijingMinutes = beijingNow.getUTCMinutes(); // Use getUTCMinutes() on the UTC-based date
    const currentTime = beijingHours * 60 + beijingMinutes;

    // Find an active intervention for any of the valid pairs
    const activeIntervention = interventions.find(i => {
        if (!validPairs.includes(i.tradingPair)) return false;
        
        const [startH, startM] = i.startTime.split(':').map(Number);
        const startTimeInMinutes = startH * 60 + startM;
        const [endH, endM] = i.endTime.split(':').map(Number);
        const endTimeInMinutes = endH * 60 + endM;

        return currentTime >= startTimeInMinutes && currentTime <= endTimeInMinutes;
    });

    if (!activeIntervention) {
        return data;
    }

    let newPrice;
    const { minPrice, maxPrice, trend } = activeIntervention;
    
    const [startH, startM] = activeIntervention.startTime.split(':').map(Number);
    const startMinutes = startH * 60 + startM;
    const [endH, endM] = activeIntervention.endTime.split(':').map(Number);
    const endMinutes = endH * 60 + endM;

    // This check is crucial to ensure we are within the specified time window.
    if (currentTime < startMinutes || currentTime > endMinutes) {
      return data;
    }

    const timePassed = currentTime - startMinutes;
    const totalDuration = endMinutes - startMinutes;
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
      const priceResponse = await axios.get(`https://api.tatum.io/v4/market/price/${assetId}`, {
        headers: { 'x-api-key': TATUM_API_KEY },
      });
      
      const tickerResponse = await axios.get(`https://api.tatum.io/v4/market/ticker/${assetId}/USDT`, {
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
