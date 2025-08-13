
'use server';

/**
 * @fileOverview A server-side flow to fetch real-time market data from an external API.
 *
 * - getMarketData - A function that fetches data for a list of trading assets.
 * - GetMarketDataInput - The input type for the getMarketData function.
 * - GetMarketDataOutput - The return type for the getMarketData function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { TatumSDK, Network, Bitcoin, Eth } from '@tatumio/tatum';

const GetMarketDataInputSchema = z.object({
  assetIds: z.array(z.string()).describe('A list of asset IDs to fetch data for (e.g., ["BTC", "ETH"]).'),
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
    if (!process.env.TATUM_API_KEY) {
        console.warn('TATUM_API_KEY is not set. Falling back to simulator.');
        return { data: {} };
    }
    if (!input.assetIds || input.assetIds.length === 0) {
        return { data: {} };
    }
    
    try {
        const tatum = await TatumSDK.init<Bitcoin>({ 
            network: Network.BITCOIN,
            apiKey: {
                v4: process.env.TATUM_API_KEY,
            }
        });

        const assetDataPromises = input.assetIds.map(async (assetId) => {
            try {
                // Use the more comprehensive getAssetRate API
                const rate = await tatum.assets.getAssetRate(assetId, 'USDT');

                if (rate && rate.value) {
                    return {
                        id: assetId.toLowerCase(),
                        symbol: assetId,
                        priceUsd: rate.value.toString(),
                        // Correctly map the change and volume from the API response
                        changePercent24Hr: rate.change24h?.toString() || '0', 
                        volumeUsd24Hr: rate.volume24h?.toString() || '0',
                    };
                }
                return null;
            } catch (error) {
                console.error(`Error fetching data for asset ${assetId} from Tatum:`, error);
                return null;
            }
        });
        
        const results = await Promise.all(assetDataPromises);
        
        const realTimeData = results.reduce((acc: any, asset: any) => {
            if (asset) {
                acc[asset.id] = asset;
            }
            return acc;
        }, {} as { [key: string]: z.infer<typeof AssetDataSchema> });

        if (Object.keys(realTimeData).length === 0) {
             console.warn('Tatum API returned no data for the requested assets.');
             return { data: {} };
        }
        
        return { data: realTimeData };

    } catch (error) {
        console.error('Error fetching from Tatum API in getMarketDataFlow:', error);
        // On any fetch error, return empty data so the client falls back to the simulator.
        return { data: {} };
    }
  }
);
