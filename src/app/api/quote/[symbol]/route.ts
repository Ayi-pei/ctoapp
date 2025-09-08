
import { NextRequest, NextResponse } from 'next/server';
import yahooFinance from 'yahoo-finance2';

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const pathParts = url.pathname.split('/');
  const symbol = pathParts[pathParts.length - 1];

  if (!symbol) {
    return NextResponse.json({ error: 'Symbol is required' }, { status: 400 });
  }

  try {
    const result = await yahooFinance.quote(symbol);

    if (!result) {
      return NextResponse.json({ error: 'Symbol not found or no price data available' }, { status: 404 });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error(`Yahoo Finance API error for symbol ${symbol}:`, error);
    if (error instanceof Error && (error.message.includes('404') || error.message.includes('No data found'))) {
      return NextResponse.json({ error: `No data found for symbol: ${symbol}` }, { status: 404 });
    }
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
