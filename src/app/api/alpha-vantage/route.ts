import { NextResponse } from 'next/server';

const API_KEY = process.env.ALPHA_VANTAGE_API_KEY;

/**
 * Next.js API Route: /api/alpha-vantage
 *
 * This route acts as a server-side proxy to the Alpha Vantage API.
 * It's designed to securely handle requests for various functions like
 * historical options data, currency exchange rates, etc.
 */
export async function GET(request: Request) {
  if (!API_KEY) {
    return NextResponse.json({ error: 'Alpha Vantage API key is not configured.' }, { status: 500 });
  }

  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get('symbol');
  const func = searchParams.get('function') || 'HISTORICAL_OPTIONS';
  const date = searchParams.get('date');

  if (!symbol) {
    return NextResponse.json({ error: 'Symbol parameter is required.' }, { status: 400 });
  }
  
  if (func === 'HISTORICAL_OPTIONS' && !date) {
    return NextResponse.json({ error: 'Date parameter is required for HISTORICAL_OPTIONS.' }, { status: 400 });
  }

  try {
    const params: Record<string, string> = {
        function: func,
        symbol: symbol,
        apikey: API_KEY,
    };
    if (date) {
        params.date = date;
    }

    const queryParams = new URLSearchParams(params);
    const url = `https://www.alphavantage.co/query?${queryParams.toString()}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'User-Agent': 'request',
      },
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to fetch from Alpha Vantage and could not parse error response.' }));
        console.error('Alpha Vantage API proxy error:', errorData);
        return NextResponse.json(
            { error: 'Failed to fetch from Alpha Vantage', details: errorData },
            { status: response.status }
        );
    }
    
    const data = await response.json();

    if (data["Error Message"] || data["Information"]) {
        // Handle cases where the API returns a structured error or info message
        return NextResponse.json({ error: data["Error Message"] || data["Information"] }, { status: 400 });
    }

    return NextResponse.json(data);

  } catch (error) {
    console.error('Alpha Vantage API proxy error (unknown):', error);
    return NextResponse.json({ error: 'An internal server error occurred' }, { status: 500 });
  }
}
