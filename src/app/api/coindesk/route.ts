import { NextResponse } from 'next/server';

// Mapping from a trading pair to a symbol that Coindesk might recognize
const PAIR_TO_SYMBOL: Record<string, string> = {
  'BTC/USDT': 'BTC',
  'ETH/USDT': 'ETH',
  // Add other mappings as necessary
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const instruments = searchParams.get('instruments');

  if (!instruments) {
    return NextResponse.json({ error: 'instruments query parameter is required' }, { status: 400 });
  }

  try {
    const pairs = instruments.split(',');
    
    // NOTE: The Coindesk API (api.coindesk.com) has been decommissioned.
    // This function now returns an empty array to prevent application errors.
    // Consider migrating to a different data provider like CoinGecko, which is already used elsewhere in this project.
    const results: any[] = [];

    return NextResponse.json({ data: results });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    console.error('Coindesk API route error:', errorMessage);
    return NextResponse.json({ error: 'Failed to fetch data from Coindesk API', details: errorMessage }, { status: 500 });
  }
}
