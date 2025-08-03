'use server';

/**
 * @fileOverview An AI-powered tool that analyzes current market data to understand potential support and resistance levels.
 *
 * - explainMarketDynamics - A function that handles the market dynamics explanation process.
 * - ExplainMarketDynamicsInput - The input type for the explainMarketDynamics function.
 * - ExplainMarketDynamicsOutput - The return type for the explainMarketDynamics function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const ExplainMarketDynamicsInputSchema = z.object({
  orderBookData: z
    .string()
    .describe('A string representation of the current order book data.'),
  tradingPair: z.string().describe('The trading pair being analyzed (e.g., BTC/USDT).'),
});
export type ExplainMarketDynamicsInput = z.infer<typeof ExplainMarketDynamicsInputSchema>;

const ExplainMarketDynamicsOutputSchema = z.object({
  explanation: z
    .string()
    .describe(
      'A detailed explanation of the market dynamics, including potential support and resistance levels, based on the order book data.'
    ),
});
export type ExplainMarketDynamicsOutput = z.infer<typeof ExplainMarketDynamicsOutputSchema>;

export async function explainMarketDynamics(
  input: ExplainMarketDynamicsInput
): Promise<ExplainMarketDynamicsOutput> {
  return explainMarketDynamicsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'explainMarketDynamicsPrompt',
  input: {schema: ExplainMarketDynamicsInputSchema},
  output: {schema: ExplainMarketDynamicsOutputSchema},
  prompt: `You are an AI assistant designed to help new users understand cryptocurrency market dynamics.

  Analyze the provided order book data for the {{tradingPair}} trading pair and provide a clear, concise explanation of the current market dynamics, including potential support and resistance levels.

  Order Book Data:
  {{orderBookData}}

  Explanation:`,
});

const explainMarketDynamicsFlow = ai.defineFlow(
  {
    name: 'explainMarketDynamicsFlow',
    inputSchema: ExplainMarketDynamicsInputSchema,
    outputSchema: ExplainMarketDynamicsOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
