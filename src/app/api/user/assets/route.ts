
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySession, sessionCookieName } from '@/lib/auth/session';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function GET() {
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
        return NextResponse.json({ error: 'Supabase is not configured.' }, { status: 503 });
    }

    // Validate session from HttpOnly cookie
    const cookieStore = await cookies();
    const token = cookieStore.get(sessionCookieName)?.value;
    const { valid, userId } = verifySession(token);
    if (!valid || !userId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
        const { data: balances, error: balanceError } = await supabase
            .from('balances')
            .select('*')
            .eq('user_id', userId);

        if (balanceError) throw balanceError;

        const { data: investments, error: investmentError } = await supabase
            .from('investments')
            .select('*')
            .eq('user_id', userId);
        
        if (investmentError) throw investmentError;

        const formattedBalances = (balances || []).reduce((acc: any, b: any) => {
            acc[b.asset] = { available: b.available_balance, frozen: b.frozen_balance };
            return acc;
        }, {} as any);

        const assetData = {
            balances: formattedBalances,
            investments: investments || [],
        };

        return NextResponse.json(assetData);

    } catch (error) {
        console.error('API Error fetching user assets:', error);
        return NextResponse.json({ error: 'An internal server error occurred.' }, { status: 500 });
    }
}
