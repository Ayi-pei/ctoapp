import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { Database } from '@/lib/database.types';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const cookieStore = cookies();
  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          cookieStore.set({ name, value, ...options });
        },
        remove(name: string, options: CookieOptions) {
          cookieStore.delete({ name, ...options });
        },
      },
    }
  );

  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return new NextResponse(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }

    const { tier } = await request.json();

    if (!tier || typeof tier !== 'number' || ![1, 2, 3].includes(tier)) {
      return new NextResponse(
        JSON.stringify({ error: 'Invalid or missing tier. Must be 1, 2, or 3.' }),
        { status: 400 }
      );
    }

    const { data, error } = await supabase.rpc('claim_snowball_reward', { p_tier: tier });

    if (error) {
      console.error(`Error claiming snowball reward for tier ${tier}:`, error);
      // The error messages from the function are user-friendly.
      return new NextResponse(JSON.stringify({ error: error.message }), { status: 400 });
    }

    return NextResponse.json(data);

  } catch (e: any) {
    console.error('An unexpected error occurred in claim-snowball route:', e);
    return new NextResponse(
      JSON.stringify({ error: '一个意外的错误发生了，请稍后再试。' }),
      { status: 500 }
    );
  }
}
