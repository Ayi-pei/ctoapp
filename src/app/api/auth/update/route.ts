import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcrypt';
import { verifySession, sessionCookieName } from '@/lib/auth/session';

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function POST(request: Request) {
  try {
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json({ success: false, error: 'Supabase not configured' }, { status: 503 });
    }

    // Session validation
    const cookieStore = await cookies();
    const token = cookieStore.get(sessionCookieName)?.value;
    const { valid, userId } = verifySession(token);
    if (!valid || !userId) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const updates = body?.updates;
    if (!updates || typeof updates !== 'object') {
      return NextResponse.json({ success: false, error: 'Invalid input' }, { status: 400 });
    }

    // Whitelist fields to avoid privilege escalation
    const allowedFields = ['nickname', 'email', 'avatar_url'] as const;
    const toUpdate: any = {};
    for (const key of allowedFields) {
      if (key in updates) toUpdate[key] = updates[key];
    }

    if ('password' in updates && updates.password) {
      toUpdate.password_hash = await bcrypt.hash(updates.password, 10);
    }

    if (Object.keys(toUpdate).length === 0) {
      return NextResponse.json({ success: false, error: 'No updatable fields' }, { status: 400 });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { error } = await supabase
      .from('profiles')
      .update(toUpdate)
      .eq('id', userId);

    if (error) {
      console.error('Update user error:', error);
      return NextResponse.json({ success: false, error: 'database_error' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Update API error:', error);
    return NextResponse.json({ success: false, error: 'internal_error' }, { status: 500 });
  }
}
