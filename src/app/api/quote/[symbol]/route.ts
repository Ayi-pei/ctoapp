
import { NextResponse } from 'next/server';
import yahooFinance from 'yahoo-finance2';

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
