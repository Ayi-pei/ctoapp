
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
      console.warn('TATUM_API_KEY is not set. Cannot fetch market data for AI.');
      return { data: {} };
    }
    if (!input.assetIds || input.assetIds.length === 0) {
      return { data: {} };
    }
    
    try {
       // AI flow now also uses the unified Tatum API endpoint
      const response = await axios.post(
        // Using an absolute URL is safer for server-side calls
        `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/tatum/market-data`,
        { assetIds: input.assetIds }
      );
      
      const realTimeData: Record<string, z.infer<typeof AssetDataSchema>> = response.data;
      
      if (Object.keys(realTimeData).length === 0) {
        console.warn('No data found for the requested assets via Tatum for AI.');
        return { data: {} };
      }

      return { data: realTimeData };

    } catch (error) {
      console.error('Error fetching market data in AI flow:', error);
      return { data: {} };
    }
  }
);
