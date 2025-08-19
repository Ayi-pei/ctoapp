
import { NextResponse } from 'next/server';
import yahooFinance from 'yahoo-finance2';

/**
 * Next.js API Route: /api/quote/[symbol]
 *
 * This route acts as a server-side proxy to the Yahoo Finance API.
 * Its primary responsibilities are:
 * 1.  Receiving a symbol from a client-side request.
 * 2.  Securely fetching the corresponding data from the external Yahoo Finance service.
 * 3.  Formatting the response and sending it back to the client.
 *
 * This proxy pattern is crucial for several reasons:
 * - It hides sensitive information, like potential API keys, from the client-side.
 * - It abstracts the external data source, allowing us to change or add sources
 *   without altering the client-side code.
 * - It does NOT store any data. It's a pass-through for live market information.
 */
export async function GET(
  request: Request,
  { params }: { params: { symbol: string } }
) {
  const symbol = params.symbol;

  if (!symbol) {
    return NextResponse.json({ error: 'Symbol is required' }, { status: 400 });
  }

  try {
    // Switched to `quote` which is more reliable for various symbols including commodities.
    const result = await yahooFinance.quote(symbol);

    if (!result) {
         return NextResponse.json({ error: 'Symbol not found or no price data available' }, { status: 404 });
    }
    
    // The `quote` method returns the full object, which is what we need.
    return NextResponse.json(result);
  } catch (error) {
    console.error(`Yahoo Finance API error for symbol ${symbol}:`, error);
    if (error instanceof Error && (error.message.includes('404') || error.message.includes('No data found'))) {
       return NextResponse.json({ error: `No data found for symbol: ${symbol}` }, { status: 404 });
    }
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
