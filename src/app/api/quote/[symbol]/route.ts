
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
    // Switched to quoteSummary which is more robust for different asset types.
    const results = await yahooFinance.quoteSummary(symbol, {
      modules: ["price"],
    });

    if (!results || !results.price) {
         return NextResponse.json({ error: 'Symbol not found or no price data available' }, { status: 404 });
    }
    
    return NextResponse.json(results.price);
  } catch (error) {
    console.error(`Yahoo Finance API error for symbol ${symbol}:`, error);
    if (error instanceof Error && (error.message.includes('404') || error.message.includes('No data found'))) {
       return NextResponse.json({ error: `No data found for symbol: ${symbol}` }, { status: 404 });
    }
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
