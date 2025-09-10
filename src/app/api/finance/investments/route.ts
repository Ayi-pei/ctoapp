import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import type { Database } from '@/lib/database.types';

export const dynamic = 'force-dynamic';

// New, more secure POST function for creating investments
export async function POST(request: Request) {
  const cookieStore = await cookies();
  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach((cookie) => cookieStore.set(cookie));
          } catch (error) {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    }
  );

  try {
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      return new NextResponse(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const { productId, amount } = await request.json();

    // Input validation
    if (!productId || typeof productId !== 'string' || !/^[0-9a-fA-F-]{36}$/.test(productId)) {
      return new NextResponse(JSON.stringify({ error: 'Invalid or missing product ID' }), { status: 400 });
    }
    if (!amount || typeof amount !== 'number' || amount <= 0) {
      return new NextResponse(JSON.stringify({ error: 'Invalid or missing amount' }), { status: 400 });
    }

    // Call the secure RPC function in the database
    const { data, error } = await supabase.rpc('create_investment', {
      p_product_id: productId,
      p_amount: amount,
    });

    if (error) {
      console.error('Error creating investment:', error);
      // Provide a more user-friendly error message
      const message = error.message.includes('is below minimum') ? '投资金额低于最小限额。'
                    : error.message.includes('is above maximum') ? '投资金额高于最大限额。'
                    : error.message.includes('Insufficient wallet balance') ? '钱包余额不足。'
                    : '创建投资失败，请稍后再试。';
      return new NextResponse(
        JSON.stringify({ error: message }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return NextResponse.json({ success: true, investment_id: data });

  } catch (e: any) {
    console.error('An unexpected error occurred:', e);
    return new NextResponse(
      JSON.stringify({ error: 'An unexpected error occurred' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

// GET function for fetching investment history
export async function GET(request: Request) {
    const cookieStore = await cookies();
    const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach((cookie) => cookieStore.set(cookie));
          } catch (error) {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    }
  );

    try {
        const { data: { session } } = await supabase.auth.getSession();

        if (!session) {
            return new NextResponse(
                JSON.stringify({ error: 'Unauthorized' }),
                { status: 401, headers: { 'Content-Type': 'application/json' } }
            );
        }

        const { data, error } = await supabase
            .from('investments')
            .select('*, investment_products(name, description)')
            .eq('user_id', session.user.id)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching investments:', error);
            return new NextResponse(
                JSON.stringify({ error: 'Failed to fetch investments' }),
                { status: 500, headers: { 'Content-Type': 'application/json' } }
            );
        }

        return NextResponse.json(data);

    } catch (e: any) {
        console.error('An unexpected error occurred while fetching investments:', e);
        return new NextResponse(
            JSON.stringify({ error: 'An unexpected error occurred' }),
            { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
    }
}
