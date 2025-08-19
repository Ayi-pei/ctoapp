
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
    const results = await yahooFinance.quote(symbol, {
        fields: ['regularMarketPrice', 'regularMarketChange', 'regularMarketChangePercent', 'regularMarketDayHigh', 'regularMarketDayLow', 'regularMarketVolume']
    });

    if (!results) {
         return NextResponse.json({ error: 'Symbol not found' }, { status: 404 });
    }
    
    return NextResponse.json(results);
  } catch (error) {
    console.error(`Yahoo Finance API error for symbol ${symbol}:`, error);
    // Check if the error is a known Yahoo Finance error
    if (error instanceof Error && (error.message.includes('404') || error.message.includes('No data found'))) {
       return NextResponse.json({ error: `No data found for symbol: ${symbol}` }, { status: 404 });
    }
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
