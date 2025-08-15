'use server';

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import axios from 'axios';

const GetMarketDataInputSchema = z.object({
  assetIds: z
    .array(z.string())
    .describe('A list of asset IDs to fetch data for (e.g., ["BTC", "ETH"]).'),
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
  data: z
    .record(AssetDataSchema)
    .describe('A map of asset ID to its market data.'),
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

    const assetDataPromises = input.assetIds.map(async (assetId) => {
      try {
        const response = await axios.get(
          `https://api.tatum.io/v4/market/price/${assetId}`,
          {
            headers: {
              'x-api-key': process.env.TATUM_API_KEY,
            },
          }
        );
        const rate = response.data;

        if (rate && rate.value) {
          return {
            id: assetId.toLowerCase(),
            symbol: assetId,
            priceUsd: rate.value.toString(),
            changePercent24Hr: '0', // V4 endpoint does not provide this
            volumeUsd24Hr: '0', // V4 endpoint does not provide this
          };
        }
        return null;
      } catch (error) {
        console.error(`Error fetching data for asset ${assetId}:`, error);
        return null;
      }
    });

    const results = await Promise.all(assetDataPromises);

    const realTimeData = results.reduce((acc, asset) => {
      if (asset) {
        acc[asset.id] = asset;
      }
      return acc;
    }, {} as Record<string, z.infer<typeof AssetDataSchema>>);

    if (Object.keys(realTimeData).length === 0) {
      console.warn('No data found for the requested assets.');
      return { data: {} };
    }

    return { data: realTimeData };
  }
);
