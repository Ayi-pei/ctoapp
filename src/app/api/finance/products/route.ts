import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { type NextRequest, NextResponse } from 'next/server';
import { Database, Json } from '@/lib/database.types';

export const dynamic = 'force-dynamic';

// Explicitly define the type for the product we are fetching.
// This ensures type safety and provides clear context for the TypeScript compiler.
type Product = {
  id: string;
  name: string;
  description: string | null;
  period: number;
  profit_rate: number;
  is_active: boolean;
  created_at: string;
  hourly_tiers: Json | null; // Match the type from database.types.ts
};

export async function GET(request: NextRequest) {
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

    // Fetch data and explicitly cast it to our defined Product type array.
    const { data, error } = await supabase
      .from('investment_products')
      .select('id, name, description, period, profit_rate, is_active, created_at, hourly_tiers')
      .eq('is_active', true)
      .order('period', { ascending: true });

    const products: Product[] | null = data as Product[] | null;

    if (error) {
      console.error('Error fetching investment products:', error);
      return new NextResponse(JSON.stringify({ error: 'Failed to fetch investment products' }), { status: 500 });
    }

    if (!products) {
        return NextResponse.json([]);
    }

    // Process the products with clear type information.
    const parsedProducts = products.map((product: Product) => {
        const { hourly_tiers, ...rest } = product;
        let finalHourlyTiers: Json = [];

        if (hourly_tiers) {
            if (typeof hourly_tiers === 'string') {
                try {
                    finalHourlyTiers = JSON.parse(hourly_tiers);
                } catch (e) {
                    console.error(`Failed to parse hourly_tiers string for product ${product.id}:`, e);
                }
            } else if (typeof hourly_tiers === 'object') {
                finalHourlyTiers = hourly_tiers;
            }
        }

        return {
            ...rest,
            hourlyTiers: finalHourlyTiers
        };
    });

    return NextResponse.json(parsedProducts);

  } catch (e: any) {
    console.error('An unexpected error occurred while fetching products:', e);
    return new NextResponse(JSON.stringify({ error: 'An unexpected error occurred' }), { status: 500 });
  }
}
