
import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { isSupabaseEnabled, supabase } from '@/lib/supabaseClient';

export async function GET(request: Request) {
    
    if (!isSupabaseEnabled) {
        return NextResponse.json({ error: 'Supabase is not configured.' }, { status: 503 });
    }

    const authHeader = headers().get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return NextResponse.json({ error: 'Unauthorized: Missing token.' }, { status: 401 });
    }
    
    const jwt = authHeader.split(' ')[1];
    const { data: { user }, error: userError } = await supabase.auth.getUser(jwt);

    if (userError || !user) {
        return NextResponse.json({ error: 'Unauthorized: Invalid token.' }, { status: 401 });
    }

    try {
        const { data: balances, error: balanceError } = await supabase
            .from('balances')
            .select('*')
            .eq('user_id', user.id);

        if (balanceError) throw balanceError;

        const { data: investments, error: investmentError } = await supabase
            .from('investments')
            .select('*')
            .eq('user_id', user.id);
        
        if (investmentError) throw investmentError;

        const formattedBalances = balances.reduce((acc, b) => {
            acc[b.asset] = { available: b.available_balance, frozen: b.frozen_balance };
            return acc;
        }, {} as any);

        const assetData = {
            balances: formattedBalances,
            investments: investments,
        };

        return NextResponse.json(assetData);

    } catch (error) {
        console.error('API Error fetching user assets:', error);
        return NextResponse.json({ error: 'An internal server error occurred.' }, { status: 500 });
    }
}
