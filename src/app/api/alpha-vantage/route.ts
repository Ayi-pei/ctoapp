
import { NextResponse } from 'next/server';
import axios from 'axios';

const API_KEY = process.env.ALPHA_VANTAGE_API_KEY;

/**
 * Next.js API Route: /api/alpha-vantage
 *
 * This route acts as a server-side proxy to the Alpha Vantage API.
 * It's designed to securely handle requests for historical options data.
 */
export async function GET(request: Request) {
  if (!API_KEY) {
    return NextResponse.json({ error: 'Alpha Vantage API key is not configured.' }, { status: 500 });
  }

  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get('symbol');
  const date = searchParams.get('date'); // Optional date parameter

  if (!symbol) {
    return NextResponse.json({ error: 'Symbol parameter is required.' }, { status: 400 });
  }

  try {
    const response = await axios.get('https://www.alphavantage.co/query', {
      params: {
        function: 'HISTORICAL_OPTIONS',
        symbol: symbol,
        date: date, // Will be ignored by Alpha Vantage if null or undefined
        apikey: API_KEY,
      },
       headers: {
        // Alpha Vantage examples use this header, it's good practice to include it.
        'User-Agent': 'request'
      }
    });

    if (response.data["Error Message"] || response.data["Information"]) {
        // Handle cases where the API returns a structured error or info message
        return NextResponse.json({ error: response.data["Error Message"] || response.data["Information"] }, { status: 400 });
    }

    return NextResponse.json(response.data);

  } catch (error) {
    if (axios.isAxiosError(error)) {
        console.error('Alpha Vantage API proxy error:', error.response?.data || error.message);
        return NextResponse.json(
            { error: 'Failed to fetch from Alpha Vantage', details: error.response?.data },
            { status: error.response?.status || 502 }
        );
    }
    console.error('Alpha Vantage API proxy error (unknown):', error);
    return NextResponse.json({ error: 'An internal server error occurred' }, { status: 500 });
  }
}
