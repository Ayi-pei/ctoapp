import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { type NextRequest, NextResponse } from 'next/server';
import { Database } from '@/lib/database.types';

export const dynamic = 'force-dynamic';

// POST handler to create a new market prediction
export async function POST(request: NextRequest) {
  const response = NextResponse.next({ request });

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          response.cookies.set({ name, value, ...options });
        },
        remove(name: string, options: CookieOptions) {
          response.cookies.set({ name, value: '', ...options });
        },
      },
    }
  );

  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return new NextResponse(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }

    const { symbol, prediction } = await request.json();

    if (!symbol || !prediction || !['up', 'down'].includes(prediction)) {
      return new NextResponse(
        JSON.stringify({ error: 'Invalid input. `symbol` and `prediction` (`up` or `down`) are required.' }),
        { status: 400 }
      );
    }

    const { data, error } = await supabase.rpc('create_market_prediction', {
      p_symbol: symbol,
      p_prediction: prediction,
    });

    if (error) {
      // The function's error message is user-friendly (e.g., pending task exists)
      return new NextResponse(JSON.stringify({ error: error.message }), { status: 400 });
    }

    return NextResponse.json(data);

  } catch (e: any) {
    console.error('An unexpected error occurred in /api/market-predictions:', e);
    return new NextResponse(
      JSON.stringify({ error: '一个意外的错误发生了，请稍后再试。' }),
      { status: 500 }
    );
  }
}
