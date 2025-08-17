'use server';

/**
 * @fileOverview An AI-powered tool that analyzes current and historical market data to provide trading insights.
 *
 * - getMarketAnalysis - A function that handles the market analysis process.
 * - GetMarketAnalysisInput - The input type for the getMarketAnalysis function.
 * - GetMarketAnalysisOutput - The return type for the getMarketAnalysis function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GetMarketAnalysisInputSchema = z.object({
  orderBookData: z
    .string()
    .describe('A string representation of the current order book data (asks and bids).'),
  priceHistoryData: z
    .string()
    .describe('A string representation of recent K-line or price history data.'),
  tradingPair: z.string().describe('The trading pair being analyzed (e.g., BTC/USDT).'),
});
export type GetMarketAnalysisInput = z.infer<typeof GetMarketAnalysisInputSchema>;

const GetMarketAnalysisOutputSchema = z.object({
  analysis: z
    .string()
    .describe(
      'A detailed analysis of the market dynamics, including potential support and resistance levels, trend assessment, and a suggested trading action (buy, sell, or hold) based on the provided data.'
    ),
});
export type GetMarketAnalysisOutput = z.infer<typeof GetMarketAnalysisOutputSchema>;

export async function getMarketAnalysis(
  input: GetMarketAnalysisInput
): Promise<GetMarketAnalysisOutput> {
  return getMarketAnalysisFlow(input);
}

const prompt = ai.definePrompt({
  name: 'getMarketAnalysisPrompt',
  input: {schema: GetMarketAnalysisInputSchema},
  output: {schema: GetMarketAnalysisOutputSchema},
  prompt: `You are an expert crypto trading analyst. Your task is to provide a concise analysis and a trading suggestion for a user.

Analyze the provided market data for the {{tradingPair}} trading pair. Your analysis should consider both the order book depth and the recent price action.

Based on your analysis, provide a clear, actionable trading suggestion (e.g., "Consider Buying", "Potential Sell Signal", "Advise Holding"). Explain your reasoning in a brief paragraph, mentioning key support or resistance levels you've identified from the data.

Order Book Data:
{{orderBookData}}

Recent Price History:
{{priceHistoryData}}

Your concise analysis and suggestion:`,
});

const getMarketAnalysisFlow = ai.defineFlow(
  {
    name: 'getMarketAnalysisFlow',
    inputSchema: GetMarketAnalysisInputSchema,
    outputSchema: GetMarketAnalysisOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
