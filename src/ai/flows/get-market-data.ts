'use server';

/**
 * @fileOverview A server-side flow to fetch real-time market data from an external API.
 *
 * - getMarketData - A function that fetches data for a list of trading assets.
 * - GetMarketDataInput - The input type for the getMarketData function.
 * - GetMarketDataOutput - The return type for the getMarketData function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const GetMarketDataInputSchema = z.object({
  assetIds: z.array(z.string()).describe('A list of asset IDs to fetch data for (e.g., ["bitcoin", "ethereum"]).'),
});
export type GetMarketDataInput = z.infer<typeof GetMarketDataInputSchema>;

const AssetDataSchema = z.object({
    id: z.string(),
    symbol: z.string(),
    priceUsd: z.string(),
    changePercent24Hr: z.string(),
    volumeUsd24Hr: z.string(),
});

const GetMarketDataOutputSchema = z.object({
    data: z.record(AssetDataSchema).describe('A map of asset ID to its market data.'),
});
export type GetMarketDataOutput = z.infer<typeof GetMarketDataOutputSchema>;


export async function getMarketData(
  input: GetMarketDataInput
): Promise<GetMarketDataOutput> {
  return getMarketDataFlow(input);
}


const getMarketDataFlow = ai.defineFlow(
  {
    name: 'getMarketDataFlow',
    inputSchema: GetMarketDataInputSchema,
    outputSchema: GetMarketDataOutputSchema,
  },
  async (input) => {
    if (!input.assetIds || input.assetIds.length === 0) {
        return { data: {} };
    }
    
    try {
        const response = await fetch(`https://api.coincap.io/v2/assets?ids=${input.assetIds.join(',')}`);
        if (!response.ok) {
            console.error(`Coincap API request failed with status: ${response.status}`);
            // Return empty data on failure so the client can fall back to simulator
            return { data: {} };
        }

        const json = await response.json();
        const realTimeData = json.data.reduce((acc: any, asset: any) => {
            acc[asset.id] = {
                id: asset.id,
                symbol: asset.symbol,
                priceUsd: asset.priceUsd,
                changePercent24Hr: asset.changePercent24Hr,
                volumeUsd24Hr: asset.volumeUsd24Hr,
            };
            return acc;
        }, {} as { [key: string]: z.infer<typeof AssetDataSchema> });
        
        return { data: realTimeData };

    } catch (error) {
        console.error('Error fetching from Coincap API in getMarketDataFlow:', error);
        // On any fetch error, return empty data so the client falls back to the simulator.
        return { data: {} };
    }
  }
);