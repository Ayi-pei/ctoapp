
import { NextResponse } from 'next/server';
import axios from 'axios';
import { z } from 'zod';

const API_KEY = process.env.ALPHA_VANTAGE_API_KEY;

const FXInputSchema = z.object({
  from: z.string(),
  to: z.string(),
});

export async function GET(request: Request) {
  if (!API_KEY) {
    return NextResponse.json({ error: 'Alpha Vantage API key is not configured.' }, { status: 500 });
  }

  const { searchParams } = new URL(request.url);
  const from = searchParams.get('from');
  const to = searchParams.get('to');
  const symbol = searchParams.get('symbol');

  try {
    let response;
    // Check if it's a Forex request
    if (from && to) {
      const fxValidation = FXInputSchema.safeParse({ from, to });
      if (!fxValidation.success) {
        return NextResponse.json({ error: 'Invalid Forex parameters.' }, { status: 400 });
      }
      response = await axios.get('https://www.alphavantage.co/query', {
        params: {
          function: 'CURRENCY_EXCHANGE_RATE',
          from_currency: from,
          to_currency: to,
          apikey: API_KEY,
        },
      });

      const data = response.data['Realtime Currency Exchange Rate'];
      if (!data) throw new Error('Invalid Forex data received from Alpha Vantage');
      
      return NextResponse.json({
        price: data['5. Exchange Rate'],
        // CURRENCY_EXCHANGE_RATE does not provide daily change, high, low
        change: 'N/A', 
        high: 'N/A',
        low: 'N/A',
      });

    } else if (symbol) {
      // It's a Commodity (Gold/Silver) request
      response = await axios.get('https://www.alphavantage.co/query', {
         params: {
            function: 'TIME_SERIES_DAILY',
            symbol: symbol,
            apikey: API_KEY,
            // market param is not standard for TIME_SERIES_DAILY
        },
      });

      const timeSeries = response.data['Time Series (Daily)'];
      if (!timeSeries) throw new Error(`No time series data for symbol: ${symbol}`);
      
      const dates = Object.keys(timeSeries);
      const latestDate = dates[0];
      const previousDate = dates[1];
      
      if (!latestDate || !previousDate) {
          throw new Error(`Insufficient historical data for symbol: ${symbol}`);
      }

      const latestData = timeSeries[latestDate];
      const previousData = timeSeries[previousDate];
      
      const price = parseFloat(latestData['4. close']);
      const prevClose = parseFloat(previousData['4. close']);
      const change = ((price - prevClose) / prevClose) * 100;

       return NextResponse.json({
        price: price,
        change: change, 
        high: latestData['2. high'],
        low: latestData['3. low'],
      });
      
    } else {
      return NextResponse.json({ error: 'Missing required parameters for Alpha Vantage request.' }, { status: 400 });
    }

  } catch (error) {
    console.error("Alpha Vantage API proxy error:", error instanceof Error ? error.message : String(error));
    return NextResponse.json({ error: 'Failed to fetch from Alpha Vantage' }, { status: 502 });
  }
}
